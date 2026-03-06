import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

export interface DetectedStack {
  languages: string[];
  frameworks: string[];
  tools: string[];
  packageManager: string | null;
}

const detectors: Record<string, { files: string[]; type: 'language' | 'framework' | 'tool' }> = {
  typescript: { files: ['tsconfig.json', 'tsconfig.base.json'], type: 'language' },
  javascript: { files: ['package.json', '.eslintrc.js', '.eslintrc.json'], type: 'language' },
  python: { files: ['pyproject.toml', 'requirements.txt', 'setup.py', 'setup.cfg', 'Pipfile'], type: 'language' },
  go: { files: ['go.mod', 'go.sum'], type: 'language' },
  rust: { files: ['Cargo.toml', 'Cargo.lock'], type: 'language' },
  java: { files: ['pom.xml', 'build.gradle', 'build.gradle.kts'], type: 'language' },
  ruby: { files: ['Gemfile', 'Rakefile', '.ruby-version'], type: 'language' },
  php: { files: ['composer.json', 'artisan'], type: 'language' },

  nextjs: { files: ['next.config.js', 'next.config.ts', 'next.config.mjs'], type: 'framework' },
  react: { files: ['react', 'vite.config.ts', 'vite.config.js'], type: 'framework' },
  vue: { files: ['vue.config.js', 'nuxt.config.ts', 'nuxt.config.js'], type: 'framework' },
  nestjs: { files: ['nest-cli.json'], type: 'framework' },
  django: { files: ['manage.py'], type: 'framework' },
  fastapi: { files: ['fastapi'], type: 'framework' },
  express: { files: ['express'], type: 'framework' },

  docker: { files: ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml', '.dockerignore'], type: 'tool' },
  kubernetes: { files: ['k8s', 'kubernetes', 'helm'], type: 'tool' },
  terraform: { files: ['main.tf', 'terraform.tfvars'], type: 'tool' },
  github_actions: { files: ['.github/workflows'], type: 'tool' },
  tailwind: { files: ['tailwind.config.js', 'tailwind.config.ts'], type: 'tool' },
  prisma: { files: ['prisma/schema.prisma'], type: 'tool' },
  typeorm: { files: ['ormconfig.json', 'ormconfig.ts'], type: 'tool' },
};

function fileOrDirExists(base: string, name: string): boolean {
  const full = join(base, name);
  return existsSync(full);
}

function checkPackageJsonDeps(base: string, depName: string): boolean {
  const pkgPath = join(base, 'package.json');
  if (!existsSync(pkgPath)) return false;
  try {
    const pkg = JSON.parse(Bun.file(pkgPath).text() as unknown as string);
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    return depName in deps;
  } catch {
    return false;
  }
}

function detectPackageManager(base: string): string | null {
  if (existsSync(join(base, 'bun.lockb')) || existsSync(join(base, 'bun.lock'))) return 'bun';
  if (existsSync(join(base, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(base, 'yarn.lock'))) return 'yarn';
  if (existsSync(join(base, 'package-lock.json'))) return 'npm';
  if (existsSync(join(base, 'Pipfile.lock'))) return 'pipenv';
  if (existsSync(join(base, 'poetry.lock'))) return 'poetry';
  if (existsSync(join(base, 'Cargo.lock'))) return 'cargo';
  if (existsSync(join(base, 'go.sum'))) return 'go';
  return null;
}

export function detectStack(directory: string = process.cwd()): DetectedStack {
  const result: DetectedStack = {
    languages: [],
    frameworks: [],
    tools: [],
    packageManager: detectPackageManager(directory),
  };

  for (const [name, config] of Object.entries(detectors)) {
    const detected = config.files.some(f => fileOrDirExists(directory, f));
    if (detected) {
      switch (config.type) {
        case 'language':
          if (!result.languages.includes(name)) result.languages.push(name);
          break;
        case 'framework':
          if (!result.frameworks.includes(name)) result.frameworks.push(name);
          break;
        case 'tool':
          if (!result.tools.includes(name)) result.tools.push(name);
          break;
      }
    }
  }

  // Check file extensions in root directory
  try {
    const files = readdirSync(directory);
    const extensions = new Set<string>();
    for (const file of files) {
      const ext = file.split('.').pop()?.toLowerCase();
      if (ext) extensions.add(ext);
    }
    if (extensions.has('py') && !result.languages.includes('python')) result.languages.push('python');
    if (extensions.has('rb') && !result.languages.includes('ruby')) result.languages.push('ruby');
    if (extensions.has('php') && !result.languages.includes('php')) result.languages.push('php');
    if (extensions.has('sql') && !result.tools.includes('sql')) result.tools.push('sql');
    if ((extensions.has('yml') || extensions.has('yaml')) && !result.tools.includes('yaml')) result.tools.push('yaml');
    if ((extensions.has('css') || extensions.has('scss')) && !result.tools.includes('css')) result.tools.push('css');
  } catch {
    // ignore
  }

  return result;
}

export function suggestLSPs(stack: DetectedStack): string[] {
  const suggestions: string[] = [];
  const langToLsp: Record<string, string> = {
    typescript: 'typescript',
    javascript: 'typescript',
    python: 'python',
    go: 'go',
    rust: 'rust',
  };

  for (const lang of stack.languages) {
    if (langToLsp[lang] && !suggestions.includes(langToLsp[lang])) {
      suggestions.push(langToLsp[lang]);
    }
  }

  if (stack.tools.includes('docker') || stack.tools.includes('dockerfile')) {
    suggestions.push('dockerfile');
  }
  if (stack.tools.includes('yaml')) {
    suggestions.push('yaml');
  }
  if (stack.tools.includes('sql')) {
    suggestions.push('sql');
  }
  if (stack.tools.includes('css')) {
    suggestions.push('css');
  }

  return suggestions;
}
