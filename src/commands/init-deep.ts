import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { existsSync, readdirSync, statSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, basename, relative } from 'path';
import { heading, success, fail, warn, info, icons, handleError, successBox, infoBox } from '../utils/ui.ts';
import { detectStack } from '../utils/detect.ts';

// ─── Directories to always skip ─────────────────────────────────────
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '__pycache__',
  '.cache', '.turbo', '.vercel', '.nuxt', '.output', 'coverage',
  '.nyc_output', '.parcel-cache', '.svelte-kit', 'vendor', '.vendor',
  '.venv', 'venv', 'env', '.env', '__snapshots__', '.terraform',
  '.idea', '.vscode', '.DS_Store', 'target', 'out', '.gradle',
  '.maven', 'bower_components',
]);

// ─── Significant directories that get AGENTS.md ─────────────────────
const SIGNIFICANT_DIRS = new Set([
  'src', 'lib', 'utils', 'helpers', 'components', 'pages', 'app',
  'api', 'routes', 'controllers', 'services', 'models', 'entities',
  'middleware', 'hooks', 'stores', 'store', 'actions', 'reducers',
  'types', 'interfaces', 'config', 'configs', 'core', 'common',
  'shared', 'modules', 'features', 'layouts', 'views', 'screens',
  'assets', 'styles', 'public', 'static', 'scripts', 'tools',
  'test', 'tests', '__tests__', 'spec', 'specs', 'e2e', 'fixtures',
  'mocks', 'stubs', 'data', 'db', 'database', 'migrations',
  'seeds', 'seeders', 'plugins', 'extensions', 'providers',
  'guards', 'interceptors', 'decorators', 'pipes', 'filters',
  'resolvers', 'schemas', 'graphql', 'proto', 'docs', 'commands',
  'cli', 'bin', 'packages', 'apps', 'workers', 'jobs', 'tasks',
  'queues', 'events', 'listeners', 'subscribers', 'adapters',
  'repositories', 'gateways', 'presenters', 'validators',
]);

// ─── Directory purpose inference ────────────────────────────────────
const DIR_PURPOSES: Record<string, string> = {
  src: 'Main source code directory',
  lib: 'Library/utility code — shared modules',
  utils: 'Utility functions and helpers',
  helpers: 'Helper functions and shared utilities',
  components: 'UI components (React/Vue/Svelte/etc.)',
  pages: 'Page-level components or route handlers',
  app: 'Application entry point and core setup',
  api: 'API route handlers and endpoints',
  routes: 'Route definitions and handlers',
  controllers: 'Request controllers (MVC pattern)',
  services: 'Business logic and service layer',
  models: 'Data models and domain entities',
  entities: 'Database entities (ORM)',
  middleware: 'Request/response middleware',
  hooks: 'Custom hooks (React/Vue)',
  stores: 'State management stores',
  store: 'State management store',
  types: 'TypeScript type definitions',
  interfaces: 'Interface definitions',
  config: 'Configuration files and constants',
  configs: 'Configuration files and constants',
  core: 'Core application logic and base classes',
  common: 'Shared code used across modules',
  shared: 'Shared code used across modules',
  modules: 'Feature modules (modular architecture)',
  features: 'Feature-based code organization',
  layouts: 'Layout components and templates',
  views: 'View components or templates',
  screens: 'Screen-level components (mobile)',
  assets: 'Static assets (images, fonts, etc.)',
  styles: 'Stylesheets and CSS/SCSS files',
  public: 'Public/static files served directly',
  static: 'Static files served directly',
  scripts: 'Build/deploy/utility scripts',
  tools: 'Development tools and utilities',
  test: 'Test files',
  tests: 'Test files',
  __tests__: 'Test files (Jest convention)',
  spec: 'Test specifications',
  e2e: 'End-to-end tests',
  fixtures: 'Test fixtures and sample data',
  mocks: 'Mock implementations for testing',
  data: 'Data files, constants, and static data',
  db: 'Database configuration and setup',
  database: 'Database layer',
  migrations: 'Database migrations',
  seeds: 'Database seed data',
  plugins: 'Plugin/extension system',
  extensions: 'Extension modules',
  providers: 'Dependency injection providers',
  guards: 'Route/auth guards (NestJS/Angular)',
  interceptors: 'Request/response interceptors',
  decorators: 'Custom decorators',
  pipes: 'Data transformation pipes',
  filters: 'Exception/data filters',
  resolvers: 'GraphQL resolvers or dependency resolvers',
  schemas: 'Schema definitions (DB/GraphQL/validation)',
  graphql: 'GraphQL schema and resolvers',
  docs: 'Documentation files',
  commands: 'CLI command implementations',
  cli: 'CLI entry points and tooling',
  bin: 'Executable scripts and binaries',
  packages: 'Monorepo packages',
  apps: 'Monorepo applications',
  workers: 'Background workers and job processors',
  jobs: 'Scheduled/background jobs',
  tasks: 'Task definitions and runners',
  queues: 'Message queue handlers',
  events: 'Event definitions and emitters',
  listeners: 'Event listeners/subscribers',
  subscribers: 'Event subscribers (TypeORM/NestJS)',
  adapters: 'Adapter pattern implementations',
  repositories: 'Data access repositories',
  gateways: 'WebSocket/API gateways',
  validators: 'Input validation logic',
};

