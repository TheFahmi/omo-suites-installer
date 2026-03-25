import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { createHash } from 'crypto';
import { heading, success, fail, warn, info, handleError, infoBox } from '../utils/ui.ts';

// ─── Types ───────────────────────────────────────────────────────────
interface WorkspaceIndex {
  id: string;
  path: string;
  builtAt: string;
  techStack: string[];
  fileCount: number;
  entryPoints: string[];
  keyFiles: string[];
  tree: Record<string, any>;
}

// ─── Constants ───────────────────────────────────────────────────────
const INDEX_DIR = join(homedir(), '.omocs', 'workspaces');
const IGNORED_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', 'coverage', '.opencode'];

// ─── Helpers ─────────────────────────────────────────────────────────
function getWorkspaceHash(workspacePath?: string): string {
  const cwd = workspacePath || process.cwd();
  return createHash('sha256').update(cwd).digest('hex').substring(0, 16);
}

function getIndexPath(): string {
  const hash = getWorkspaceHash();
  return join(INDEX_DIR, hash, 'index.json');
}

function ensureIndexDir(): void {
  const hash = getWorkspaceHash();
  const dir = join(INDEX_DIR, hash);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function detectTechStack(cwd: string): string[] {
  const stack = new Set<string>();
  
  if (existsSync(join(cwd, 'package.json'))) {
    stack.add('Node.js');
    try {
      const pkg = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf-8'));
      if (pkg.dependencies?.react || pkg.devDependencies?.react) stack.add('React');
      if (pkg.dependencies?.next || pkg.devDependencies?.next) stack.add('Next.js');
      if (pkg.dependencies?.express) stack.add('Express');
      if (pkg.dependencies?.vue) stack.add('Vue');
      if (pkg.dependencies?.['@nestjs/core']) stack.add('NestJS');
      if (pkg.devDependencies?.typescript) stack.add('TypeScript');
    } catch {}
  }
  
  if (existsSync(join(cwd, 'Cargo.toml'))) stack.add('Rust');
  if (existsSync(join(cwd, 'pyproject.toml')) || existsSync(join(cwd, 'requirements.txt'))) stack.add('Python');
  if (existsSync(join(cwd, 'go.mod'))) stack.add('Go');
  if (existsSync(join(cwd, 'pom.xml'))) stack.add('Java');
  if (existsSync(join(cwd, 'composer.json'))) stack.add('PHP');
  
  return Array.from(stack);
}

function findEntryPoints(cwd: string): string[] {
  const entryPoints: string[] = [];
  const candidates = [
    'src/index.ts', 'src/main.ts', 'src/app.ts', 'src/index.js',
    'index.ts', 'index.js', 'main.go', 'main.py', 'src/main.rs',
    'app.py', 'server.js', 'server.ts'
  ];
  
  for (const candidate of candidates) {
    if (existsSync(join(cwd, candidate))) {
      entryPoints.push(candidate);
    }
  }
  
  return entryPoints;
}

function findKeyFiles(cwd: string): string[] {
  const keyFiles: string[] = [];
  const candidates = [
    'README.md', 'AGENTS.md', 'CONTRIBUTING.md', 'docker-compose.yml',
    'Dockerfile', 'package.json', 'tsconfig.json', 'openclaw.json'
  ];
  
  for (const candidate of candidates) {
    if (existsSync(join(cwd, candidate))) {
      keyFiles.push(candidate);
    }
  }
  
  return keyFiles;
}

function loadGitIgnore(dir: string): string[] {
  const gitIgnorePath = join(dir, '.gitignore');
  if (existsSync(gitIgnorePath)) {
    try {
      const content = readFileSync(gitIgnorePath, 'utf-8');
      return content
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'))
        .map(l => l.replace(/\/$/, '')); // remove trailing slashes for simple matching
    } catch {
      return [];
    }
  }
  return [];
}

function buildTree(
  dir: string, 
  depth: number, 
  currentDepth: number = 0, 
  state = { count: 0 },
  parentIgnores: string[] = []
): Record<string, any> {
  if (currentDepth > depth) return { _type: 'dir', _truncated: true };
  
  const tree: Record<string, any> = { _type: 'dir' };
  const currentIgnores = [...parentIgnores, ...loadGitIgnore(dir)];
  
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (IGNORED_DIRS.includes(entry) || entry.startsWith('.')) continue;
      
      // Basic gitignore matching (exact name or wildcard if it's simple)
      const isIgnored = currentIgnores.some(pattern => {
        if (pattern === entry) return true;
        if (pattern.startsWith('*') && entry.endsWith(pattern.slice(1))) return true;
        return false;
      });
      
      if (isIgnored) continue;
      
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        tree[entry] = buildTree(fullPath, depth, currentDepth + 1, state, currentIgnores);
      } else {
        tree[entry] = { _type: 'file', size: stat.size };
        state.count++;
      }
    }
  } catch {}
  
  return tree;
}

