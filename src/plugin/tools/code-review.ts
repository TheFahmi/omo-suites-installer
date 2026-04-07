import { tool } from "@opencode-ai/plugin/tool";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { join, relative as relPath } from "path";

export const codeReviewTools: Record<string, any> = {
  omocs_check: tool({
    description: "Scan source files for AI-generated comment patterns and low-quality comments. Detects obvious/redundant comments, vague TODOs, AI attribution, unexplained eslint-disable, and commented-out code.",
    args: {
      path: tool.schema.string().optional().describe("Directory to scan (default: current directory)"),
      severity: tool.schema.string().optional().describe("Minimum severity: low, medium, high (default: low)"),
      fix: tool.schema.boolean().optional().describe("Remove fixable AI slop comments"),
    },
    async execute(args, context) {
      const scanPath = args.path ? join(context.directory, args.path) : context.directory;
      const minSeverity = args.severity || "low";
      const doFix = args.fix || false;

      if (!existsSync(scanPath)) return `❌ Directory not found: ${scanPath}`;

      const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', '.cache', 'coverage', 'vendor']);
      const EXTS = new Set(['ts', 'tsx', 'js', 'jsx', 'mjs', 'py', 'rb', 'go', 'rs', 'java', 'php', 'vue', 'svelte']);

      interface Pattern { id: string; name: string; severity: string; regex: RegExp; fixable: boolean; }
      const patterns: Pattern[] = [
        { id: 'obvious', name: 'Obvious comment', severity: 'medium', regex: /^\s*\/\/\s*This (?:function|method|class) (?:does|is|will|handles|returns)/i, fixable: true },
        { id: 'vague-todo', name: 'Vague TODO', severity: 'medium', regex: /^\s*\/\/\s*TODO:?\s*(?:implement|fix|add)?\.?\s*$/i, fixable: false },
        { id: 'ai-attr', name: 'AI attribution', severity: 'high', regex: /^\s*(?:\/\/|#)\s*(?:Added|Generated|Created|Written)\s*(?:by|via|using)\s*(?:AI|ChatGPT|Claude|Copilot|GPT|LLM|Cursor)/i, fixable: true },
        { id: 'eslint-no-reason', name: 'Unexplained eslint-disable', severity: 'high', regex: /^\s*\/\/\s*eslint-disable(?:-next-line)?(?:\s+[\w\/@-]+)?\s*$/, fixable: false },
        { id: 'ts-ignore', name: 'Bare @ts-ignore', severity: 'high', regex: /^\s*\/\/\s*@ts-ignore\s*$/, fixable: false },
        { id: 'commented-code', name: 'Commented-out code', severity: 'low', regex: /^\s*\/\/\s*(?:const|let|var|function|class|import|export|if|return|async)\s/, fixable: true },
      ];

      const sevOrder: Record<string, number> = { low: 0, medium: 1, high: 2 };
      const minLevel = sevOrder[minSeverity] || 0;

      interface Finding { file: string; line: number; content: string; pattern: Pattern; }
      const findings: Finding[] = [];

      function walk(dir: string): void {
        try {
          for (const entry of readdirSync(dir, { withFileTypes: true })) {
            if (entry.name.startsWith('.') || SKIP.has(entry.name)) continue;
            const full = join(dir, entry.name);
            if (entry.isDirectory()) { walk(full); continue; }
            const ext = entry.name.split('.').pop()?.toLowerCase() || '';
            if (!EXTS.has(ext)) continue;
            try {
              const lines = readFileSync(full, 'utf-8').split('\n');
              for (let i = 0; i < lines.length; i++) {
                for (const p of patterns) {
                  if (sevOrder[p.severity] >= minLevel && p.regex.test(lines[i])) {
                    findings.push({ file: relPath(scanPath, full), line: i + 1, content: lines[i].trim(), pattern: p });
                    break;
                  }
                }
              }
            } catch {}
          }
        } catch {}
      }

      walk(scanPath);

      if (findings.length === 0) {
        return "✨ No comment quality issues found!";
      }

      const lines: string[] = [`# 🔍 Comment Quality Report`, "", `Found **${findings.length}** issue(s)`, ""];

      // Group by severity
      for (const sev of ['high', 'medium', 'low']) {
        const sevFindings = findings.filter(f => f.pattern.severity === sev);
        if (sevFindings.length === 0) continue;
        const icon = { high: '🔴', medium: '🟡', low: '⚪' }[sev] || '•';
        lines.push(`## ${icon} ${sev.charAt(0).toUpperCase() + sev.slice(1)} (${sevFindings.length})`);
        lines.push("");
        for (const f of sevFindings.slice(0, 20)) {
          lines.push(`- **${f.file}:${f.line}** — ${f.pattern.name}`);
          lines.push(`  \`${f.content.slice(0, 80)}\``);
        }
        if (sevFindings.length > 20) lines.push(`- ...and ${sevFindings.length - 20} more`);
        lines.push("");
      }

      // Fix
      if (doFix) {
        const fixable = findings.filter(f => f.pattern.fixable);
        if (fixable.length > 0) {
          const byFile = new Map<string, Set<number>>();
          for (const f of fixable) {
            const full = join(scanPath, f.file);
            if (!byFile.has(full)) byFile.set(full, new Set());
            byFile.get(full)!.add(f.line - 1);
          }
          let totalFixed = 0;
          for (const [filePath, lineNums] of byFile) {
            try {
              const content = readFileSync(filePath, 'utf-8').split('\n');
              const newContent = content.filter((_, i) => !lineNums.has(i));
              writeFileSync(filePath, newContent.join('\n'));
              totalFixed += lineNums.size;
            } catch {}
          }
          lines.push(`## 🔧 Fixed`);
          lines.push(`Removed ${totalFixed} fixable comment(s) from ${byFile.size} file(s).`);
        }
      } else {
        const fixableCount = findings.filter(f => f.pattern.fixable).length;
        if (fixableCount > 0) {
          lines.push(`💡 ${fixableCount} issues are auto-fixable. Run \`omocs check --fix\` to remove them.`);
        }
      }

      return lines.join("\n");
    },
  }),
};
