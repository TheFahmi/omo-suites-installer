import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { existsSync, readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import { heading, success, fail, warn, info, icons, handleError, createTable, successBox, infoBox, warnBox } from '../utils/ui.ts';

// ─── Directories to skip ────────────────────────────────────────────
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '__pycache__',
  '.cache', '.turbo', '.vercel', '.nuxt', '.output', 'coverage',
  '.nyc_output', '.parcel-cache', '.svelte-kit', 'vendor', '.vendor',
  '.venv', 'venv', 'env', '.env', '__snapshots__', '.terraform',
  '.idea', '.vscode', 'target', 'out', '.gradle', '.maven',
  'bower_components',
]);

// ─── File extensions to scan ────────────────────────────────────────
const SCAN_EXTENSIONS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs',
  'py', 'rb', 'go', 'rs', 'java', 'kt', 'swift', 'cs',
  'cpp', 'c', 'h', 'hpp',
  'vue', 'svelte',
  'php',
]);

// ─── Comment patterns to detect ─────────────────────────────────────
interface CommentPattern {
  id: string;
  name: string;
  severity: 'high' | 'medium' | 'low';
  pattern: RegExp;
  description: string;
  fixable: boolean;
}

const PATTERNS: CommentPattern[] = [
  // Obvious/redundant comments
  {
    id: 'obvious-comment',
    name: 'Obvious comment',
    severity: 'medium',
    pattern: /^\s*\/\/\s*(?:This (?:function|method|class|variable|constant|hook|component) (?:does|is|will|handles|returns|creates|gets|sets|checks|validates|processes|renders|displays))/i,
    description: 'Comment restates what the code already says',
    fixable: true,
  },
  {
    id: 'obvious-comment-hash',
    name: 'Obvious comment (Python/Ruby)',
    severity: 'medium',
    pattern: /^\s*#\s*(?:This (?:function|method|class|variable|constant) (?:does|is|will|handles|returns|creates|gets|sets|checks|validates|processes))/i,
    description: 'Comment restates what the code already says',
    fixable: true,
  },

  // Vague TODOs
  {
    id: 'vague-todo',
    name: 'Vague TODO',
    severity: 'medium',
    pattern: /^\s*\/\/\s*TODO:?\s*(?:implement|fix|add|update|refactor|clean ?up|do this|finish|complete|handle|change)?\.?\s*$/i,
    description: 'TODO without detail — what needs to be done?',
    fixable: false,
  },
  {
    id: 'vague-todo-hash',
    name: 'Vague TODO (Python/Ruby)',
    severity: 'medium',
    pattern: /^\s*#\s*TODO:?\s*(?:implement|fix|add|update|refactor|clean ?up|do this|finish|complete|handle|change)?\.?\s*$/i,
    description: 'TODO without detail — what needs to be done?',
    fixable: false,
  },

  // AI attribution
  {
    id: 'ai-attribution',
    name: 'AI attribution comment',
    severity: 'high',
    pattern: /^\s*(?:\/\/|#|\/\*)\s*(?:Added|Generated|Created|Written|Modified|Updated|Suggested|Produced)\s*(?:by|via|using|with)\s*(?:AI|ChatGPT|Claude|Copilot|GPT|LLM|Cursor|Codeium|Gemini|OpenAI|Anthropic)/i,
    description: 'AI-generated attribution — remove these',
    fixable: true,
  },

  // Eslint-disable without explanation
  {
    id: 'eslint-disable-no-reason',
    name: 'Unexplained eslint-disable',
    severity: 'high',
    pattern: /^\s*\/\/\s*eslint-disable(?:-next-line)?(?:\s+[\w\/@-]+(?:,\s*[\w\/@-]+)*)?\s*$/,
    description: 'eslint-disable without explanation — add a reason',
    fixable: false,
  },

  // ts-ignore without explanation
  {
    id: 'ts-ignore-no-reason',
    name: 'Unexplained @ts-ignore',
    severity: 'high',
    pattern: /^\s*\/\/\s*@ts-ignore\s*$/,
    description: '@ts-ignore without explanation — use @ts-expect-error with reason instead',
    fixable: false,
  },

  // Commented-out code blocks (heuristic: lines starting with // followed by code-like patterns)
  {
    id: 'commented-code',
    name: 'Commented-out code',
    severity: 'low',
    pattern: /^\s*\/\/\s*(?:const|let|var|function|class|import|export|if|else|for|while|return|switch|case|try|catch|async|await)\s/,
    description: 'Appears to be commented-out code — remove or use version control',
    fixable: true,
  },

  // Overly verbose JSDoc that restates function name
  {
    id: 'jsdoc-restate',
    name: 'JSDoc restates name',
    severity: 'low',
    pattern: /^\s*\*\s*(?:Function|Method|Class)\s+(?:that|which|to)\s/i,
    description: 'JSDoc description just restates the function/method name',
    fixable: false,
  },

  // Auto-generated section markers
  {
    id: 'auto-section-marker',
    name: 'Auto-generated section marker',
    severity: 'low',
    pattern: /^\s*\/\/\s*[-=]{10,}\s*$/,
    description: 'Section separator — consider using code organization instead',
    fixable: false,
  },

  // "self-documenting" comments that add no value
  {
    id: 'no-value-comment',
    name: 'No-value comment',
    severity: 'medium',
    pattern: /^\s*\/\/\s*(?:set|get|update|create|delete|remove|add|initialize|init|start|stop|open|close|read|write|send|receive|handle|process|check|validate|render|display)\s+(?:the\s+)?[\w]+\s*$/i,
    description: 'Comment just restates the method call — adds no value',
    fixable: true,
  },
];

interface Finding {
  file: string;
  line: number;
  content: string;
  pattern: CommentPattern;
}

function scanFile(filePath: string, rootDir: string): Finding[] {
  const findings: Finding[] = [];

  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const pattern of PATTERNS) {
        if (pattern.pattern.test(line)) {
          findings.push({
            file: relative(rootDir, filePath),
            line: i + 1,
            content: line.trim(),
            pattern,
          });
          break; // Only report first matching pattern per line
        }
      }
    }
  } catch {
    // Skip files that can't be read
  }

  return findings;
}

