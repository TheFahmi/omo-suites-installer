import { $ } from 'bun';

export interface ShellResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
}

export async function run(command: string, args: string[] = [], options?: { cwd?: string; env?: Record<string, string> }): Promise<ShellResult> {
  try {
    const proc = Bun.spawn([command, ...args], {
      cwd: options?.cwd,
      env: { ...process.env, ...options?.env },
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    return {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode,
      success: exitCode === 0,
    };
  } catch (error) {
    return {
      stdout: '',
      stderr: error instanceof Error ? error.message : String(error),
      exitCode: 1,
      success: false,
    };
  }
}

export async function commandExists(command: string): Promise<boolean> {
  const result = await run('which', [command]);
  return result.success;
}

export async function getCommandVersion(command: string, versionFlag = '--version'): Promise<string | null> {
  const result = await run(command, [versionFlag]);
  if (result.success) {
    return result.stdout.split('\n')[0].trim();
  }
  return null;
}

export async function runInteractive(command: string, args: string[] = [], options?: { cwd?: string }): Promise<number> {
  const proc = Bun.spawn([command, ...args], {
    cwd: options?.cwd,
    stdio: ['inherit', 'inherit', 'inherit'],
  });
  return await proc.exited;
}
