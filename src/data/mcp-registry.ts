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
  'postgres': {
    name: 'PostgreSQL',
    description: 'PostgreSQL database access and queries',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres'],
    env: { POSTGRES_CONNECTION_STRING: '' },
    tags: ['database', 'postgres', 'sql'],
  },
  'fetch': {
    name: 'Fetch',
    description: 'Fetch and extract content from URLs',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@anthropic-ai/fetch-mcp'],
    tags: ['fetch', 'web', 'http'],
  },
  'filesystem': {
    name: 'Filesystem',
    description: 'File system operations — read, write, search files',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@anthropic-ai/filesystem-mcp'],
    tags: ['filesystem', 'files', 'io'],
  },
  'brave-search': {
    name: 'Brave Search',
    description: 'Web search via Brave Search API',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@anthropic-ai/brave-search-mcp'],
    env: { BRAVE_API_KEY: '' },
    tags: ['search', 'web', 'brave'],
  },
  'slack': {
    name: 'Slack',
    description: 'Slack workspace integration — messages, channels, threads',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@anthropic-ai/slack-mcp'],
    env: { SLACK_BOT_TOKEN: '' },
    tags: ['slack', 'messaging', 'communication'],
  },
  'redis': {
    name: 'Redis',
    description: 'Redis database access and operations',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-redis'],
    env: { REDIS_URL: '' },
    tags: ['database', 'redis', 'cache'],
  },
  'docker': {
    name: 'Docker',
    description: 'Docker container management and operations',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-docker'],
    tags: ['docker', 'containers', 'devops'],
  },
  'sentry': {
    name: 'Sentry',
    description: 'Sentry error tracking and monitoring',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sentry'],
    env: { SENTRY_AUTH_TOKEN: '' },
    tags: ['monitoring', 'errors', 'sentry'],
  },
  'context7': {
    name: 'Context7',
    description: 'Library documentation search — find up-to-date docs for any library',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@context7/mcp-server'],
    tags: ['documentation', 'search', 'libraries'],
  },
  'grep-app': {
    name: 'Grep App',
    description: 'Search code across public repositories via grep.app',
    type: 'stdio',
    command: 'npx',
    args: ['-y', 'grep-app-mcp'],
    tags: ['search', 'code', 'grep'],
  },
  'exa-websearch': {
    name: 'Exa Web Search',
    description: 'AI-powered web search via Exa',
    type: 'stdio',
    command: 'npx',
    args: ['-y', 'exa-mcp-server'],
    env: { EXA_API_KEY: '' },
    tags: ['search', 'web', 'ai'],
  },
};

export function getMcpServer(key: string): McpServer | undefined {
  return mcpServers[key];
}

export function listMcpKeys(): string[] {
  return Object.keys(mcpServers);
}
