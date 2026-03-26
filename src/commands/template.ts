import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'fs';
import { join, basename, dirname } from 'path';
import { homedir } from 'os';
import { createHash } from 'crypto';
import { heading, success, fail, warn, info, icons, handleError, infoBox, successBox, label, divider } from '../utils/ui.ts';

// ─── Constants ───────────────────────────────────────────────────────
const TEMPLATE_DIR = join(homedir(), '.omocs', 'templates');
const CONFIG_LOCATIONS = [
  'opencode.json',
  join('.opencode', 'opencode.json'),
];
const OMOC_LOCATIONS = [
  'oh-my-opencode.json',
  join('.opencode', 'oh-my-opencode.json'),
];

// ─── Helpers ─────────────────────────────────────────────────────────
function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function readJsonSafe(path: string): any {
  try { return JSON.parse(readFileSync(path, 'utf-8')); } catch { return null; }
}

function findConfigFile(): string | null {
  for (const loc of CONFIG_LOCATIONS) {
    const full = join(process.cwd(), loc);
    if (existsSync(full)) return full;
  }
  return null;
}

function findOmocFile(): string | null {
  for (const loc of OMOC_LOCATIONS) {
    const full = join(process.cwd(), loc);
    if (existsSync(full)) return full;
  }
  return null;
}

interface TemplateManifest {
  name: string;
  description: string;
  author: string;
  createdAt: string;
  workspace: string;
  files: string[];
}

