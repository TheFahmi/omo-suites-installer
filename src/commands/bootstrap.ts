import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { heading, success, fail, info, infoBox, successBox, handleError } from '../utils/ui.ts';

const BOOTSTRAPS = {
  coding: {
    description: 'General Coding & App Development (NestJS, Next.js, Node)',
    files: {
      'AGENTS.md': `# AGENTS.md - Workspace Core\n\nThis workspace uses Oh My OpenCode for AI-assisted development.\n\n## Core Principles\n- **Strict Types:** Always use TypeScript strict mode\n- **Testing:** Unit tests for logic, E2E for critical paths\n- **Code Review:** The AI acts as reviewer (Momus Mode) before final commits\n\n## Workflows\n- For new features, spawn a Planning agent first (Prometheus Mode)\n- For complex bugs, use Debugging Protocol (Sisyphus Mode)\n- Architecture changes must be documented in docs/architecture.md\n`,
      'SOUL.md': `# SOUL.md - AI Persona\n\n- **Tone:** Professional, direct, concise.\n- **Language:** English primarily, technical terms un-translated.\n- **Focus:** Code quality, security, and maintainability.\n- **Formatting:** Use clear markdown with code blocks, lists, and bold text for emphasis.\n\nNever output raw unformatted text blocks for code explanations.\n`,
      '.opencode/oh-my-opencode.json': JSON.stringify({
        defaultMode: 'sisyphus',
        autoCommit: false,
        reviewBeforeCommit: true,
        templates: ['coding']
      }, null, 2)
    }
  },
  infra: {
    description: 'Infrastructure, DevOps & System Administration',
    files: {
      'AGENTS.md': `# AGENTS.md - Infra Workspace\n\nThis workspace manages infrastructure and deployments.\n\n## Core Principles\n- **Infrastructure as Code:** No manual changes without scripts/docs.\n- **Security First:** Minimal privileges, strict firewall rules.\n- **Idempotency:** Scripts should be safe to run multiple times.\n\n## Workflows\n- All changes must go through a planning phase (dry-run).\n- Always backup configurations before modifying.\n- Use Ansible/Terraform where possible.\n`,
      'SOUL.md': `# SOUL.md - AI Persona\n\n- **Tone:** Cautious, precise, authoritative.\n- **Focus:** Stability, security, risk mitigation.\n- **Format:** Always provide commands clearly separated. Warn loudly about destructive actions.\n\nNever execute destructive commands without explicit confirmation.\n`,
      '.opencode/oh-my-opencode.json': JSON.stringify({
        defaultMode: 'sysadmin',
        autoCommit: true,
        templates: ['infra']
      }, null, 2)
    }
  },
  re: {
    description: 'Reverse Engineering, Security Analysis & Scripting',
    files: {
      'AGENTS.md': `# AGENTS.md - RE Workspace\n\nThis workspace is dedicated to reverse engineering and security analysis.\n\n## Focus Areas\n- API analysis and client simulation\n- App decompilation and patching\n- Traffic interception and manipulation\n\n## Workflows\n- Document all findings in notes/findings.md\n- Keep exploit/patch scripts modular and well-commented\n- Maintain a strict separation between analysis environments and host system\n`,
      'SOUL.md': `# SOUL.md - AI Persona\n\n- **Tone:** Analytical, curious, deeply technical.\n- **Focus:** Understanding underlying mechanisms, bypassing restrictions, identifying vulnerabilities.\n- **Format:** Provide raw hex/data dumps when necessary. Use technical jargon accurately.\n\nThink like an attacker to understand the defense.\n`,
      '.opencode/oh-my-opencode.json': JSON.stringify({
        defaultMode: 'hacker',
        autoCommit: false,
        templates: ['re']
      }, null, 2)
    }
  }
};

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function registerBootstrapCommand(program: Command): void {
  program
    .command('bootstrap')
    .description('Scaffold a new OMO Suites workspace with predefined templates')
    .argument('[type]', 'Type of bootstrap to apply (coding, infra, re)')
    .option('-f, --force', 'Overwrite existing files')
    .action((type, opts) => {
      try {
        heading('🚀 Bootstrap Workspace');

        if (!type || !(type in BOOTSTRAPS)) {
          infoBox('Available Bootstraps', 
            Object.entries(BOOTSTRAPS)
              .map(([k, v]) => `  ${chalk.cyan(k.padEnd(10))} - ${v.description}`)
              .join('\n')
          );
          return;
        }

        const preset = BOOTSTRAPS[type as keyof typeof BOOTSTRAPS];
        info(`Applying bootstrap: ${chalk.bold(type)} - ${chalk.gray(preset.description)}\n`);

        const cwd = process.cwd();
        let appliedCount = 0;

        for (const [filepath, content] of Object.entries(preset.files)) {
          const fullPath = join(cwd, filepath);
          
          if (existsSync(fullPath) && !opts.force) {
            info(`${chalk.yellow('Skipped')} (exists): ${filepath} (use --force to overwrite)`);
            continue;
          }

          ensureDir(dirname(fullPath));
          writeFileSync(fullPath, content, 'utf-8');
          success(`${chalk.green('Created')}: ${filepath}`);
          appliedCount++;
        }

        console.log('');
        if (appliedCount > 0) {
          successBox('Bootstrap Complete', `Successfully applied ${appliedCount} files for ${chalk.bold(type)} template.\nReady to use Oh My OpenCode!`);
        } else {
          infoBox('No Changes', 'No files were created. All files already exist.');
        }
      } catch (err) {
        handleError(err);
      }
    });
}