// ─── File extension to tech mapping ─────────────────────────────────
const EXT_TECH: Record<string, string> = {
  ts: 'TypeScript', tsx: 'TypeScript (React)', js: 'JavaScript', jsx: 'JavaScript (React)',
  py: 'Python', rb: 'Ruby', go: 'Go', rs: 'Rust', java: 'Java', kt: 'Kotlin',
  swift: 'Swift', cs: 'C#', cpp: 'C++', c: 'C', php: 'PHP',
  vue: 'Vue.js', svelte: 'Svelte', astro: 'Astro',
  css: 'CSS', scss: 'SCSS', less: 'Less', sass: 'Sass',
  html: 'HTML', ejs: 'EJS', hbs: 'Handlebars', pug: 'Pug',
  json: 'JSON', yaml: 'YAML', yml: 'YAML', toml: 'TOML',
  sql: 'SQL', graphql: 'GraphQL', gql: 'GraphQL',
  md: 'Markdown', mdx: 'MDX',
  sh: 'Shell', bash: 'Bash', zsh: 'Zsh', fish: 'Fish',
  dockerfile: 'Docker', proto: 'Protocol Buffers',
};

interface DirInfo {
  path: string;
  name: string;
  files: string[];
  subdirs: string[];
  fileExtensions: Map<string, number>;
  totalFiles: number;
  depth: number;
}

interface GeneratedFile {
  path: string;
  content: string;
}

function scanDir(dirPath: string, currentDepth: number, maxDepth: number): DirInfo | null {
  if (currentDepth > maxDepth) return null;

  try {
    const entries = readdirSync(dirPath, { withFileTypes: true });
    const files: string[] = [];
    const subdirs: string[] = [];
    const extensions = new Map<string, number>();
    let totalFiles = 0;

    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue;
      if (entry.name.startsWith('.') && entry.name !== '.env.example') continue;

      if (entry.isDirectory()) {
        subdirs.push(entry.name);
      } else if (entry.isFile()) {
        files.push(entry.name);
        totalFiles++;
        const ext = entry.name.split('.').pop()?.toLowerCase() || '';
        if (ext) {
          extensions.set(ext, (extensions.get(ext) || 0) + 1);
        }
      }
    }

    return {
      path: dirPath,
      name: basename(dirPath),
      files,
      subdirs,
      fileExtensions: extensions,
      totalFiles,
      depth: currentDepth,
    };
  } catch {
    return null;
  }
}

function inferPurpose(dirName: string, info: DirInfo): string {
  const known = DIR_PURPOSES[dirName.toLowerCase()];
  if (known) return known;

  // Infer from file types
  const exts = Array.from(info.fileExtensions.keys());
  if (exts.some(e => ['test', 'spec'].some(t => info.files.some(f => f.includes(t))))) {
    return 'Test files and test utilities';
  }
  if (exts.every(e => ['css', 'scss', 'less', 'sass'].includes(e))) {
    return 'Stylesheets and visual design';
  }
  if (exts.every(e => ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(e))) {
    return 'Image assets';
  }
  if (exts.every(e => ['md', 'mdx', 'txt', 'rst'].includes(e))) {
    return 'Documentation';
  }
  if (exts.every(e => ['json', 'yaml', 'yml', 'toml'].includes(e))) {
    return 'Configuration and data files';
  }

  return `Contains ${info.totalFiles} file(s)`;
}

function detectTechStack(info: DirInfo): string[] {
  const techs = new Set<string>();
  for (const [ext, count] of info.fileExtensions) {
    const tech = EXT_TECH[ext];
    if (tech) techs.add(tech);
  }
  return Array.from(techs);
}

