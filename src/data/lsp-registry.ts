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
  python: {
    name: 'Python (Pyright)',
    command: 'pyright',
    args: ['--stdio'],
    install: 'pip install pyright',
    detect: ['pyproject.toml', 'requirements.txt', 'setup.py'],
    description: 'Python type checker and language server',
  },
  go: {
    name: 'Go (gopls)',
    command: 'gopls',
    args: [],
    install: 'go install golang.org/x/tools/gopls@latest',
    detect: ['go.mod'],
    description: 'Go language server',
  },
  rust: {
    name: 'Rust (rust-analyzer)',
    command: 'rust-analyzer',
    args: [],
    install: 'rustup component add rust-analyzer',
    detect: ['Cargo.toml'],
    description: 'Rust language server',
  },
  yaml: {
    name: 'YAML',
    command: 'yaml-language-server',
    args: ['--stdio'],
    install: 'npm install -g yaml-language-server',
    detect: ['*.yml', '*.yaml', 'docker-compose.yml'],
    description: 'YAML language server with schema support',
  },
  dockerfile: {
    name: 'Dockerfile',
    command: 'docker-langserver',
    args: ['--stdio'],
    install: 'npm install -g dockerfile-language-server-nodejs',
    detect: ['Dockerfile', 'docker-compose.yml'],
    description: 'Dockerfile language server',
  },
  sql: {
    name: 'SQL',
    command: 'sql-language-server',
    args: ['up', '--method', 'stdio'],
    install: 'npm install -g sql-language-server',
    detect: ['*.sql'],
    description: 'SQL language server',
  },
  css: {
    name: 'CSS',
    command: 'css-languageserver',
    args: ['--stdio'],
    install: 'npm install -g vscode-css-languageserver-bin',
    detect: ['*.css', '*.scss'],
    description: 'CSS/SCSS/LESS language server',
  },
};

export function getLspServer(key: string): LspServer | undefined {
  return lspServers[key];
}

export function listLspKeys(): string[] {
  return Object.keys(lspServers);
}