// ─── Register Command ────────────────────────────────────────────────
export function registerTemplateCommand(program: Command): void {
  const template = program
    .command('template')
    .description('Save, load, and share config templates');

  // template save
  template
    .command('save <name>')
    .description('Save current workspace config as a named template')
    .option('-d, --desc <description>', 'Template description')
    .option('--include-agents', 'Also include AGENTS.md')
    .action((name, opts) => {
      try {
        heading('📦 Save Template');

        const templatePath = join(TEMPLATE_DIR, name);
        ensureDir(templatePath);

        const manifest: TemplateManifest = {
          name,
          description: opts.desc || `Template from ${basename(process.cwd())}`,
          author: process.env.USER || 'unknown',
          createdAt: new Date().toISOString(),
          workspace: process.cwd(),
          files: [],
        };

        // Copy opencode.json
        const configFile = findConfigFile();
        if (configFile) {
          const dest = join(templatePath, 'opencode.json');
          copyFileSync(configFile, dest);
          manifest.files.push('opencode.json');
          info(`Saved: ${chalk.cyan('opencode.json')}`);
        }

        // Copy oh-my-opencode.json
        const omocFile = findOmocFile();
        if (omocFile) {
          const dest = join(templatePath, 'oh-my-opencode.json');
          copyFileSync(omocFile, dest);
          manifest.files.push('oh-my-opencode.json');
          info(`Saved: ${chalk.cyan('oh-my-opencode.json')}`);
        }

        // Copy AGENTS.md if requested
        if (opts.includeAgents) {
          const agentsFile = join(process.cwd(), 'AGENTS.md');
          if (existsSync(agentsFile)) {
            copyFileSync(agentsFile, join(templatePath, 'AGENTS.md'));
            manifest.files.push('AGENTS.md');
            info(`Saved: ${chalk.cyan('AGENTS.md')}`);
          }
        }

        if (manifest.files.length === 0) {
          fail('No config files found in current workspace.');
          return;
        }

        // Write manifest
        writeFileSync(join(templatePath, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');

        successBox('Template Saved', `Name: ${chalk.bold(name)}\nFiles: ${manifest.files.join(', ')}\nPath: ${chalk.gray(templatePath)}`);
      } catch (err) { handleError(err); }
    });

  // template list
  template
    .command('list')
    .description('List saved templates')
    .action(() => {
      try {
        heading('📦 Saved Templates');

        if (!existsSync(TEMPLATE_DIR)) {
          infoBox('No Templates', `No templates saved yet.\n\nSave one: ${chalk.cyan('omocs template save <name>')}`);
          return;
        }

        const { readdirSync, statSync } = require('fs');
        const dirs = readdirSync(TEMPLATE_DIR).filter((d: string) => {
          const p = join(TEMPLATE_DIR, d);
          return statSync(p).isDirectory() && existsSync(join(p, 'manifest.json'));
        });

        if (dirs.length === 0) {
          infoBox('No Templates', 'No templates found.');
          return;
        }

        info(`${dirs.length} template(s):`);
        console.log('');

        for (const dir of dirs) {
          const manifest = readJsonSafe(join(TEMPLATE_DIR, dir, 'manifest.json'));
          if (!manifest) continue;

          console.log(`  ${icons.folder} ${chalk.bold.cyan(manifest.name)}`);
          console.log(`    ${chalk.gray(manifest.description)}`);
          console.log(`    Files: ${manifest.files.join(', ')} ${chalk.gray(`(${new Date(manifest.createdAt).toLocaleDateString()})`)}`);
          console.log('');
        }
      } catch (err) { handleError(err); }
    });

  // template load
  template
    .command('load <name>')
    .description('Load a template into current workspace')
    .option('--force', 'Overwrite existing files without asking')
    .action((name, opts) => {
      try {
        heading('📦 Load Template');

        const templatePath = join(TEMPLATE_DIR, name);
        const manifestPath = join(templatePath, 'manifest.json');

        if (!existsSync(manifestPath)) {
          fail(`Template "${name}" not found. Use ${chalk.cyan('omocs template list')} to see available.`);
          return;
        }

        const manifest: TemplateManifest = readJsonSafe(manifestPath);
        if (!manifest) {
          fail('Template manifest is corrupted.');
          return;
        }

        info(`Loading template: ${chalk.bold(manifest.name)}`);
        console.log('');

        for (const file of manifest.files) {
          const src = join(templatePath, file);
          if (!existsSync(src)) { warn(`Skipping missing file: ${file}`); continue; }

          // Determine destination
          let dest: string;
          if (file === 'opencode.json') {
            // Put where existing config is, or default
            const existing = findConfigFile();
            dest = existing || join(process.cwd(), 'opencode.json');
          } else if (file === 'oh-my-opencode.json') {
            const existing = findOmocFile();
            dest = existing || join(process.cwd(), 'oh-my-opencode.json');
          } else {
            dest = join(process.cwd(), file);
          }

          if (existsSync(dest) && !opts.force) {
            warn(`Skipping ${file} — already exists (use --force to overwrite)`);
            continue;
          }

          // Backup existing
          if (existsSync(dest)) {
            const bakPath = dest + '.bak.' + Date.now();
            copyFileSync(dest, bakPath);
          }

          ensureDir(dirname(dest));
          copyFileSync(src, dest);
          success(`Applied: ${chalk.cyan(file)}`);
        }

        console.log('');
        successBox('Template Loaded', `Template "${manifest.name}" applied to ${process.cwd()}`);
      } catch (err) { handleError(err); }
    });

  // template delete
  template
    .command('delete <name>')
    .description('Delete a saved template')
    .action((name) => {
      try {
        const templatePath = join(TEMPLATE_DIR, name);
        if (!existsSync(templatePath)) {
          fail(`Template "${name}" not found.`);
          return;
        }

        const { rmSync } = require('fs');
        rmSync(templatePath, { recursive: true });
        success(`Template "${name}" deleted.`);
      } catch (err) { handleError(err); }
    });

  // template export (to shareable JSON)
  template
    .command('export <name>')
    .description('Export a template as a single shareable JSON file')
    .option('-o, --output <file>', 'Output file path')
    .action((name, opts) => {
      try {
        const templatePath = join(TEMPLATE_DIR, name);
        const manifestPath = join(templatePath, 'manifest.json');

        if (!existsSync(manifestPath)) {
          fail(`Template "${name}" not found.`);
          return;
        }

        const manifest = readJsonSafe(manifestPath);
        const exportData: any = { ...manifest, contents: {} };

        for (const file of manifest.files) {
          const filePath = join(templatePath, file);
          if (existsSync(filePath)) {
            exportData.contents[file] = readFileSync(filePath, 'utf-8');
          }
        }

        const outputPath = opts.output || `${name}-template.json`;
        writeFileSync(outputPath, JSON.stringify(exportData, null, 2), 'utf-8');
        success(`Exported to ${chalk.cyan(outputPath)}`);
      } catch (err) { handleError(err); }
    });

  // Default: list
  template.action(() => {
    if (!existsSync(TEMPLATE_DIR)) {
      heading('📦 Config Templates');
      infoBox('Templates', [
        'Save, load, and share workspace configurations.',
        '',
        `  ${chalk.cyan('omocs template save <name>')}    — save current config`,
        `  ${chalk.cyan('omocs template list')}           — list saved templates`,
        `  ${chalk.cyan('omocs template load <name>')}    — apply template`,
        `  ${chalk.cyan('omocs template export <name>')}  — export to shareable JSON`,
      ].join('\n'));
      return;
    }
    // Show list
    const { readdirSync: rd } = require('fs');
    const dirs = rd(TEMPLATE_DIR).filter((d: string) => existsSync(join(TEMPLATE_DIR, d, 'manifest.json')));
    heading('📦 Saved Templates');
    if (dirs.length === 0) { info('No templates yet.'); return; }
    for (const d of dirs) {
      const m = readJsonSafe(join(TEMPLATE_DIR, d, 'manifest.json'));
      if (m) console.log(`  ${icons.folder} ${chalk.bold.cyan(m.name)} — ${chalk.gray(m.description)}`);
    }
  });
}