function walkDir(dirPath: string, rootDir: string): Finding[] {
  const findings: Finding[] = [];

  try {
    const entries = readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      if (SKIP_DIRS.has(entry.name)) continue;

      const fullPath = join(dirPath, entry.name);

      if (entry.isDirectory()) {
        findings.push(...walkDir(fullPath, rootDir));
      } else if (entry.isFile()) {
        const ext = entry.name.split('.').pop()?.toLowerCase() || '';
        if (SCAN_EXTENSIONS.has(ext)) {
          findings.push(...scanFile(fullPath, rootDir));
        }
      }
    }
  } catch {
    // Skip directories that can't be read
  }

  return findings;
}

function fixFile(filePath: string, findings: Finding[]): number {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const linesToRemove = new Set(findings.filter(f => f.pattern.fixable).map(f => f.line - 1));

    if (linesToRemove.size === 0) return 0;

    const newLines = lines.filter((_, i) => !linesToRemove.has(i));
    writeFileSync(filePath, newLines.join('\n'));

    return linesToRemove.size;
  } catch {
    return 0;
  }
}

export function registerCheckCommand(program: Command): void {
  program
    .command('check')
    .description('Scan source files for AI-generated comment patterns and low-quality comments')
    .option('-p, --path <dir>', 'Directory to scan (default: current directory)')
    .option('--fix', 'Remove fixable AI slop comments')
    .option('--severity <level>', 'Minimum severity to report: low, medium, high', 'low')
    .action(async (options: { path?: string; fix?: boolean; severity?: string }) => {
      try {
        const scanDir = options.path ? join(process.cwd(), options.path) : process.cwd();
        const minSeverity = options.severity || 'low';
        const doFix = options.fix || false;

        if (!existsSync(scanDir)) {
          fail(`Directory not found: ${scanDir}`);
          return;
        }

        heading('🔍 Comment Quality Checker');
        info(`Scanning: ${chalk.bold(scanDir)}`);
        info(`Min severity: ${chalk.bold(minSeverity)}`);
        if (doFix) {
          warn('FIX MODE — fixable comments will be removed');
        }
        console.log('');

        const spinner = ora('Scanning source files...').start();

        const allFindings = walkDir(scanDir, scanDir);

        // Filter by severity
        const severityOrder: Record<string, number> = { low: 0, medium: 1, high: 2 };
        const minLevel = severityOrder[minSeverity] || 0;
        const findings = allFindings.filter(f => severityOrder[f.pattern.severity] >= minLevel);

        spinner.succeed(`Scanned — found ${chalk.bold(String(findings.length))} issue(s)`);

        if (findings.length === 0) {
          console.log('');
          successBox('✨ Clean Code', [
            'No comment quality issues found!',
            '',
            `Scanned: ${chalk.cyan(scanDir)}`,
          ].join('\n'));
          return;
        }

        // Group by severity
        const high = findings.filter(f => f.pattern.severity === 'high');
        const medium = findings.filter(f => f.pattern.severity === 'medium');
        const low = findings.filter(f => f.pattern.severity === 'low');

        // Summary
        console.log('');
        const severityColors = {
          high: chalk.red,
          medium: chalk.yellow,
          low: chalk.gray,
        };

        if (high.length > 0) {
          heading(`🔴 High Severity (${high.length})`);
          for (const f of high.slice(0, 30)) {
            console.log(`  ${chalk.red(f.file)}:${chalk.yellow(String(f.line))} — ${f.pattern.name}`);
            console.log(`    ${chalk.gray(f.content.slice(0, 100))}`);
            console.log(`    ${chalk.dim(f.pattern.description)}`);
            console.log('');
          }
          if (high.length > 30) {
            info(`...and ${high.length - 30} more high-severity findings`);
          }
        }

        if (medium.length > 0) {
          heading(`🟡 Medium Severity (${medium.length})`);
          for (const f of medium.slice(0, 20)) {
            console.log(`  ${chalk.yellow(f.file)}:${chalk.yellow(String(f.line))} — ${f.pattern.name}`);
            console.log(`    ${chalk.gray(f.content.slice(0, 100))}`);
            console.log('');
          }
          if (medium.length > 20) {
            info(`...and ${medium.length - 20} more medium-severity findings`);
          }
        }

        if (low.length > 0) {
          heading(`⚪ Low Severity (${low.length})`);
          for (const f of low.slice(0, 10)) {
            console.log(`  ${chalk.gray(f.file)}:${chalk.yellow(String(f.line))} — ${f.pattern.name}`);
            console.log(`    ${chalk.gray(f.content.slice(0, 100))}`);
            console.log('');
          }
          if (low.length > 10) {
            info(`...and ${low.length - 10} more low-severity findings`);
          }
        }

        // Group by pattern type for summary
        const patternCounts = new Map<string, number>();
        for (const f of findings) {
          patternCounts.set(f.pattern.name, (patternCounts.get(f.pattern.name) || 0) + 1);
        }

        console.log('');
        heading('Summary by Pattern');
        const rows = Array.from(patternCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => {
            const pattern = PATTERNS.find(p => p.name === name)!;
            const sevIcon = { high: '🔴', medium: '🟡', low: '⚪' }[pattern.severity];
            return [
              `${sevIcon} ${name}`,
              count,
              pattern.fixable ? chalk.green('Yes') : chalk.gray('No'),
            ];
          });

        console.log(createTable(
          ['Pattern', 'Count', 'Auto-fixable'],
          rows,
        ));

        // Fix mode
        if (doFix) {
          console.log('');
          heading('🔧 Fixing...');

          const fixableFindings = findings.filter(f => f.pattern.fixable);
          if (fixableFindings.length === 0) {
            info('No fixable issues found.');
          } else {
            // Group by file
            const byFile = new Map<string, Finding[]>();
            for (const f of fixableFindings) {
              const fullPath = join(scanDir, f.file);
              if (!byFile.has(fullPath)) byFile.set(fullPath, []);
              byFile.get(fullPath)!.push(f);
            }

            let totalFixed = 0;
            for (const [filePath, fileFindings] of byFile) {
              const fixed = fixFile(filePath, fileFindings);
              if (fixed > 0) {
                success(`${relative(scanDir, filePath)} — removed ${fixed} comment(s)`);
                totalFixed += fixed;
              }
            }

            console.log('');
            successBox('Fix Complete', [
              `Removed ${chalk.bold(String(totalFixed))} comment(s) from ${chalk.bold(String(byFile.size))} file(s)`,
              '',
              `${chalk.gray('Run')} ${chalk.cyan('git diff')} ${chalk.gray('to review changes.')}`,
            ].join('\n'));
          }
        } else {
          const fixableCount = findings.filter(f => f.pattern.fixable).length;
          if (fixableCount > 0) {
            console.log('');
            info(`${chalk.bold(String(fixableCount))} issues are auto-fixable. Run with ${chalk.cyan('--fix')} to remove them.`);
          }
        }
      } catch (error) {
        handleError(error);
      }
    });
}
