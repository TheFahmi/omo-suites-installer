import { describe, it, expect } from 'vitest';
import { Command } from 'commander';
import { registerCompletionCommand } from '../src/commands/completion.ts';

describe('completion command', () => {
  function captureStdout(fn: () => void): string {
    const chunks: string[] = [];
    const origWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk: any, ...args: any[]) => {
      chunks.push(typeof chunk === 'string' ? chunk : chunk.toString());
      return true;
    };
    try {
      fn();
    } finally {
      process.stdout.write = origWrite;
    }
    return chunks.join('');
  }

  function createProgram(): Command {
    const program = new Command();
    program.name('omocs').exitOverride();
    registerCompletionCommand(program);
    return program;
  }

  it('should generate bash completion script', async () => {
    const program = createProgram();
    let output = '';
    const origWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk: any, ...args: any[]) => {
      output += typeof chunk === 'string' ? chunk : chunk.toString();
      return true;
    };
    try {
      await program.parseAsync(['node', 'omocs', 'completion', 'bash']);
    } finally {
      process.stdout.write = origWrite;
    }

    expect(output).toContain('_omocs_completions');
    expect(output).toContain('complete -F _omocs_completions omocs');
    expect(output).toContain('complete -F _omocs_completions omo');
    // Check new commands are present
    expect(output).toContain('compact');
    expect(output).toContain('session');
    expect(output).toContain('worktree');
    expect(output).toContain('template');
    expect(output).toContain('marketplace');
    expect(output).toContain('squad');
    expect(output).toContain('auto');
    expect(output).toContain('config');
    expect(output).toContain('fallback');
    expect(output).toContain('watch');
    expect(output).toContain('bootstrap');
    expect(output).toContain('self-test');
  });

  it('should generate zsh completion script', async () => {
    const program = createProgram();
    let output = '';
    const origWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk: any, ...args: any[]) => {
      output += typeof chunk === 'string' ? chunk : chunk.toString();
      return true;
    };
    try {
      await program.parseAsync(['node', 'omocs', 'completion', 'zsh']);
    } finally {
      process.stdout.write = origWrite;
    }

    expect(output).toContain('#compdef omocs omo');
    expect(output).toContain('compdef _omocs omocs');
    expect(output).toContain('compdef _omocs omo');
    // Check new subcommand arrays
    expect(output).toContain('compact_cmds');
    expect(output).toContain('session_cmds');
    expect(output).toContain('worktree_cmds');
    expect(output).toContain('template_cmds');
    expect(output).toContain('fallback_cmds');
    expect(output).toContain('marketplace_cmds');
    expect(output).toContain('squad_cmds');
    expect(output).toContain('auto_cmds');
    expect(output).toContain('config_cmds');
    expect(output).toContain('watch_cmds');
  });

  it('should generate fish completion script', async () => {
    const program = createProgram();
    let output = '';
    const origWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk: any, ...args: any[]) => {
      output += typeof chunk === 'string' ? chunk : chunk.toString();
      return true;
    };
    try {
      await program.parseAsync(['node', 'omocs', 'completion', 'fish']);
    } finally {
      process.stdout.write = origWrite;
    }

    expect(output).toContain('complete -c omocs -f');
    expect(output).toContain('complete -c omo -w omocs');
    // Check new commands
    expect(output).toContain('compact');
    expect(output).toContain('session');
    expect(output).toContain('worktree');
    expect(output).toContain('template');
    expect(output).toContain('marketplace');
    expect(output).toContain('squad');
    expect(output).toContain('auto');
    expect(output).toContain('config');
    expect(output).toContain('fallback');
    expect(output).toContain('watch');
    expect(output).toContain('bootstrap');
    expect(output).toContain('self-test');
  });

  it('should reject unknown shells', async () => {
    const program = createProgram();
    // Unknown shell should not throw but will print error via fail()
    let output = '';
    const origWrite = process.stdout.write.bind(process.stdout);
    const origLog = console.log;
    const origErr = console.error;
    const logs: string[] = [];
    process.stdout.write = (chunk: any, ...args: any[]) => {
      output += typeof chunk === 'string' ? chunk : chunk.toString();
      return true;
    };
    console.log = (...args: any[]) => { logs.push(args.join(' ')); };
    console.error = (...args: any[]) => { logs.push(args.join(' ')); };
    try {
      await program.parseAsync(['node', 'omocs', 'completion', 'powershell']);
    } finally {
      process.stdout.write = origWrite;
      console.log = origLog;
      console.error = origErr;
    }

    // Should not output a valid completion script
    expect(output).not.toContain('_omocs_completions');
    expect(output).not.toContain('#compdef');
    expect(output).not.toContain('complete -c omocs');
  });

  it('should include all registered top-level commands in bash', async () => {
    const program = createProgram();
    let output = '';
    const origWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk: any, ...args: any[]) => {
      output += typeof chunk === 'string' ? chunk : chunk.toString();
      return true;
    };
    try {
      await program.parseAsync(['node', 'omocs', 'completion', 'bash']);
    } finally {
      process.stdout.write = origWrite;
    }

    const expectedCommands = [
      'init', 'init-deep', 'doctor', 'account', 'profile', 'agent',
      'lsp', 'mcp', 'stats', 'status', 'launchboard', 'export', 'import',
      'diff', 'benchmark', 'plan', 'cost', 'check', 'memory', 'completion',
      'index', 'compact', 'session', 'worktree', 'template', 'bootstrap',
      'fallback', 'watch', 'marketplace', 'squad', 'auto', 'config', 'self-test',
    ];
    for (const cmd of expectedCommands) {
      expect(output).toContain(cmd);
    }
  });

  it('should include subcommand completions for new commands in bash', async () => {
    const program = createProgram();
    let output = '';
    const origWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk: any, ...args: any[]) => {
      output += typeof chunk === 'string' ? chunk : chunk.toString();
      return true;
    };
    try {
      await program.parseAsync(['node', 'omocs', 'completion', 'bash']);
    } finally {
      process.stdout.write = origWrite;
    }

    // Verify subcommand definitions exist for new commands
    expect(output).toContain('compact)');
    expect(output).toContain('session)');
    expect(output).toContain('worktree)');
    expect(output).toContain('template)');
    expect(output).toContain('fallback)');
    expect(output).toContain('watch)');
    expect(output).toContain('marketplace)');
    expect(output).toContain('squad)');
    expect(output).toContain('auto)');
    expect(output).toContain('config)');
  });
});
