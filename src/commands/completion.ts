import { Command } from 'commander';
import chalk from 'chalk';
import { heading, success, fail, info, handleError, infoBox } from '../utils/ui.ts';

// ─── Completion Scripts ──────────────────────────────────────────────

function generateBashCompletion(): string {
  return `# omocs bash completion
# Add to ~/.bashrc: eval "$(omocs completion bash)"
# Or: omocs completion bash >> ~/.bashrc

_omocs_completions() {
    local cur prev commands subcommands
    cur="\${COMP_WORDS[COMP_CWORD]}"
    prev="\${COMP_WORDS[COMP_CWORD-1]}"

    # Top-level commands
    commands="init init-deep doctor account profile agent lsp mcp stats status launchboard export import diff benchmark plan cost check memory completion index help"

    case "\${prev}" in
        omocs|omo)
            COMPREPLY=( $(compgen -W "\${commands}" -- "\${cur}") )
            return 0
            ;;
        profile)
            COMPREPLY=( $(compgen -W "list switch show" -- "\${cur}") )
            return 0
            ;;
        agent)
            COMPREPLY=( $(compgen -W "list show route" -- "\${cur}") )
            return 0
            ;;
        account)
            COMPREPLY=( $(compgen -W "list add remove rotate" -- "\${cur}") )
            return 0
            ;;
        lsp)
            COMPREPLY=( $(compgen -W "list detect install remove status" -- "\${cur}") )
            return 0
            ;;
        mcp)
            COMPREPLY=( $(compgen -W "list install remove status" -- "\${cur}") )
            return 0
            ;;
        memory)
            COMPREPLY=( $(compgen -W "list add search remove" -- "\${cur}") )
            return 0
            ;;
        index)
            COMPREPLY=( $(compgen -W "build show clean" -- "\${cur}") )
            return 0
            ;;
        completion)
            COMPREPLY=( $(compgen -W "bash zsh fish" -- "\${cur}") )
            return 0
            ;;
        stats)
            COMPREPLY=( $(compgen -W "--dashboard --sync --export --db --last" -- "\${cur}") )
            return 0
            ;;
        launchboard|lb)
            COMPREPLY=( $(compgen -W "setup start status" -- "\${cur}") )
            return 0
            ;;
    esac

    COMPREPLY=( $(compgen -W "\${commands}" -- "\${cur}") )
    return 0
}

complete -F _omocs_completions omocs
complete -F _omocs_completions omo
`;
}

function generateZshCompletion(): string {
  return `#compdef omocs omo
# omocs zsh completion
# Add to ~/.zshrc: eval "$(omocs completion zsh)"
# Or: omocs completion zsh >> ~/.zshrc

_omocs() {
    local -a commands memory_cmds index_cmds completion_cmds profile_cmds agent_cmds account_cmds lsp_cmds mcp_cmds lb_cmds

    commands=(
        'init:Initialize OMO Suites configuration'
        'init-deep:Auto-generate hierarchical AGENTS.md files'
        'doctor:Health check — diagnose your OpenCode setup'
        'account:Manage API accounts'
        'profile:Manage model profiles'
        'agent:Manage and route agents'
        'lsp:Manage LSP servers'
        'mcp:Manage MCP servers'
        'stats:Token usage statistics and analytics'
        'status:Show current configuration and provider status'
        'launchboard:Kanban board for OpenCode tasks'
        'export:Export all config to JSON file'
        'import:Import config from JSON file'
        'diff:Compare two profiles side-by-side'
        'benchmark:Compare response time across models'
        'plan:Prometheus-style interview planner'
        'cost:Profile cost calculator'
        'check:Comment quality checker'
        'memory:Workspace memory notes'
        'completion:Generate shell completions'
        'index:Workspace index builder'
        'help:Display help'
    )

    memory_cmds=(
        'list:Show all notes for current workspace'
        'add:Add a timestamped note'
        'search:Fuzzy search notes'
        'remove:Remove a note by ID'
    )

    index_cmds=(
        'build:Build or rebuild workspace index'
        'show:Display index summary'
        'clean:Remove cached index'
    )

    completion_cmds=(
        'bash:Generate bash completions'
        'zsh:Generate zsh completions'
        'fish:Generate fish completions'
    )

    profile_cmds=(
        'list:List available profiles'
        'switch:Switch active profile'
        'show:Show profile details'
    )

    agent_cmds=(
        'list:List available agents'
        'show:Show agent details'
        'route:Route a task to an agent'
    )

    account_cmds=(
        'list:List API accounts'
        'add:Add an API account'
        'remove:Remove an API account'
        'rotate:Rotate API keys'
    )

    lsp_cmds=(
        'list:List LSP servers'
        'detect:Auto-detect needed LSP servers'
        'install:Install an LSP server'
        'remove:Remove an LSP server'
        'status:Check LSP server status'
    )

    mcp_cmds=(
        'list:List MCP servers'
        'install:Install an MCP server'
        'remove:Remove an MCP server'
        'status:Check MCP server health'
    )

    lb_cmds=(
        'setup:Set up Launchboard'
        'start:Start Launchboard'
        'status:Check Launchboard status'
    )

    if (( CURRENT == 2 )); then
        _describe 'command' commands
    elif (( CURRENT == 3 )); then
        case "\${words[2]}" in
            memory) _describe 'subcommand' memory_cmds ;;
            index) _describe 'subcommand' index_cmds ;;
            completion) _describe 'subcommand' completion_cmds ;;
            profile) _describe 'subcommand' profile_cmds ;;
            agent) _describe 'subcommand' agent_cmds ;;
            account) _describe 'subcommand' account_cmds ;;
            lsp) _describe 'subcommand' lsp_cmds ;;
            mcp) _describe 'subcommand' mcp_cmds ;;
            launchboard|lb) _describe 'subcommand' lb_cmds ;;
        esac
    fi
}

compdef _omocs omocs
compdef _omocs omo
`;
}

