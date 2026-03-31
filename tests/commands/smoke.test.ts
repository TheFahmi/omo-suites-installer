import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';

/**
 * Command registration smoke tests.
 * Each test verifies that a command register function doesn't throw
 * and properly attaches a command to the program.
 */

// Helper to suppress console output
function silenceConsole() {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
}

describe('commands smoke tests', () => {
  let program: Command;

  beforeEach(() => {
    program = new Command();
    program.name('omocs').exitOverride();
    silenceConsole();
  });

  // ─── config ──────────────────────────────────────────────────────
  it('should register config command', async () => {
    const { registerConfigCommand } = await import('../../src/commands/config.ts');
    registerConfigCommand(program);
    const cmd = program.commands.find(c => c.name() === 'config');
    expect(cmd).toBeDefined();
    expect(cmd!.commands.length).toBeGreaterThan(0); // has subcommands
  });

  // ─── completion ──────────────────────────────────────────────────
  it('should register completion command', async () => {
    const { registerCompletionCommand } = await import('../../src/commands/completion.ts');
    registerCompletionCommand(program);
    const cmd = program.commands.find(c => c.name() === 'completion');
    expect(cmd).toBeDefined();
  });

  // ─── status ──────────────────────────────────────────────────────
  it('should register status command', async () => {
    const { registerStatusCommand } = await import('../../src/commands/status.ts');
    registerStatusCommand(program);
    const cmd = program.commands.find(c => c.name() === 'status');
    expect(cmd).toBeDefined();
  });

  // ─── doctor ──────────────────────────────────────────────────────
  it('should register doctor command', async () => {
    const { registerDoctorCommand } = await import('../../src/commands/doctor.ts');
    registerDoctorCommand(program);
    const cmd = program.commands.find(c => c.name() === 'doctor');
    expect(cmd).toBeDefined();
  });

  // ─── profile ─────────────────────────────────────────────────────
  it('should register profile command', async () => {
    const { registerProfileCommand } = await import('../../src/commands/profile.ts');
    registerProfileCommand(program);
    const cmd = program.commands.find(c => c.name() === 'profile');
    expect(cmd).toBeDefined();
  });

  // ─── agent ───────────────────────────────────────────────────────
  it('should register agent command', async () => {
    const { registerAgentCommand } = await import('../../src/commands/agent.ts');
    registerAgentCommand(program);
    const cmd = program.commands.find(c => c.name() === 'agent');
    expect(cmd).toBeDefined();
  });

  // ─── account ─────────────────────────────────────────────────────
  it('should register account command', async () => {
    const { registerAccountCommand } = await import('../../src/commands/account.ts');
    registerAccountCommand(program);
    const cmd = program.commands.find(c => c.name() === 'account');
    expect(cmd).toBeDefined();
  });

  // ─── init ────────────────────────────────────────────────────────
  it('should register init command', async () => {
    const { registerInitCommand } = await import('../../src/commands/init.ts');
    registerInitCommand(program);
    const cmd = program.commands.find(c => c.name() === 'init');
    expect(cmd).toBeDefined();
  });

  // ─── stats ───────────────────────────────────────────────────────
  it('should register stats command', async () => {
    const { registerStatsCommand } = await import('../../src/commands/stats.ts');
    registerStatsCommand(program);
    const cmd = program.commands.find(c => c.name() === 'stats');
    expect(cmd).toBeDefined();
  });

  // ─── lsp ─────────────────────────────────────────────────────────
  it('should register lsp command', async () => {
    const { registerLspCommand } = await import('../../src/commands/lsp.ts');
    registerLspCommand(program);
    const cmd = program.commands.find(c => c.name() === 'lsp');
    expect(cmd).toBeDefined();
  });

  // ─── mcp ─────────────────────────────────────────────────────────
  it('should register mcp command', async () => {
    const { registerMcpCommand } = await import('../../src/commands/mcp.ts');
    registerMcpCommand(program);
    const cmd = program.commands.find(c => c.name() === 'mcp');
    expect(cmd).toBeDefined();
  });

  // ─── compact ─────────────────────────────────────────────────────
  it('should register compact command', async () => {
    const { registerCompactCommand } = await import('../../src/commands/compact.ts');
    registerCompactCommand(program);
    const cmd = program.commands.find(c => c.name() === 'compact');
    expect(cmd).toBeDefined();
  });

  // ─── session ─────────────────────────────────────────────────────
  it('should register session command', async () => {
    const { registerSessionCommand } = await import('../../src/commands/session.ts');
    registerSessionCommand(program);
    const cmd = program.commands.find(c => c.name() === 'session');
    expect(cmd).toBeDefined();
  });

  // ─── worktree ────────────────────────────────────────────────────
  it('should register worktree command', async () => {
    const { registerWorktreeCommand } = await import('../../src/commands/worktree.ts');
    registerWorktreeCommand(program);
    const cmd = program.commands.find(c => c.name() === 'worktree');
    expect(cmd).toBeDefined();
  });

  // ─── template ────────────────────────────────────────────────────
  it('should register template command', async () => {
    const { registerTemplateCommand } = await import('../../src/commands/template.ts');
    registerTemplateCommand(program);
    const cmd = program.commands.find(c => c.name() === 'template');
    expect(cmd).toBeDefined();
  });

  // ─── bootstrap ───────────────────────────────────────────────────
  it('should register bootstrap command', async () => {
    const { registerBootstrapCommand } = await import('../../src/commands/bootstrap.ts');
    registerBootstrapCommand(program);
    const cmd = program.commands.find(c => c.name() === 'bootstrap');
    expect(cmd).toBeDefined();
  });

  // ─── fallback ────────────────────────────────────────────────────
  it('should register fallback command', async () => {
    const { registerFallbackCommand } = await import('../../src/commands/fallback.ts');
    registerFallbackCommand(program);
    const cmd = program.commands.find(c => c.name() === 'fallback');
    expect(cmd).toBeDefined();
  });

  // ─── watch ───────────────────────────────────────────────────────
  it('should register watch command', async () => {
    const { registerWatchCommand } = await import('../../src/commands/watch.ts');
    registerWatchCommand(program);
    const cmd = program.commands.find(c => c.name() === 'watch');
    expect(cmd).toBeDefined();
  });

  // ─── marketplace ─────────────────────────────────────────────────
  it('should register marketplace command', async () => {
    const { registerMarketplaceCommand } = await import('../../src/commands/marketplace.ts');
    registerMarketplaceCommand(program);
    const cmd = program.commands.find(c => c.name() === 'marketplace');
    expect(cmd).toBeDefined();
  });

  // ─── squad ───────────────────────────────────────────────────────
  it('should register squad command', async () => {
    const { registerSquadCommand } = await import('../../src/commands/squad.ts');
    registerSquadCommand(program);
    const cmd = program.commands.find(c => c.name() === 'squad');
    expect(cmd).toBeDefined();
  });

  // ─── auto ────────────────────────────────────────────────────────
  it('should register auto command', async () => {
    const { registerAutoCommand } = await import('../../src/commands/auto.ts');
    registerAutoCommand(program);
    const cmd = program.commands.find(c => c.name() === 'auto');
    expect(cmd).toBeDefined();
  });

  // ─── export / import ─────────────────────────────────────────────
  it('should register export and import commands', async () => {
    const { registerExportCommand, registerImportCommand } = await import('../../src/commands/export-import.ts');
    registerExportCommand(program);
    registerImportCommand(program);
    expect(program.commands.find(c => c.name() === 'export')).toBeDefined();
    expect(program.commands.find(c => c.name() === 'import')).toBeDefined();
  });

  // ─── diff ────────────────────────────────────────────────────────
  it('should register diff command', async () => {
    const { registerDiffCommand } = await import('../../src/commands/diff.ts');
    registerDiffCommand(program);
    const cmd = program.commands.find(c => c.name() === 'diff');
    expect(cmd).toBeDefined();
  });

  // ─── benchmark ───────────────────────────────────────────────────
  it('should register benchmark command', async () => {
    const { registerBenchmarkCommand } = await import('../../src/commands/benchmark.ts');
    registerBenchmarkCommand(program);
    const cmd = program.commands.find(c => c.name() === 'benchmark');
    expect(cmd).toBeDefined();
  });

  // ─── plan ────────────────────────────────────────────────────────
  it('should register plan command', async () => {
    const { registerPlanCommand } = await import('../../src/commands/plan.ts');
    registerPlanCommand(program);
    const cmd = program.commands.find(c => c.name() === 'plan');
    expect(cmd).toBeDefined();
  });

  // ─── cost ────────────────────────────────────────────────────────
  it('should register cost command', async () => {
    const { registerCostCommand } = await import('../../src/commands/cost.ts');
    registerCostCommand(program);
    const cmd = program.commands.find(c => c.name() === 'cost');
    expect(cmd).toBeDefined();
  });

  // ─── check ───────────────────────────────────────────────────────
  it('should register check command', async () => {
    const { registerCheckCommand } = await import('../../src/commands/check.ts');
    registerCheckCommand(program);
    const cmd = program.commands.find(c => c.name() === 'check');
    expect(cmd).toBeDefined();
  });

  // ─── memory ──────────────────────────────────────────────────────
  it('should register memory command', async () => {
    const { registerMemoryCommand } = await import('../../src/commands/memory.ts');
    registerMemoryCommand(program);
    const cmd = program.commands.find(c => c.name() === 'memory');
    expect(cmd).toBeDefined();
  });

  // ─── index ───────────────────────────────────────────────────────
  it('should register index command', async () => {
    const { registerIndexCommand } = await import('../../src/commands/index-cmd.ts');
    registerIndexCommand(program);
    const cmd = program.commands.find(c => c.name() === 'index');
    expect(cmd).toBeDefined();
  });

  // ─── init-deep ───────────────────────────────────────────────────
  it('should register init-deep command', async () => {
    const { registerInitDeepCommand } = await import('../../src/commands/init-deep.ts');
    registerInitDeepCommand(program);
    const cmd = program.commands.find(c => c.name() === 'init-deep');
    expect(cmd).toBeDefined();
  });

  // ─── self-test ───────────────────────────────────────────────────
  it('should register self-test command', async () => {
    const { registerTestSmokeCommand } = await import('../../src/commands/test-smoke.ts');
    registerTestSmokeCommand(program);
    const cmd = program.commands.find(c => c.name() === 'self-test');
    expect(cmd).toBeDefined();
  });

  // ─── launchboard ─────────────────────────────────────────────────
  it('should register launchboard command', async () => {
    const { registerLaunchboardCommand } = await import('../../src/commands/launchboard.ts');
    registerLaunchboardCommand(program);
    const cmd = program.commands.find(c => c.name() === 'launchboard');
    expect(cmd).toBeDefined();
  });

  // ─── All commands count ──────────────────────────────────────────
  it('should register all expected commands from index.ts', async () => {
    // Import the program from index which registers all commands
    const { program: fullProgram } = await import('../../src/index.ts');
    const names = fullProgram.commands.map((c: Command) => c.name());

    const expectedCommands = [
      'init', 'init-deep', 'doctor', 'account', 'profile', 'agent',
      'lsp', 'mcp', 'stats', 'status', 'launchboard', 'export', 'import',
      'diff', 'benchmark', 'plan', 'cost', 'check', 'memory', 'completion',
      'index', 'compact', 'session', 'worktree', 'template', 'bootstrap',
      'fallback', 'watch', 'marketplace', 'squad', 'auto', 'config', 'self-test',
    ];

    for (const cmd of expectedCommands) {
      expect(names).toContain(cmd);
    }
  });
});
