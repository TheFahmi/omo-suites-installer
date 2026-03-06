export interface LspServer {
  name: string;
  command: string;
  args: string[];
  install: string;
  detect: string[];
  description: string;
}

export const lspServers: Record<string, LspServer> = {
  typescript: {
    name: 'TypeScript',
    command: 'typescript-language-server',
    args: ['--stdio'],
    install: 'npm install -g typescript-language-server typescript',
    detect: ['package.json', 'tsconfig.json'],
    description: 'TypeScript/JavaScript language server',
  },
  tailwindcss: {
    name: 'Tailwind CSS',
    command: '@tailwindcss/language-server',
    args: ['--stdio'],
    install: 'npm install -g @tailwindcss/language-server',
    detect: ['tailwind.config.js', 'tailwind.config.ts', 'tailwind.config.cjs'],
    description: 'Tailwind CSS IntelliSense language server',
  },
  eslint: {
    name: 'ESLint',
    command: 'vscode-eslint-language-server',
    args: ['--stdio'],
    install: 'npm install -g vscode-langservers-extracted',
    detect: ['.eslintrc', '.eslintrc.js', '.eslintrc.json', 'eslint.config.js'],
    description: 'ESLint language server for linting and fixing',
  },
  css: {
    name: 'CSS',
    command: 'vscode-css-languageserver',
    args: ['--stdio'],
    install: 'npm install -g vscode-langservers-extracted',
    detect: ['*.css', '*.scss', '*.less'],
    description: 'CSS/SCSS/LESS language server',
  },
  html: {
    name: 'HTML',
    command: 'vscode-html-languageserver',
    args: ['--stdio'],
    install: 'npm install -g vscode-langservers-extracted',
    detect: ['*.html', '*.htm'],
    description: 'HTML language server',
  },
  json: {
    name: 'JSON',
    command: 'vscode-json-languageserver',
    args: ['--stdio'],
    install: 'npm install -g vscode-langservers-extracted',
    detect: ['*.json', 'tsconfig.json', 'package.json'],
    description: 'JSON language server with schema support',
  },
  yaml: {
    name: 'YAML',
    command: 'yaml-language-server',
    args: ['--stdio'],
    install: 'npm install -g yaml-language-server',
    detect: ['*.yml', '*.yaml', 'docker-compose.yml'],
    description: 'YAML language server with schema support',
  },
  prisma: {
    name: 'Prisma',
    command: 'prisma-language-server',
    args: ['--stdio'],
    install: 'npm install -g @prisma/language-server',
    detect: ['prisma/schema.prisma', 'schema.prisma'],
    description: 'Prisma schema language server',
  },
  sql: {
    name: 'SQL',
    command: 'sql-language-server',
    args: ['up', '--method', 'stdio'],
    install: 'npm install -g sql-language-server',
    detect: ['*.sql'],
    description: 'SQL language server',
  },
  markdown: {
    name: 'Markdown',
    command: 'marksman',
    args: ['server'],
    install: 'brew install marksman || snap install marksman',
    detect: ['*.md', 'README.md'],
    description: 'Markdown language server (Marksman)',
  },
};

export function getLspServer(key: string): LspServer | undefined {
  return lspServers[key];
}

export function listLspKeys(): string[] {
  return Object.keys(lspServers);
}
