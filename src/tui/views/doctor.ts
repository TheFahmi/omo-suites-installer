import { commandExists, getCommandVersion } from '../../utils/shell.ts';
import { readConfig, configExists, getConfigPath } from '../../core/config.ts';
import { detectOpenCode, readOpenCodeConfig } from '../../core/opencode.ts';
import { lspServers } from '../../data/lsp-registry.ts';
import { gold, goldBold, dim, bold, white, green, red, yellow, gray } from '../utils.ts';

export interface DoctorViewState {
  results: DoctorResult[];
  running: boolean;
  done: boolean;
  currentCheck: string;
}

interface DoctorResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  detail?: string;
}

export function initialDoctorState(): DoctorViewState {
  return {
    results: [],
    running: false,
    done: false,
    currentCheck: '',
  };
}

export async function runDoctorChecks(state: DoctorViewState, onProgress: () => void): Promise<void> {
  state.running = true;
  state.done = false;
  state.results = [];

  const addResult = (r: DoctorResult) => {
    state.results.push(r);
    onProgress();
  };

  // 1. OpenCode
  state.currentCheck = 'OpenCode'; onProgress();
  const opencode = await detectOpenCode();
  addResult({
    name: 'OpenCode',
    status: opencode.installed ? 'pass' : 'fail',
    message: opencode.installed
      ? `Installed${opencode.version ? ` (${opencode.version})` : ''}`
      : 'Not installed',
  });

  // 2. Bun
  state.currentCheck = 'Bun'; onProgress();
  const bunOk = await commandExists('bun');
  const bunVer = bunOk ? await getCommandVersion('bun') : null;
  addResult({
    name: 'Bun',
    status: bunOk ? 'pass' : 'fail',
    message: bunOk ? `Installed${bunVer ? ` (${bunVer})` : ''}` : 'Not installed',
  });

  // 3. Node.js
  state.currentCheck = 'Node.js'; onProgress();
  const nodeOk = await commandExists('node');
  const nodeVer = nodeOk ? await getCommandVersion('node') : null;
  addResult({
    name: 'Node.js',
    status: nodeOk ? 'pass' : 'warn',
    message: nodeOk ? `Installed${nodeVer ? ` (${nodeVer})` : ''}` : 'Not installed (some MCP servers need npx)',
  });

  // 4. Git
  state.currentCheck = 'Git'; onProgress();
  const gitOk = await commandExists('git');
  const gitVer = gitOk ? await getCommandVersion('git') : null;
  addResult({
    name: 'Git',
    status: gitOk ? 'pass' : 'warn',
    message: gitOk ? `Installed${gitVer ? ` (${gitVer})` : ''}` : 'Not installed',
  });

  // 5. OMOCS config
  state.currentCheck = 'OMOCS Config'; onProgress();
  const hasConfig = await configExists();
  if (hasConfig) {
    const config = await readConfig();
    const accountCount = Object.values(config.accounts).flat().length;
    addResult({
      name: 'OMOCS Config',
      status: 'pass',
      message: `Profile: ${config.activeProfile}, ${accountCount} account(s)`,
    });
  } else {
    addResult({
      name: 'OMOCS Config',
      status: 'warn',
      message: 'Not found — run `omocs init`',
    });
  }

  // 6. API Keys
  state.currentCheck = 'API Keys'; onProgress();
  const envKeys = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GOOGLE_API_KEY', 'GITHUB_TOKEN'];
  const foundKeys = envKeys.filter(k => process.env[k]);
  addResult({
    name: 'API Keys',
    status: foundKeys.length > 0 ? 'pass' : 'warn',
    message: foundKeys.length > 0
      ? `${foundKeys.length} key(s) in environment`
      : 'No API keys in environment',
  });

  // 7. .opencode.json
  state.currentCheck = '.opencode.json'; onProgress();
  const ocConfig = await readOpenCodeConfig();
  addResult({
    name: '.opencode.json',
    status: ocConfig ? 'pass' : 'warn',
    message: ocConfig ? `Found at ${ocConfig.path}` : 'Not found',
  });

  // 8. LSP servers
  state.currentCheck = 'LSP Servers'; onProgress();
  let lspInstalled = 0;
  let lspTotal = 0;
  for (const [, lsp] of Object.entries(lspServers)) {
    lspTotal++;
    if (await commandExists(lsp.command)) lspInstalled++;
  }
  addResult({
    name: 'LSP Servers',
    status: lspInstalled > 0 ? 'pass' : 'warn',
    message: `${lspInstalled}/${lspTotal} installed`,
  });

  // 9. MCP config
  state.currentCheck = 'MCP Servers'; onProgress();
  const mcpCount = ocConfig?.config?.mcpServers ? Object.keys(ocConfig.config.mcpServers).length : 0;
  addResult({
    name: 'MCP Servers',
    status: mcpCount > 0 ? 'pass' : 'warn',
    message: `${mcpCount} server(s) configured`,
  });

  state.running = false;
  state.done = true;
  state.currentCheck = '';
  onProgress();
}

export function renderDoctor(state: DoctorViewState): { lines: string[]; title: string; hint: string } {
  const lines: string[] = [];

  if (state.running) {
    const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    const frame = spinner[Math.floor(Date.now() / 100) % spinner.length];
    lines.push(gold(`${frame} Running health checks...`));
    if (state.currentCheck) {
      lines.push(dim(`  Checking ${state.currentCheck}...`));
    }
    lines.push('');
  }

  for (const r of state.results) {
    const icon = r.status === 'pass' ? green('✅') :
                 r.status === 'fail' ? red('❌') :
                 yellow('⚠️');
    const msg = r.status === 'pass' ? green(r.message) :
                r.status === 'fail' ? red(r.message) :
                yellow(r.message);
    lines.push(`  ${icon} ${bold(r.name)}: ${msg}`);
    if (r.detail) {
      lines.push(`     ${dim(r.detail)}`);
    }
  }

  if (state.done) {
    const passed = state.results.filter(r => r.status === 'pass').length;
    const failed = state.results.filter(r => r.status === 'fail').length;
    const warned = state.results.filter(r => r.status === 'warn').length;

    lines.push('');
    lines.push(gold('─'.repeat(40)));
    lines.push(`  ${green(`${passed} passed`)}  ${red(`${failed} failed`)}  ${yellow(`${warned} warnings`)}`);

    if (failed === 0 && warned === 0) {
      lines.push('');
      lines.push(green('  🎉 Everything looks great!'));
    } else if (failed > 0) {
      lines.push('');
      lines.push(red('  Fix failed checks and run again.'));
    }
  }

  return {
    lines,
    title: '🩺 Doctor',
    hint: state.done ? dim('[r] re-run  [Esc] back') : dim('Running checks...'),
  };
}
