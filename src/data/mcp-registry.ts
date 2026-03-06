export interface McpServer {
  name: string;
  description: string;
  type: string;
  command: string;
  args: string[];
  install?: string;
  env?: Record<string, string>;
  tags: string[];
}

export const mcpServers: Record<string, McpServer> = {
  'context7': {
    name: 'Context7',
    description: 'Library documentation search — find up-to-date docs for any library',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@upstash/context7-mcp'],
    install: 'npm install -g @upstash/context7-mcp',
    tags: ['documentation', 'search', 'libraries'],
  },
  'github-search': {
    name: 'GitHub Search',
    description: 'Search GitHub repositories and code',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@anthropic/mcp-github'],
    env: { GITHUB_TOKEN: '' },
    tags: ['github', 'search', 'code'],
  },
  'filesystem': {
    name: 'Filesystem',
    description: 'File system operations — read, write, search files',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@anthropic/mcp-filesystem'],
    tags: ['filesystem', 'files', 'io'],
  },
  'brave-search': {
    name: 'Brave Search',
    description: 'Web search via Brave Search API',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@anthropic/mcp-brave-search'],
    env: { BRAVE_API_KEY: '' },
    tags: ['search', 'web', 'brave'],
  },
  'sqlite': {
    name: 'SQLite',
    description: 'SQLite database access and queries',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@anthropic/mcp-sqlite'],
    tags: ['database', 'sqlite', 'sql'],
  },
  'memory': {
    name: 'Memory',
    description: 'Persistent memory for agents — store and recall information',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@anthropic/mcp-memory'],
    tags: ['memory', 'persistence', 'storage'],
  },
};

export function getMcpServer(key: string): McpServer | undefined {
  return mcpServers[key];
}

export function listMcpKeys(): string[] {
  return Object.keys(mcpServers);
}
