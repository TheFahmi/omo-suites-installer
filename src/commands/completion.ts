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
    commands="init init-deep doctor account profile agent lsp mcp stats status launchboard export import diff benchmark plan cost check memory completion index compact session worktree template bootstrap fallback watch marketplace squad auto config self-test help"

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
        compact)
            COMPREPLY=( $(compgen -W "config memory index stats all" -- "\${cur}") )
            return 0
            ;;
        session)
            COMPREPLY=( $(compgen -W "list search show diff" -- "\${cur}") )
            return 0
            ;;
        worktree)
            COMPREPLY=( $(compgen -W "list create remove prune" -- "\${cur}") )
            return 0
            ;;
        template)
            COMPREPLY=( $(compgen -W "save list load delete export" -- "\${cur}") )
            return 0
            ;;
        fallback)
            COMPREPLY=( $(compgen -W "show add remove" -- "\${cur}") )
            return 0
            ;;
        watch)
            COMPREPLY=( $(compgen -W "start generate" -- "\${cur}") )
            return 0
            ;;
        marketplace)
            COMPREPLY=( $(compgen -W "search install uninstall installed publish" -- "\${cur}") )
            return 0
            ;;
        squad)
            COMPREPLY=( $(compgen -W "launch status kill clean" -- "\${cur}") )
            return 0
            ;;
        auto)
            COMPREPLY=( $(compgen -W "run reset suppress status" -- "\${cur}") )
            return 0
            ;;
        config)
            COMPREPLY=( $(compgen -W "validate telemetry" -- "\${cur}") )
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
    local -a commands
    local -a memory_cmds index_cmds completion_cmds profile_cmds agent_cmds account_cmds
    local -a lsp_cmds mcp_cmds lb_cmds compact_cmds session_cmds worktree_cmds
    local -a template_cmds fallback_cmds watch_cmds marketplace_cmds squad_cmds auto_cmds config_cmds

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
        'compact:Clean up config, memory, indexes, and stats data'
        'session:Browse, search, and manage OpenCode sessions'
        'worktree:Git worktree management for task isolation'
        'template:Save, load, and share config templates'
        'bootstrap:Scaffold a new OMO Suites workspace'
        'fallback:View and edit model fallback chains'
        'watch:Watch project structure and auto-regenerate AGENTS.md'
        'marketplace:Browse, install, and manage community plugins'
        'squad:Launch and manage parallel OpenCode agent instances'
        'auto:Manage automatic background checks'
        'config:Manage OMOCS configuration'
        'self-test:Run a light smoke test to check core integration'
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

    compact_cmds=(
        'config:Scan and clean stale config entries'
        'memory:Trim old workspace memory notes'
        'index:Clean up orphaned workspace indexes'
        'stats:Trim old stats data'
        'all:Run all compact operations'
    )

    session_cmds=(
        'list:List all OpenCode sessions'
        'search:Search session content across all sessions'
        'show:Show messages from a session'
        'diff:Show git diff for a session workspace'
    )

    worktree_cmds=(
        'list:List all git worktrees'
        'create:Create a new worktree for isolated task work'
        'remove:Remove a worktree'
        'prune:Clean up stale worktree references'
    )

    template_cmds=(
        'save:Save current workspace config as a named template'
        'list:List saved templates'
        'load:Load a template into current workspace'
        'delete:Delete a saved template'
        'export:Export a template as a shareable JSON file'
    )

    fallback_cmds=(
        'show:Display current model fallback configuration'
        'add:Add a fallback to a model'
        'remove:Remove a fallback from a model'
    )

    watch_cmds=(
        'start:Start watching for file structure changes'
        'generate:Generate AGENTS.md once (no watching)'
    )

    marketplace_cmds=(
        'search:Search the plugin registry'
        'install:Install a plugin from the registry'
        'uninstall:Remove an installed plugin'
        'installed:List installed plugins'
        'publish:Package a plugin for sharing'
    )

    squad_cmds=(
        'launch:Launch a new OpenCode instance with a task'
        'status:Show all running agents'
        'kill:Kill a running agent'
        'clean:Remove all completed/dead agents from the list'
    )

    auto_cmds=(
        'run:Run all auto checks now'
        'reset:Reset auto state (force re-run all checks)'
        'suppress:Suppress a specific auto warning'
        'status:Show auto check state'
    )

    config_cmds=(
        'validate:Validate the syntax and structure of the config file'
        'telemetry:Manage telemetry settings'
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
            compact) _describe 'subcommand' compact_cmds ;;
            session) _describe 'subcommand' session_cmds ;;
            worktree) _describe 'subcommand' worktree_cmds ;;
            template) _describe 'subcommand' template_cmds ;;
            fallback) _describe 'subcommand' fallback_cmds ;;
            watch) _describe 'subcommand' watch_cmds ;;
            marketplace) _describe 'subcommand' marketplace_cmds ;;
            squad) _describe 'subcommand' squad_cmds ;;
            auto) _describe 'subcommand' auto_cmds ;;
            config) _describe 'subcommand' config_cmds ;;
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
set -l commands init init-deep doctor account profile agent lsp mcp stats status launchboard export import diff benchmark plan cost check memory completion index compact session worktree template bootstrap fallback watch marketplace squad auto config self-test help