// ─── Register Command ────────────────────────────────────────────────
export function registerIndexCommand(program: Command): void {
  const indexCmd = program
    .command('index')
    .description('Workspace index builder — scans and caches workspace metadata');

  // omocs index build
  indexCmd
    .command('build')
    .description('Build or rebuild workspace index')
    .option('-d, --depth <n>', 'Maximum depth for file tree', '4')
    .action((options) => {
      try {
        const cwd = process.cwd();
        const depth = parseInt(options.depth, 10);
        
        info(`Scanning workspace: ${chalk.gray(cwd)}`);
        
        const state = { count: 0 };
        const tree = buildTree(cwd, depth, 0, state, []);
        
        const indexData: WorkspaceIndex = {
          id: getWorkspaceHash(cwd),
          path: cwd,
          builtAt: new Date().toISOString(),
          techStack: detectTechStack(cwd),
          fileCount: state.count,
          entryPoints: findEntryPoints(cwd),
          keyFiles: findKeyFiles(cwd),
          tree
        };
        
        ensureIndexDir();
        writeFileSync(getIndexPath(), JSON.stringify(indexData, null, 2));
        
        success(`Index built successfully!`);
        info(`Files scanned: ${chalk.bold(String(state.count))} (depth: ${depth})`);
        info(`Tech stack: ${chalk.cyan(indexData.techStack.join(', ') || 'Unknown')}`);
        info(`Saved to: ${chalk.gray(getIndexPath())}`);
      } catch (error) {
        handleError(error);
      }
    });

  // omocs index show
  indexCmd
    .command('show')
    .description('Show index summary')
    .action(() => {
      try {
        const path = getIndexPath();
        if (!existsSync(path)) {
          fail(`No index found for current workspace.`);
          info(`Run ${chalk.cyan('omocs index build')} first.`);
          return;
        }
        
        const indexData: WorkspaceIndex = JSON.parse(readFileSync(path, 'utf-8'));
        
        heading(`📂 Workspace Index Summary`);
        console.log(`  ${chalk.bold('Path:')}       ${chalk.gray(indexData.path)}`);
        console.log(`  ${chalk.bold('ID:')}         ${indexData.id}`);
        console.log(`  ${chalk.bold('Built:')}      ${new Date(indexData.builtAt).toLocaleString()}`);
        console.log(`  ${chalk.bold('Files:')}      ${indexData.fileCount} (indexed)`);
        
        console.log('');
        console.log(`  ${chalk.bold('Tech Stack:')}`);
        if (indexData.techStack.length > 0) {
          console.log(`    ${chalk.cyan(indexData.techStack.join(', '))}`);
        } else {
          console.log(`    ${chalk.gray('None detected')}`);
        }
        
        console.log('');
        console.log(`  ${chalk.bold('Entry Points:')}`);
        if (indexData.entryPoints.length > 0) {
          indexData.entryPoints.forEach(e => console.log(`    ${chalk.green(e)}`));
        } else {
          console.log(`    ${chalk.gray('None detected')}`);
        }
        
        console.log('');
        console.log(`  ${chalk.bold('Key Files:')}`);
        if (indexData.keyFiles.length > 0) {
          indexData.keyFiles.forEach(f => console.log(`    ${chalk.yellow(f)}`));
        } else {
          console.log(`    ${chalk.gray('None detected')}`);
        }
      } catch (error) {
        handleError(error);
      }
    });

  // omocs index clean
  indexCmd
    .command('clean')
    .description('Delete cached index')
    .action(() => {
      try {
        const path = getIndexPath();
        if (existsSync(path)) {
          unlinkSync(path);
          success('Workspace index removed.');
        } else {
          info('No index found to clean.');
        }
      } catch (error) {
        handleError(error);
      }
    });
}
