import { spawn, execSync } from 'child_process';

export interface ShellResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
}

export async function run(command: string, args: string[] = [], options?: { cwd?: string; env?: Record<string, string> }): Promise<ShellResult> {
  return new Promise((resolve) => {
    try {
      const proc = spawn(command, args, {
        cwd: options?.cwd,
        env: { ...process.env, ...options?.env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on('error', (error: Error) => {
        resolve({
          stdout: '',
          stderr: error.message,
          exitCode: 1,
          success: false,
        });
      });

      proc.on('close', (code: number | null) => {
        const exitCode = code ?? 1;
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode,
          success: exitCode === 0,
        });
      });
    } catch (error) {
      resolve({
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        exitCode: 1,
        success: false,
      });
    }
  });
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
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      cwd: options?.cwd,
      stdio: ['inherit', 'inherit', 'inherit'],
    });

    proc.on('error', () => {
      resolve(1);
    });

    proc.on('close', (code: number | null) => {
      resolve(code ?? 1);
    });
  });
}