complete -c omocs -n "not __fish_seen_subcommand_from \$commands" -a init -d "Initialize OMO Suites configuration"
complete -c omocs -n "not __fish_seen_subcommand_from \$commands" -a init-deep -d "Auto-generate hierarchical AGENTS.md"
complete -c omocs -n "not __fish_seen_subcommand_from \$commands" -a doctor -d "Health check — diagnose setup"
complete -c omocs -n "not __fish_seen_subcommand_from \$commands" -a account -d "Manage API accounts"
complete -c omocs -n "not __fish_seen_subcommand_from \$commands" -a profile -d "Manage model profiles"
complete -c omocs -n "not __fish_seen_subcommand_from \$commands" -a agent -d "Manage and route agents"
complete -c omocs -n "not __fish_seen_subcommand_from \$commands" -a lsp -d "Manage LSP servers"
complete -c omocs -n "not __fish_seen_subcommand_from \$commands" -a mcp -d "Manage MCP servers"
complete -c omocs -n "not __fish_seen_subcommand_from \$commands" -a stats -d "Token usage statistics"
complete -c omocs -n "not __fish_seen_subcommand_from \$commands" -a status -d "Show current config status"
complete -c omocs -n "not __fish_seen_subcommand_from \$commands" -a launchboard -d "Kanban board for tasks"
complete -c omocs -n "not __fish_seen_subcommand_from \$commands" -a export -d "Export all config"
complete -c omocs -n "not __fish_seen_subcommand_from \$commands" -a import -d "Import config"
complete -c omocs -n "not __fish_seen_subcommand_from \$commands" -a diff -d "Compare profiles"
complete -c omocs -n "not __fish_seen_subcommand_from \$commands" -a benchmark -d "Benchmark models"
complete -c omocs -n "not __fish_seen_subcommand_from \$commands" -a plan -d "Structured planning"
complete -c omocs -n "not __fish_seen_subcommand_from \$commands" -a cost -d "Profile cost calculator"
complete -c omocs -n "not __fish_seen_subcommand_from \$commands" -a check -d "Code comment checker"
complete -c omocs -n "not __fish_seen_subcommand_from \$commands" -a memory -d "Workspace memory notes"
complete -c omocs -n "not __fish_seen_subcommand_from \$commands" -a completion -d "Shell completions"
complete -c omocs -n "not __fish_seen_subcommand_from \$commands" -a index -d "Workspace index builder"
complete -c omocs -n "not __fish_seen_subcommand_from \$commands" -a compact -d "Clean up config, memory, indexes, stats"
complete -c omocs -n "not __fish_seen_subcommand_from \$commands" -a session -d "Browse and manage OpenCode sessions"
complete -c omocs -n "not __fish_seen_subcommand_from \$commands" -a worktree -d "Git worktree management"
complete -c omocs -n "not __fish_seen_subcommand_from \$commands" -a template -d "Save, load, share config templates"
complete -c omocs -n "not __fish_seen_subcommand_from \$commands" -a bootstrap -d "Scaffold a new workspace"
complete -c omocs -n "not __fish_seen_subcommand_from \$commands" -a fallback -d "View and edit model fallback chains"
complete -c omocs -n "not __fish_seen_subcommand_from \$commands" -a watch -d "Watch and auto-regenerate AGENTS.md"
complete -c omocs -n "not __fish_seen_subcommand_from \$commands" -a marketplace -d "Browse and manage community plugins"
complete -c omocs -n "not __fish_seen_subcommand_from \$commands" -a squad -d "Launch parallel OpenCode agents"
complete -c omocs -n "not __fish_seen_subcommand_from \$commands" -a auto -d "Manage automatic background checks"
complete -c omocs -n "not __fish_seen_subcommand_from \$commands" -a config -d "Manage OMOCS configuration"
complete -c omocs -n "not __fish_seen_subcommand_from \$commands" -a self-test -d "Run smoke test for core integration"

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
complete -c omocs -n "__fish_seen_subcommand_from lsp" -a list -d "List LSP servers"
complete -c omocs -n "__fish_seen_subcommand_from lsp" -a detect -d "Auto-detect LSP servers"
complete -c omocs -n "__fish_seen_subcommand_from lsp" -a install -d "Install LSP server"
complete -c omocs -n "__fish_seen_subcommand_from lsp" -a remove -d "Remove LSP server"
complete -c omocs -n "__fish_seen_subcommand_from lsp" -a status -d "Check LSP status"