function generateFishCompletion(): string {
  return `# omocs fish completion
# Save to: ~/.config/fish/completions/omocs.fish
# Or: omocs completion fish > ~/.config/fish/completions/omocs.fish

# Disable file completions
complete -c omocs -f
complete -c omo -f

# Top-level commands
set -l commands init init-deep doctor account profile agent lsp mcp stats status launchboard export import diff benchmark plan cost check memory completion index help

complete -c omocs -n "not __fish_seen_subcommand_from $commands" -a init -d "Initialize OMO Suites configuration"
complete -c omocs -n "not __fish_seen_subcommand_from $commands" -a init-deep -d "Auto-generate hierarchical AGENTS.md"
complete -c omocs -n "not __fish_seen_subcommand_from $commands" -a doctor -d "Health check — diagnose setup"
complete -c omocs -n "not __fish_seen_subcommand_from $commands" -a account -d "Manage API accounts"
complete -c omocs -n "not __fish_seen_subcommand_from $commands" -a profile -d "Manage model profiles"
complete -c omocs -n "not __fish_seen_subcommand_from $commands" -a agent -d "Manage and route agents"
complete -c omocs -n "not __fish_seen_subcommand_from $commands" -a lsp -d "Manage LSP servers"
complete -c omocs -n "not __fish_seen_subcommand_from $commands" -a mcp -d "Manage MCP servers"
complete -c omocs -n "not __fish_seen_subcommand_from $commands" -a stats -d "Token usage statistics"
complete -c omocs -n "not __fish_seen_subcommand_from $commands" -a status -d "Show current config status"
complete -c omocs -n "not __fish_seen_subcommand_from $commands" -a launchboard -d "Kanban board for tasks"
complete -c omocs -n "not __fish_seen_subcommand_from $commands" -a export -d "Export all config"
complete -c omocs -n "not __fish_seen_subcommand_from $commands" -a import -d "Import config"
complete -c omocs -n "not __fish_seen_subcommand_from $commands" -a diff -d "Compare profiles"
complete -c omocs -n "not __fish_seen_subcommand_from $commands" -a benchmark -d "Benchmark models"
complete -c omocs -n "not __fish_seen_subcommand_from $commands" -a plan -d "Structured planning"
complete -c omocs -n "not __fish_seen_subcommand_from $commands" -a cost -d "Profile cost calculator"
complete -c omocs -n "not __fish_seen_subcommand_from $commands" -a check -d "Code comment checker"
complete -c omocs -n "not __fish_seen_subcommand_from $commands" -a memory -d "Workspace memory notes"
complete -c omocs -n "not __fish_seen_subcommand_from $commands" -a completion -d "Shell completions"
complete -c omocs -n "not __fish_seen_subcommand_from $commands" -a index -d "Workspace index builder"

# Memory subcommands
complete -c omocs -n "__fish_seen_subcommand_from memory" -a list -d "Show all notes"
complete -c omocs -n "__fish_seen_subcommand_from memory" -a add -d "Add a note"
complete -c omocs -n "__fish_seen_subcommand_from memory" -a search -d "Search notes"
complete -c omocs -n "__fish_seen_subcommand_from memory" -a remove -d "Remove a note"

# Index subcommands
complete -c omocs -n "__fish_seen_subcommand_from index" -a build -d "Build workspace index"
complete -c omocs -n "__fish_seen_subcommand_from index" -a show -d "Show index summary"
complete -c omocs -n "__fish_seen_subcommand_from index" -a clean -d "Remove cached index"

# Completion subcommands
complete -c omocs -n "__fish_seen_subcommand_from completion" -a bash -d "Generate bash completions"
complete -c omocs -n "__fish_seen_subcommand_from completion" -a zsh -d "Generate zsh completions"
complete -c omocs -n "__fish_seen_subcommand_from completion" -a fish -d "Generate fish completions"

# Profile subcommands
complete -c omocs -n "__fish_seen_subcommand_from profile" -a list -d "List profiles"
complete -c omocs -n "__fish_seen_subcommand_from profile" -a switch -d "Switch profile"
complete -c omocs -n "__fish_seen_subcommand_from profile" -a show -d "Show profile"

# Agent subcommands
complete -c omocs -n "__fish_seen_subcommand_from agent" -a list -d "List agents"
complete -c omocs -n "__fish_seen_subcommand_from agent" -a show -d "Show agent"
complete -c omocs -n "__fish_seen_subcommand_from agent" -a route -d "Route task"

# Account subcommands
complete -c omocs -n "__fish_seen_subcommand_from account" -a list -d "List accounts"
complete -c omocs -n "__fish_seen_subcommand_from account" -a add -d "Add account"
complete -c omocs -n "__fish_seen_subcommand_from account" -a remove -d "Remove account"
complete -c omocs -n "__fish_seen_subcommand_from account" -a rotate -d "Rotate keys"

# LSP subcommands
complete -c omocs -n "__fish_seen_subcommand_from lsp" -a "list detect install remove status" -d "LSP operations"

# MCP subcommands
complete -c omocs -n "__fish_seen_subcommand_from mcp" -a "list install remove status" -d "MCP operations"

# Launchboard subcommands
complete -c omocs -n "__fish_seen_subcommand_from launchboard" -a "setup start status" -d "Launchboard operations"

# Also register for 'omo' alias
complete -c omo -w omocs
`;
}

// ─── Register Command ────────────────────────────────────────────────
export function registerCompletionCommand(program: Command): void {
  program
    .command('completion <shell>')
    .description('Generate shell completion scripts (bash, zsh, fish)')
    .action((shell: string) => {
      try {
        const validShells = ['bash', 'zsh', 'fish'];
        const shellLower = shell.toLowerCase();

        if (!validShells.includes(shellLower)) {
          fail(`Unknown shell: ${shell}`);
          info(`Supported shells: ${validShells.join(', ')}`);
          console.log('');
          infoBox('Usage', [
            `${chalk.cyan('omocs completion bash')} >> ~/.bashrc`,
            `${chalk.cyan('omocs completion zsh')}  >> ~/.zshrc`,
            `${chalk.cyan('omocs completion fish')} > ~/.config/fish/completions/omocs.fish`,
          ].join('\n'));
          return;
        }

        let script: string;
        switch (shellLower) {
          case 'bash':
            script = generateBashCompletion();
            break;
          case 'zsh':
            script = generateZshCompletion();
            break;
          case 'fish':
            script = generateFishCompletion();
            break;
          default:
            script = '';
        }

        // Output script to stdout for piping
        process.stdout.write(script);
      } catch (error) {
        handleError(error);
      }
    });
}
