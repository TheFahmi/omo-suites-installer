import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, copyFileSync } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';
import { heading, success, fail, warn, info, icons, handleError, infoBox, successBox, label, divider, createTable } from '../utils/ui.ts';

// ─── Constants ───────────────────────────────────────────────────────
const REGISTRY_DIR = join(homedir(), '.omocs', 'marketplace');
const PLUGINS_DIR = join(homedir(), '.omocs', 'plugins');

// ─── Types ───────────────────────────────────────────────────────────
interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  type: 'agent' | 'mcp-server' | 'config-preset' | 'skill';
  entryPoint?: string;
  tags: string[];
  createdAt: string;
  compatibility: string;
}

interface InstalledPlugin {
  manifest: PluginManifest;
  installedAt: string;
  path: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────
function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function readJsonSafe(path: string): any {
  try { return JSON.parse(readFileSync(path, 'utf-8')); } catch { return null; }
}

function getInstalledPlugins(): InstalledPlugin[] {
  ensureDir(PLUGINS_DIR);
  const plugins: InstalledPlugin[] = [];

  const dirs = readdirSync(PLUGINS_DIR).filter(d => {
    const p = join(PLUGINS_DIR, d);
    return statSync(p).isDirectory() && existsSync(join(p, 'manifest.json'));
  });

  for (const dir of dirs) {
    const manifest = readJsonSafe(join(PLUGINS_DIR, dir, 'manifest.json'));
    if (manifest) {
      plugins.push({
        manifest,
        installedAt: manifest.installedAt || 'unknown',
        path: join(PLUGINS_DIR, dir),
      });
    }
  }
  return plugins;
}

// Built-in registry of community plugins (curated)
function getRegistryPlugins(): PluginManifest[] {
  const registryPath = join(REGISTRY_DIR, 'registry.json');
  if (existsSync(registryPath)) {
    const data = readJsonSafe(registryPath);
    if (Array.isArray(data)) return data;
  }

  // Default built-in catalog
  return [
    {
      name: 'opencode-typescript-agent',
      version: '1.0.0',
      description: 'TypeScript/Node.js expert agent with NestJS, Next.js, and testing specialization',
      author: 'omo-suites',
      type: 'agent',
      tags: ['typescript', 'nodejs', 'nestjs', 'nextjs'],
      createdAt: '2026-03-01',
      compatibility: '>=1.10.0',
    },
    {
      name: 'opencode-python-agent',
      version: '1.0.0',
      description: 'Python expert agent with Django, FastAPI, and ML/DS specialization',
      author: 'omo-suites',
      type: 'agent',
      tags: ['python', 'django', 'fastapi', 'ml'],
      createdAt: '2026-03-01',
      compatibility: '>=1.10.0',
    },
    {
      name: 'opencode-devops-agent',
      version: '1.0.0',
      description: 'DevOps/Infrastructure agent for Docker, K8s, CI/CD, and cloud deployments',
      author: 'omo-suites',
      type: 'agent',
      tags: ['devops', 'docker', 'kubernetes', 'ci-cd'],
      createdAt: '2026-03-01',
      compatibility: '>=1.10.0',
    },
    {
      name: 'security-scanner-mcp',
      version: '1.0.0',
      description: 'MCP server for OWASP security scanning and vulnerability detection',
      author: 'omo-suites',
      type: 'mcp-server',
      tags: ['security', 'owasp', 'scanning'],
      createdAt: '2026-03-01',
      compatibility: '>=1.10.0',
    },
    {
      name: 'preset-fullstack',
      version: '1.0.0',
      description: 'Config preset for fullstack TypeScript projects (Next.js + NestJS)',
      author: 'omo-suites',
      type: 'config-preset',
      tags: ['fullstack', 'typescript', 'preset'],
      createdAt: '2026-03-01',
      compatibility: '>=1.10.0',
    },
    {
      name: 'preset-monorepo',
      version: '1.0.0',
      description: 'Config preset optimized for pnpm/turborepo monorepos',
      author: 'omo-suites',
      type: 'config-preset',
      tags: ['monorepo', 'pnpm', 'turborepo', 'preset'],
      createdAt: '2026-03-01',
      compatibility: '>=1.10.0',
    },
  ];
}

// ─── Register Command ────────────────────────────────────────────────
export function registerMarketplaceCommand(program: Command): void {
  const mp = program
    .command('marketplace')
    .alias('market')
    .description('Browse, install, and manage community plugins');

  // marketplace search
  mp.command('search [query]')
    .description('Search the plugin registry')
    .option('-t, --type <type>', 'Filter by type (agent|mcp-server|config-preset|skill)')
    .option('--tag <tag>', 'Filter by tag')
    .action((query, opts) => {
      try {
        heading('🏪 Plugin Marketplace');

        let plugins = getRegistryPlugins();

        if (query) {
          const q = query.toLowerCase();
          plugins = plugins.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.tags.some(t => t.toLowerCase().includes(q))
          );
        }

        if (opts.type) {
          plugins = plugins.filter(p => p.type === opts.type);
        }
        if (opts.tag) {
          plugins = plugins.filter(p => p.tags.includes(opts.tag.toLowerCase()));
        }

        if (plugins.length === 0) {
          warn(query ? `No plugins matching "${query}"` : 'No plugins found.');
          return;
        }

        const installed = getInstalledPlugins().map(p => p.manifest.name);

        info(`${plugins.length} plugin(s) found:`);
        console.log('');

        for (const p of plugins) {
          const isInstalled = installed.includes(p.name);
          const statusBadge = isInstalled ? chalk.green(' [installed]') : '';
          const typeColor = p.type === 'agent' ? chalk.blue : p.type === 'mcp-server' ? chalk.magenta : chalk.yellow;
          const typeBadge = typeColor(`[${p.type}]`);

          console.log(`  ${chalk.bold.cyan(p.name)} ${chalk.gray(`v${p.version}`)} ${typeBadge}${statusBadge}`);
          console.log(`    ${p.description}`);
          console.log(`    ${chalk.gray('Tags:')} ${p.tags.map(t => chalk.dim(`#${t}`)).join(' ')} ${chalk.gray(`by ${p.author}`)}`);
          console.log('');
        }
      } catch (err) { handleError(err); }
    });

  // marketplace install
  mp.command('install <name>')
    .description('Install a plugin from the registry')
    .action((name) => {
      try {
        heading('📥 Install Plugin');

        const registry = getRegistryPlugins();
        const plugin = registry.find(p => p.name === name);

        if (!plugin) {
          fail(`Plugin "${name}" not found in registry. Use ${chalk.cyan('omocs marketplace search')} to browse.`);
          return;
        }

        // Check if already installed
        const installed = getInstalledPlugins();
        if (installed.find(p => p.manifest.name === name)) {
          warn(`Plugin "${name}" is already installed.`);
          return;
        }

        // Create plugin directory
        const pluginDir = join(PLUGINS_DIR, name);
        ensureDir(pluginDir);

        // Write manifest
        const installManifest = { ...plugin, installedAt: new Date().toISOString() };
        writeFileSync(join(pluginDir, 'manifest.json'), JSON.stringify(installManifest, null, 2), 'utf-8');

        // Generate placeholder based on type
        if (plugin.type === 'agent') {
          writeFileSync(join(pluginDir, 'agent.md'), [
            `# ${plugin.name}`,
            '',
            plugin.description,
            '',
            '## Instructions',
            '',
            '_Configure this agent in your opencode.json or oh-my-opencode.json._',
          ].join('\n'), 'utf-8');
        } else if (plugin.type === 'config-preset') {
          writeFileSync(join(pluginDir, 'preset.json'), JSON.stringify({
            name: plugin.name,
            description: plugin.description,
            config: {},
          }, null, 2), 'utf-8');
        }

        successBox('Installed', `${chalk.bold(name)} v${plugin.version}\n${plugin.description}`);
      } catch (err) { handleError(err); }
    });

  // marketplace uninstall
  mp.command('uninstall <name>')
    .description('Remove an installed plugin')
    .action((name) => {
      try {
        const pluginDir = join(PLUGINS_DIR, name);
        if (!existsSync(pluginDir)) {
          fail(`Plugin "${name}" is not installed.`);
          return;
        }

        const { rmSync } = require('fs');
        rmSync(pluginDir, { recursive: true });
        success(`Plugin "${name}" uninstalled.`);
      } catch (err) { handleError(err); }
    });

  // marketplace installed
  mp.command('installed')
    .description('List installed plugins')
    .action(() => {
      try {
        heading('📦 Installed Plugins');

        const installed = getInstalledPlugins();

        if (installed.length === 0) {
          infoBox('No Plugins', `No plugins installed.\n\nBrowse: ${chalk.cyan('omocs marketplace search')}`);
          return;
        }

        info(`${installed.length} plugin(s) installed:`);
        console.log('');

        for (const p of installed) {
          const m = p.manifest;
          const typeColor = m.type === 'agent' ? chalk.blue : m.type === 'mcp-server' ? chalk.magenta : chalk.yellow;
          console.log(`  ${icons.check} ${chalk.bold.cyan(m.name)} ${chalk.gray(`v${m.version}`)} ${typeColor(`[${m.type}]`)}`);
          console.log(`    ${m.description}`);
          console.log(`    ${chalk.gray(`Installed: ${new Date(p.installedAt).toLocaleDateString()}`)} ${chalk.gray(p.path)}`);
          console.log('');
        }
      } catch (err) { handleError(err); }
    });

  // marketplace publish
  mp.command('publish <path>')
    .description('Package a plugin for sharing')
    .action((pluginPath) => {
      try {
        heading('📤 Publish Plugin');

        const manifestPath = join(pluginPath, 'manifest.json');
        if (!existsSync(manifestPath)) {
          fail(`No manifest.json found in ${pluginPath}. Create one first.`);
          info('Required manifest fields: name, version, description, author, type, tags');
          return;
        }

        const manifest = readJsonSafe(manifestPath);
        if (!manifest || !manifest.name || !manifest.version) {
          fail('Invalid manifest. Required: name, version, description, author, type, tags.');
          return;
        }

        // Package as JSON
        const output = `${manifest.name}-${manifest.version}.json`;
        const exportData: any = { manifest };

        // Include all files
        const files = readdirSync(pluginPath).filter(f => f !== 'manifest.json');
        exportData.files = {};
        for (const file of files) {
          const filePath = join(pluginPath, file);
          if (statSync(filePath).isFile()) {
            exportData.files[file] = readFileSync(filePath, 'utf-8');
          }
        }

        writeFileSync(output, JSON.stringify(exportData, null, 2), 'utf-8');
        successBox('Packaged', `${chalk.bold(manifest.name)} v${manifest.version}\nOutput: ${chalk.cyan(output)}\n\nShare this file or submit to the OMO Suites registry.`);
      } catch (err) { handleError(err); }
    });

  // Default: search all
  mp.action(() => {
    heading('🏪 Plugin Marketplace');
    const plugins = getRegistryPlugins();
    const installed = getInstalledPlugins();

    info(`Registry: ${plugins.length} plugins | Installed: ${installed.length}`);
    console.log('');

    for (const p of plugins) {
      const isInstalled = installed.some(ip => ip.manifest.name === p.name);
      const badge = isInstalled ? chalk.green(' ✓') : '';
      console.log(`  ${chalk.bold.cyan(p.name)}${badge} — ${chalk.gray(p.description)}`);
    }

    console.log(`\n  Use ${chalk.cyan('omocs marketplace search <query>')} or ${chalk.cyan('omocs marketplace install <name>')}`);
  });
}