# MCP subcommands
complete -c omocs -n "__fish_seen_subcommand_from mcp" -a list -d "List MCP servers"
complete -c omocs -n "__fish_seen_subcommand_from mcp" -a install -d "Install MCP server"
complete -c omocs -n "__fish_seen_subcommand_from mcp" -a remove -d "Remove MCP server"
complete -c omocs -n "__fish_seen_subcommand_from mcp" -a status -d "Check MCP health"

# Launchboard subcommands
complete -c omocs -n "__fish_seen_subcommand_from launchboard" -a setup -d "Set up Launchboard"
complete -c omocs -n "__fish_seen_subcommand_from launchboard" -a start -d "Start Launchboard"
complete -c omocs -n "__fish_seen_subcommand_from launchboard" -a status -d "Check Launchboard status"

# Compact subcommands
complete -c omocs -n "__fish_seen_subcommand_from compact" -a config -d "Clean stale config entries"
complete -c omocs -n "__fish_seen_subcommand_from compact" -a memory -d "Trim old memory notes"
complete -c omocs -n "__fish_seen_subcommand_from compact" -a index -d "Clean orphaned indexes"
complete -c omocs -n "__fish_seen_subcommand_from compact" -a stats -d "Trim old stats data"
complete -c omocs -n "__fish_seen_subcommand_from compact" -a all -d "Run all compact operations"

# Session subcommands
complete -c omocs -n "__fish_seen_subcommand_from session" -a list -d "List all sessions"
complete -c omocs -n "__fish_seen_subcommand_from session" -a search -d "Search session content"
complete -c omocs -n "__fish_seen_subcommand_from session" -a show -d "Show session messages"
complete -c omocs -n "__fish_seen_subcommand_from session" -a diff -d "Show session git diff"

# Worktree subcommands
complete -c omocs -n "__fish_seen_subcommand_from worktree" -a list -d "List worktrees"
complete -c omocs -n "__fish_seen_subcommand_from worktree" -a create -d "Create a worktree"
complete -c omocs -n "__fish_seen_subcommand_from worktree" -a remove -d "Remove a worktree"
complete -c omocs -n "__fish_seen_subcommand_from worktree" -a prune -d "Clean up stale worktrees"