function detectNamingConventions(files: string[]): string[] {
  const conventions: string[] = [];
  const codeFiles = files.filter(f => !f.startsWith('.') && f.includes('.'));

  if (codeFiles.length === 0) return conventions;

  // Check naming patterns
  const kebab = codeFiles.filter(f => /^[a-z][a-z0-9]*(-[a-z0-9]+)*\.[a-z]+$/.test(f));
  const camel = codeFiles.filter(f => /^[a-z][a-zA-Z0-9]*\.[a-z]+$/.test(f));
  const pascal = codeFiles.filter(f => /^[A-Z][a-zA-Z0-9]*\.[a-z]+$/.test(f));
  const snake = codeFiles.filter(f => /^[a-z][a-z0-9]*(_[a-z0-9]+)*\.[a-z]+$/.test(f));

  const total = codeFiles.length;
  if (kebab.length > total * 0.5) conventions.push('kebab-case file naming');
  else if (pascal.length > total * 0.5) conventions.push('PascalCase file naming');
  else if (camel.length > total * 0.5) conventions.push('camelCase file naming');
  else if (snake.length > total * 0.5) conventions.push('snake_case file naming');

  // Check for common patterns
  if (codeFiles.some(f => f.includes('.test.') || f.includes('.spec.'))) {
    conventions.push('Co-located test files');
  }
  if (codeFiles.some(f => f.includes('.module.'))) {
    conventions.push('Module pattern (NestJS-style)');
  }
  if (codeFiles.some(f => f.includes('.component.'))) {
    conventions.push('Component pattern (Angular-style)');
  }
  if (codeFiles.some(f => f.startsWith('index.'))) {
    conventions.push('Barrel exports (index files)');
  }
  if (codeFiles.some(f => f.startsWith('use') && (f.endsWith('.ts') || f.endsWith('.tsx')))) {
    conventions.push('Custom hooks (use* prefix)');
  }
  if (codeFiles.some(f => f.endsWith('.dto.ts'))) {
    conventions.push('DTO pattern');
  }

  return conventions;
}

function getFileDescription(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '');
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  if (fileName === 'index.ts' || fileName === 'index.js') return 'Module barrel export / entry point';
  if (fileName === 'index.tsx' || fileName === 'index.jsx') return 'Component entry point';
  if (fileName === 'package.json') return 'Package configuration and dependencies';
  if (fileName === 'tsconfig.json') return 'TypeScript compiler configuration';
  if (fileName === '.env.example') return 'Environment variable template';
  if (fileName === 'README.md') return 'Module documentation';
  if (fileName.endsWith('.test.ts') || fileName.endsWith('.spec.ts')) return `Tests for ${base.replace(/\.(test|spec)$/, '')}`;
  if (fileName.endsWith('.test.tsx') || fileName.endsWith('.spec.tsx')) return `Tests for ${base.replace(/\.(test|spec)$/, '')} component`;
  if (fileName.endsWith('.module.ts')) return `${base.replace('.module', '')} NestJS module`;
  if (fileName.endsWith('.controller.ts')) return `${base.replace('.controller', '')} request handler`;
  if (fileName.endsWith('.service.ts')) return `${base.replace('.service', '')} business logic`;
  if (fileName.endsWith('.entity.ts')) return `${base.replace('.entity', '')} database entity`;
  if (fileName.endsWith('.dto.ts')) return `${base.replace('.dto', '')} data transfer object`;
  if (fileName.endsWith('.guard.ts')) return `${base.replace('.guard', '')} auth/access guard`;
  if (fileName.endsWith('.pipe.ts')) return `${base.replace('.pipe', '')} validation pipe`;
  if (fileName.endsWith('.d.ts')) return 'Type declarations';

  // Infer from common names
  const lowerBase = base.toLowerCase();
  if (lowerBase.includes('config')) return 'Configuration';
  if (lowerBase.includes('util') || lowerBase.includes('helper')) return 'Utility functions';
  if (lowerBase.includes('constant') || lowerBase.includes('const')) return 'Constants and static values';
  if (lowerBase.includes('type') || lowerBase.includes('interface')) return 'Type definitions';
  if (lowerBase.includes('middleware')) return 'Middleware handler';
  if (lowerBase.includes('schema')) return 'Schema definition';
  if (lowerBase.includes('migration')) return 'Database migration';
  if (lowerBase.includes('seed')) return 'Database seed data';

  return `${EXT_TECH[ext] || ext.toUpperCase()} file`;
}

