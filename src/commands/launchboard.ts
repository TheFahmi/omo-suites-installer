import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { resolveLaunchboardDir } from '../utils/launchboard-resolver.ts';

function getLaunchboardDir(): string | null {
  const result = resolveLaunchboardDir();
  if (!result.dir) {
    console.log(chalk.red(`❌ ${result.message || 'Launchboard not found.'}`));
    return null;
  }
  return result.dir;
}

export function registerLaunchboardCommand(program: Command) {
  const lb = program
    .command('launchboard')
    .alias('lb')
    .description('Manage Launchboard — AI-integrated Kanban board');

  lb.command('setup')
    .description('Setup Launchboard (install deps, create DB, seed data)')
    .action(async () => {
      console.log(chalk.hex('#d4a853').bold('\n🚀 Setting up Launchboard...\n'));

      const LAUNCHBOARD_DIR = getLaunchboardDir();
      if (!LAUNCHBOARD_DIR) return;

      const spinner = ora('Installing dependencies...').start();
      try {
        execSync('bun install', { cwd: LAUNCHBOARD_DIR, stdio: 'pipe' });
        spinner.succeed('Dependencies installed');
      } catch (e) {
        spinner.fail('Failed to install dependencies');
        return;
      }

      // Install frontend deps
      const frontendDir = resolve(LAUNCHBOARD_DIR, 'frontend');
      if (existsSync(frontendDir)) {
        spinner.start('Installing frontend dependencies...');
        try {
          execSync('bun install', { cwd: frontendDir, stdio: 'pipe' });
          spinner.succeed('Frontend dependencies installed');
        } catch (e) {
          spinner.fail('Failed to install frontend dependencies');
        }
      }

      // Create DB
      const dbPath = resolve(LAUNCHBOARD_DIR, 'launchboard.db');
      if (!existsSync(dbPath)) {
        spinner.start('Creating database...');
        try {
          execSync('bunx drizzle-kit push', { cwd: LAUNCHBOARD_DIR, stdio: 'pipe' });
          spinner.succeed('Database created');
        } catch (e) {
          spinner.fail('Failed to create database');
        }

        spinner.start('Seeding sample data...');
        try {
          execSync('bun run seed', { cwd: LAUNCHBOARD_DIR, stdio: 'pipe' });
          spinner.succeed('Sample data seeded');
        } catch (e) {
          spinner.fail('Failed to seed data');
        }
      } else {
        console.log(chalk.dim('  Database already exists, skipping setup'));
      }

      console.log(chalk.hex('#d4a853').bold('\n✅ Launchboard is ready!\n'));
      console.log(chalk.dim('  Start with:'), chalk.white('omocs launchboard start'));
      console.log(chalk.dim('  Backend:'), chalk.white('http://localhost:3030'));
      console.log(chalk.dim('  Frontend:'), chalk.white('http://localhost:3040'));
      console.log();
    });

  lb.command('start')
    .description('Start Launchboard (backend + frontend)')
    .option('--backend-only', 'Start only the backend API')
    .option('--frontend-only', 'Start only the frontend')
    .action(async (opts) => {
      console.log(chalk.hex('#d4a853').bold('\n🚀 Starting Launchboard...\n'));

      const LAUNCHBOARD_DIR = getLaunchboardDir();
      if (!LAUNCHBOARD_DIR) return;

      if (!existsSync(resolve(LAUNCHBOARD_DIR, 'node_modules'))) {
        console.log(chalk.yellow('⚠️  Dependencies not installed. Run: omocs launchboard setup'));
        return;
      }

      if (opts.backendOnly) {
        console.log(chalk.dim('  Backend:'), chalk.white('http://localhost:3030'));
        execSync('bun run start', { cwd: LAUNCHBOARD_DIR, stdio: 'inherit' });
      } else if (opts.frontendOnly) {
        const frontendDir = resolve(LAUNCHBOARD_DIR, 'frontend');
        console.log(chalk.dim('  Frontend:'), chalk.white('http://localhost:3040'));
        execSync('bun run dev', { cwd: frontendDir, stdio: 'inherit' });
      } else {
        console.log(chalk.dim('  Backend:'), chalk.white('http://localhost:3030'));
        console.log(chalk.dim('  Frontend:'), chalk.white('http://localhost:3040'));
        console.log(chalk.dim('  Press Ctrl+C to stop\n'));

        // Cross-platform setup (replaces bash setup.sh)
        const lbDir = LAUNCHBOARD_DIR;
        const frontendDir = resolve(lbDir, 'frontend');
        const isWin = process.platform === 'win32';
        const runCmd = (cmd: string, cwd: string) => execSync(cmd, { cwd, stdio: 'inherit', shell: isWin ? 'cmd.exe' : '/bin/sh' });

        // Install deps if needed
        if (!existsSync(resolve(lbDir, 'node_modules'))) {
          console.log(chalk.dim('  Installing backend dependencies...'));
          runCmd('bun install', lbDir);
        }
        if (!existsSync(resolve(frontendDir, 'node_modules'))) {
          console.log(chalk.dim('  Installing frontend dependencies...'));
          runCmd('bun install', frontendDir);
        }

        // Create DB if needed
        if (!existsSync(resolve(lbDir, 'launchboard.db'))) {
          console.log(chalk.dim('  Creating database...'));
          runCmd('bunx drizzle-kit push', lbDir);
          console.log(chalk.dim('  Seeding sample data...'));
          runCmd('bun run seed', lbDir);
        }

        // Start backend + frontend via spawn (cross-platform)
        const { spawn: spawnProc } = await import('child_process');
        const backendProc = spawnProc('bun', ['run', 'start'], { cwd: lbDir, stdio: 'inherit', shell: isWin });
        const frontendProc = spawnProc('bun', ['run', 'dev'], { cwd: frontendDir, stdio: 'inherit', shell: isWin });

        // Handle Ctrl+C gracefully
        const cleanup = () => {
          backendProc.kill();
          frontendProc.kill();
          process.exit(0);
        };
        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);

        // Wait for either to exit
        await new Promise<void>((res) => {
          backendProc.on('exit', () => { frontendProc.kill(); res(); });
          frontendProc.on('exit', () => { backendProc.kill(); res(); });
        });
      }
    });

  lb.command('status')
    .description('Check if Launchboard is running')
    .action(async () => {
      try {
        const res = await fetch('http://localhost:3030/api/health');
        const data = await res.json() as any;
        console.log(chalk.green('✅ Launchboard API is running'));
        console.log(chalk.dim(`   Version: ${data.version || 'unknown'}`));
        console.log(chalk.dim(`   Backend: http://localhost:3030`));
      } catch {
        console.log(chalk.red('❌ Launchboard API is not running'));
        console.log(chalk.dim('   Start with: omocs launchboard start'));
      }

      try {
        const res = await fetch('http://localhost:3040');
        console.log(chalk.green('✅ Launchboard Frontend is running'));
        console.log(chalk.dim(`   Frontend: http://localhost:3040`));
      } catch {
        console.log(chalk.red('❌ Launchboard Frontend is not running'));
      }
    });
}