# Template subcommands
complete -c omocs -n "__fish_seen_subcommand_from template" -a save -d "Save config as template"
complete -c omocs -n "__fish_seen_subcommand_from template" -a list -d "List saved templates"
complete -c omocs -n "__fish_seen_subcommand_from template" -a load -d "Load a template"
complete -c omocs -n "__fish_seen_subcommand_from template" -a delete -d "Delete a template"
complete -c omocs -n "__fish_seen_subcommand_from template" -a export -d "Export template as JSON"

# Fallback subcommands
complete -c omocs -n "__fish_seen_subcommand_from fallback" -a show -d "Show fallback config"
complete -c omocs -n "__fish_seen_subcommand_from fallback" -a add -d "Add a fallback"
complete -c omocs -n "__fish_seen_subcommand_from fallback" -a remove -d "Remove a fallback"

# Watch subcommands
complete -c omocs -n "__fish_seen_subcommand_from watch" -a start -d "Start watching"
complete -c omocs -n "__fish_seen_subcommand_from watch" -a generate -d "Generate AGENTS.md once"

# Marketplace subcommands
complete -c omocs -n "__fish_seen_subcommand_from marketplace" -a search -d "Search plugins"
complete -c omocs -n "__fish_seen_subcommand_from marketplace" -a install -d "Install a plugin"
complete -c omocs -n "__fish_seen_subcommand_from marketplace" -a uninstall -d "Remove a plugin"
complete -c omocs -n "__fish_seen_subcommand_from marketplace" -a installed -d "List installed plugins"
complete -c omocs -n "__fish_seen_subcommand_from marketplace" -a publish -d "Package a plugin"

# Squad subcommands
complete -c omocs -n "__fish_seen_subcommand_from squad" -a launch -d "Launch agent with task"
complete -c omocs -n "__fish_seen_subcommand_from squad" -a status -d "Show running agents"
complete -c omocs -n "__fish_seen_subcommand_from squad" -a kill -d "Kill an agent"
complete -c omocs -n "__fish_seen_subcommand_from squad" -a clean -d "Remove completed agents"

# Auto subcommands
complete -c omocs -n "__fish_seen_subcommand_from auto" -a run -d "Run all auto checks"
complete -c omocs -n "__fish_seen_subcommand_from auto" -a reset -d "Reset auto state"
complete -c omocs -n "__fish_seen_subcommand_from auto" -a suppress -d "Suppress a warning"
complete -c omocs -n "__fish_seen_subcommand_from auto" -a status -d "Show auto check state"

# Config subcommands
complete -c omocs -n "__fish_seen_subcommand_from config" -a validate -d "Validate config file"
complete -c omocs -n "__fish_seen_subcommand_from config" -a telemetry -d "Manage telemetry"

# Also register for 'omo' alias
complete -c omo -w omocs
`;
}

// ─── Register Command ────────────────────────────────────────────────
export function registerCompletionCommand(program: Command): void {
  program
    .command('completion <shell>')
    .description('Generate shell completion scripts (bash, zsh, fish)')
    .addHelpText('after', `
Installation:
  ${chalk.cyan('omocs completion bash')} >> ~/.bashrc       # Bash
  ${chalk.cyan('omocs completion bash')} >> ~/.bash_profile  # Bash (macOS)
  ${chalk.cyan('eval "$(omocs completion bash)"')}           # Bash (current session)
  ${chalk.cyan('omocs completion zsh')}  >> ~/.zshrc         # Zsh
  ${chalk.cyan('eval "$(omocs completion zsh)"')}            # Zsh (current session)
  ${chalk.cyan('omocs completion fish')} > ~/.config/fish/completions/omocs.fish  # Fish
`)
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