function generateFolderAgentsMd(info: DirInfo, rootPath: string): string {
  const relPath = relative(rootPath, info.path) || '.';
  const purpose = inferPurpose(info.name, info);
  const techs = detectTechStack(info);
  const conventions = detectNamingConventions(info.files);

  const lines: string[] = [];
  lines.push(`# ${info.name}/`);
  lines.push('');
  lines.push(`## Purpose`);
  lines.push(purpose);
  lines.push('');

  // Key files
  if (info.files.length > 0) {
    lines.push('## Key Files');
    const maxFiles = 20;
    const filesToShow = info.files.slice(0, maxFiles);
    for (const file of filesToShow) {
      lines.push(`- **${file}** — ${getFileDescription(file)}`);
    }
    if (info.files.length > maxFiles) {
      lines.push(`- _...and ${info.files.length - maxFiles} more files_`);
    }
    lines.push('');
  }

  // Subdirectories
  if (info.subdirs.length > 0) {
    lines.push('## Subdirectories');
    for (const sub of info.subdirs) {
      const subPurpose = DIR_PURPOSES[sub.toLowerCase()] || 'Subfolder';
      lines.push(`- **${sub}/** — ${subPurpose}`);
    }
    lines.push('');
  }

  // Tech stack
  if (techs.length > 0) {
    lines.push('## Tech Stack');
    for (const tech of techs) {
      lines.push(`- ${tech}`);
    }
    lines.push('');
  }

  // Conventions
  if (conventions.length > 0) {
    lines.push('## Conventions');
    for (const conv of conventions) {
      lines.push(`- ${conv}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function generateRootAgentsMd(rootPath: string, allDirs: DirInfo[]): string {
  const rootInfo = allDirs.find(d => d.depth === 0);
  const stack = detectStack(rootPath);
  const projectName = basename(rootPath);

  const lines: string[] = [];
  lines.push(`# ${projectName} — Project Overview`);
  lines.push('');
  lines.push('_Auto-generated by `omocs init-deep`_');
  lines.push('');

  // Architecture summary
  lines.push('## Architecture');
  lines.push('');

  if (stack.languages.length > 0) {
    lines.push(`**Languages:** ${stack.languages.join(', ')}`);
  }
  if (stack.frameworks.length > 0) {
    lines.push(`**Frameworks:** ${stack.frameworks.join(', ')}`);
  }
  if (stack.tools.length > 0) {
    lines.push(`**Tools:** ${stack.tools.join(', ')}`);
  }
  if (stack.packageManager) {
    lines.push(`**Package Manager:** ${stack.packageManager}`);
  }
  lines.push('');

  // Directory structure
  lines.push('## Directory Structure');
  lines.push('');

  const topLevelDirs = allDirs.filter(d => d.depth === 1);
  for (const dir of topLevelDirs) {
    const purpose = inferPurpose(dir.name, dir);
    const hasAgentsMd = allDirs.some(d => d.path === dir.path);
    lines.push(`- **${dir.name}/** — ${purpose}${hasAgentsMd ? ' _(has AGENTS.md)_' : ''}`);
  }
  lines.push('');

  // Key files at root
  if (rootInfo && rootInfo.files.length > 0) {
    lines.push('## Root Files');
    const importantFiles = rootInfo.files.filter(f =>
      ['package.json', 'tsconfig.json', 'README.md', '.env.example', 'Makefile',
       'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
       'go.mod', 'Cargo.toml', 'pyproject.toml', 'requirements.txt',
       '.gitignore', '.eslintrc.json', '.prettierrc', 'vitest.config.ts',
       'jest.config.ts', 'jest.config.js', 'playwright.config.ts',
      ].includes(f) || f.endsWith('.config.ts') || f.endsWith('.config.js')
    );
    for (const file of importantFiles) {
      lines.push(`- **${file}** — ${getFileDescription(file)}`);
    }
    lines.push('');
  }

  // Stats
  const totalFiles = allDirs.reduce((sum, d) => sum + d.totalFiles, 0);
  const totalDirs = allDirs.length;
  lines.push('## Stats');
  lines.push(`- **${totalFiles}** files across **${totalDirs}** directories`);
  lines.push(`- Generated at depth ${allDirs.reduce((max, d) => Math.max(max, d.depth), 0)} levels`);
  lines.push('');

  return lines.join('\n');
}

function collectDirs(rootPath: string, maxDepth: number): DirInfo[] {
  const results: DirInfo[] = [];

  function walk(dirPath: string, depth: number): void {
    const info = scanDir(dirPath, depth, maxDepth);
    if (!info) return;

    // Always include root (depth 0)
    // For deeper levels, only include significant directories
    if (depth === 0 || SIGNIFICANT_DIRS.has(info.name.toLowerCase()) || info.totalFiles > 0) {
      results.push(info);
    }

    if (depth < maxDepth) {
      for (const sub of info.subdirs) {
        if (!SKIP_DIRS.has(sub)) {
          walk(join(dirPath, sub), depth + 1);
        }
      }
    }
  }

  walk(rootPath, 0);
  return results;
}

export function registerInitDeepCommand(program: Command): void {
  program
    .command('init-deep')
    .description('Auto-generate hierarchical AGENTS.md files per significant folder')
    .argument('[path]', 'Project root directory', '.')
    .option('-d, --depth <n>', 'Maximum directory depth to scan', '3')
    .option('--dry-run', 'Preview what would be generated without writing files')
    .action(async (targetPath: string, options: { depth?: string; dryRun?: boolean }) => {
      try {
        const rootPath = join(process.cwd(), targetPath);
        const maxDepth = parseInt(options.depth || '3', 10);
        const dryRun = options.dryRun || false;

        if (!existsSync(rootPath)) {
          fail(`Directory not found: ${rootPath}`);
          return;
        }

        heading('🏗️  Init Deep — Hierarchical AGENTS.md Generator');
        info(`Scanning: ${chalk.bold(rootPath)}`);
        info(`Max depth: ${chalk.bold(String(maxDepth))}`);
        if (dryRun) {
          warn('DRY RUN — no files will be written');
        }
        console.log('');

        const spinner = ora('Scanning directory structure...').start();

        const allDirs = collectDirs(rootPath, maxDepth);

        spinner.succeed(`Found ${chalk.bold(String(allDirs.length))} directories`);

        // Generate AGENTS.md files
        const generated: GeneratedFile[] = [];

        // Root AGENTS.md
        const rootContent = generateRootAgentsMd(rootPath, allDirs);
        generated.push({ path: join(rootPath, 'AGENTS.md'), content: rootContent });

        // Per-folder AGENTS.md (only for significant dirs with files)
        for (const dir of allDirs) {
          if (dir.depth === 0) continue; // Skip root (handled above)
          if (!SIGNIFICANT_DIRS.has(dir.name.toLowerCase())) continue;
          if (dir.totalFiles === 0 && dir.subdirs.length === 0) continue;

          const content = generateFolderAgentsMd(dir, rootPath);
          generated.push({ path: join(dir.path, 'AGENTS.md'), content });
        }

        console.log('');
        heading('Generated Files');

        for (const file of generated) {
          const relPath = relative(rootPath, file.path);
          const existed = existsSync(file.path);

          if (dryRun) {
            const status = existed ? chalk.yellow('overwrite') : chalk.green('create');
            console.log(`  ${icons.dot} ${status} ${chalk.cyan(relPath)} (${file.content.split('\n').length} lines)`);
          } else {
            const dir = join(file.path, '..');
            if (!existsSync(dir)) {
              mkdirSync(dir, { recursive: true });
            }
            writeFileSync(file.path, file.content);
            const status = existed ? chalk.yellow('updated') : chalk.green('created');
            console.log(`  ${icons.check} ${status} ${chalk.cyan(relPath)}`);
          }
        }

        console.log('');

        if (dryRun) {
          infoBox('Dry Run Summary', [
            `Would generate ${chalk.bold(String(generated.length))} AGENTS.md file(s)`,
            `Root: ${chalk.cyan(relative(rootPath, generated[0].path))}`,
            `Subdirs: ${generated.length - 1} significant folder(s)`,
            '',
            `Run without ${chalk.yellow('--dry-run')} to write files.`,
          ].join('\n'));
        } else {
          successBox('Init Deep Complete', [
            `Generated ${chalk.bold(String(generated.length))} AGENTS.md file(s)`,
            `Root: ${chalk.cyan(relative(rootPath, generated[0].path))}`,
            `Subdirs: ${generated.length - 1} significant folder(s)`,
          ].join('\n'));
        }
      } catch (error) {
        handleError(error);
      }
    });
}
