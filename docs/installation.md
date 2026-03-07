# Installation

## For Humans

### Option 1: Install via npm (Recommended)

```bash
npm install -g omo-suites
```

This gives you the `omocs` CLI command globally. Requires Node.js >= 18.

Then run the setup wizard:
```bash
omocs init
```

### Option 2: Install via Bun

```bash
bun add -g omo-suites
```

### Option 3: Install from source

Paste this into your LLM agent session:

```
Install and configure OMO Suites by following the instructions here:
https://raw.githubusercontent.com/TheFahmi/omo-suites-installer/main/docs/installation.md
```

**Alternative, Not recommended, do this by yourself**

```bash
# One-liner (bash/zsh)
curl -fsSL https://raw.githubusercontent.com/TheFahmi/omo-suites-installer/main/install.sh | bash

# Or manually
git clone https://github.com/TheFahmi/omo-suites-installer.git ~/.omocs
cd ~/.omocs && bun install && bun run build

# Then run the setup wizard (recommended — handles everything)
omocs init
```

> **Note**: Source install requires [Bun](https://bun.sh) runtime. The installer handles that if you don't have it.
>
> **New in v1.5.0**: `omocs init` is now the recommended setup method. It auto-installs oh-my-opencode, registers plugins to `opencode.json`, and optionally sets up Launchboard — all in one command.

## For LLM Agents

> **IMPORTANT: Use `curl` to fetch this file, NOT WebFetch.** WebFetch summarizes content and loses critical details. Always use:
>
> ```bash
> curl -fsSL https://raw.githubusercontent.com/TheFahmi/omo-suites-installer/main/docs/installation.md
> ```

If you're an LLM Agent helping set up OMO Suites — welcome! You're about to install the most complete open-source config toolkit for OpenCode. Follow these steps:

### Step 0: Ask user about their setup

Ask the user these questions:

1. **Which AI providers do you have?**
   - Claude (Anthropic) — Pro/Max subscription or API key?
   - OpenAI/ChatGPT — Plus subscription or API key?
   - Google Gemini — API access?
   - Kimi — subscription?
   - GitHub Copilot — subscription?
   - Ollama/local models — installed?

2. **Do you have oh-my-opencode installed?**
   - If **yes** → `omocs init` will detect it automatically
   - If **no** → `omocs init` will install it for you

3. **What's your priority?**
   - Maximum quality (use best models)
   - Balanced cost/quality
   - Minimum cost
   - Fully free/local

### Step 1: Install Bun (if not installed)

```bash
if command -v bun &> /dev/null; then
    echo "Bun $(bun --version) is installed"
else
    echo "Installing Bun..."
    curl -fsSL https://bun.sh/install | bash
fi
```

### Step 2: Install OpenCode (if not installed)

```bash
if command -v opencode &> /dev/null; then
    echo "OpenCode $(opencode --version) is installed"
else
    echo "OpenCode is not installed. Please install it first."
    echo "Ref: https://opencode.ai/docs"
fi
```

### Step 3: Clone and install OMO Suites

```bash
git clone https://github.com/TheFahmi/omo-suites-installer.git ~/.omocs
cd ~/.omocs
bun install
bun run build
```

### Step 4: Run `omocs init` (Recommended — One Command Setup)

```bash
omocs init
```

**`omocs init` handles everything automatically:**
- ✅ Checks OpenCode installation
- ✅ Installs oh-my-opencode (if not already installed)
- ✅ Registers both `oh-my-opencode` and `omocs` as plugins in `opencode.json`
- ✅ Optionally sets up Launchboard (AI Kanban board)
- ✅ Sets master password for API key encryption
- ✅ **Auth plugins** — authenticate via OAuth login (Antigravity, OpenAI Codex) instead of pasting API keys
- ✅ Configures manual API providers and keys (for providers not covered by auth plugins)
- ✅ Selects and applies a profile
- ✅ Detects project stack and suggests LSP servers
- ✅ Configures MCP tools

> **New in v1.6.0**: Step 6 now offers **auth plugin** login (recommended) before manual API keys. Auth plugins like `opencode-antigravity-auth` and `opencode-openai-codex-auth` let you authenticate via OAuth/CLI login instead of pasting raw API keys. Manual keys still work as a fallback.

The wizard is interactive and guides you through each step. **This is the recommended setup method** — no need to manually edit `opencode.json` or install oh-my-opencode separately.

> **For non-interactive / CI environments**, see the [Manual Setup](#manual-setup-advanced) section below.

### Step 5: Choose a profile

`omocs init` will prompt you to choose a profile during setup. If you want to change it later, use:

Based on user's providers, recommend a profile:

| User Has | Recommended Profile |
|----------|-------------------|
| Claude + OpenAI + Gemini | `ultra-mixed` |
| Claude only (Pro/Max) | `opus-4.6-all` or `opus-4.6-lead` |
| Claude only (Sonnet) | `sonnet-4.6-all` |
| OpenAI only | `codex-5.3-all` |
| OpenAI + Gemini | `codex-5.3-gemini` |
| OpenAI + Claude | `codex-5.3-sonnet` |
| Gemini only | `gemini-3-all` |
| Kimi only | `kimi-k2.5-all` |
| Budget-conscious | `budget-mixed` |
| No API keys / Ollama | `local-free` |

Apply profile via CLI:
```bash
omocs profile use <profile-name>
```

Or via plugin tool (inside OpenCode session):
```
Use omocs_profile_switch to switch to ultra-mixed profile
```

### Step 6: Verify setup

```bash
omocs doctor
```

This runs a 10-point health check:
- ✅ Bun runtime
- ✅ OpenCode installed
- ✅ Plugin registered
- ✅ oh-my-opencode.json valid
- ✅ opencode.json valid
- ✅ Profile applied
- ✅ Agent configs valid
- ✅ MCP servers configured
- ✅ LSP servers detected
- ✅ API key(s) accessible

### Step 7: Start using it

**CLI mode:**
```bash
omocs profile list     # See all 13 profiles
omocs agent list       # See all 15 agents
omocs mcp list         # See 11 MCP servers
omocs agent route debugging  # Which agent handles this?
```

**Plugin mode (inside OpenCode):**
Agents automatically have access to `omocs_*` tools. Try:
- "Switch to ultra-mixed profile"
- "Which agent should handle this frontend task?"
- "Install the context7 MCP server"
- "Run a health check"

---

## Manual Setup (Advanced)

If you prefer to set things up manually (or are in a non-interactive environment), you can skip `omocs init` and do these steps yourself:

### Install oh-my-opencode

```bash
npm install -g oh-my-opencode
# or
bun add -g oh-my-opencode
```

### Register plugins in opencode.json

Add OMO Suites and oh-my-opencode to your `opencode.json` (usually at `~/.config/opencode/opencode.json`):

```jsonc
{
  // ... existing config ...
  "plugin": [
    "oh-my-opencode",  // if you have it
    "~/.omocs"         // OMO Suites
  ]
}
```

Or if using npm-style plugins:
```jsonc
{
  "plugins": {
    "omocs": {
      "source": "local:~/.omocs"
    }
  }
}
```

### Setup Launchboard (optional)

```bash
omocs launchboard setup
omocs launchboard start
```

---

## Available Profiles

### 🌐 All Scope — Every agent uses same model family
| Profile | Model | Use Case |
|---------|-------|----------|
| `opus-4.6-all` | Claude Opus 4.6 | Maximum quality |
| `codex-5.3-all` | GPT-5.3 Codex | OpenAI ecosystem |
| `gemini-3-all` | Gemini 3.1 Pro + Flash | Google ecosystem |
| `sonnet-4.6-all` | Claude Sonnet 4.6 | Balanced cost/quality |
| `kimi-k2.5-all` | Kimi K2.5 | Ultra cheap, Claude-like |

### 👑 Lead Scope — Premium for leads, cheaper for workers
| Profile | Lead | Workers | Use Case |
|---------|------|---------|----------|
| `opus-4.6-lead` | Opus 4.6 | Sonnet + Gemini + Codex | Premium orchestration |
| `sonnet-4.6-lead` | Sonnet 4.6 | Gemini + Flash | Mid-cost lead |

### 🔀 Mixed Scope — Best model per role
| Profile | Models | Use Case |
|---------|--------|----------|
| `codex-5.3-hybrid` | Codex + Gemini + Flash + Sonnet | Multi-provider |
| `codex-5.3-gemini` | Codex + Gemini Pro + Flash | OpenAI + Google |
| `codex-5.3-sonnet` | Codex + Sonnet 4.6 | OpenAI + Anthropic |
| `ultra-mixed` | Opus + Codex + Gemini + Sonnet + Kimi | **Best per task** |

### 💰 Economy Scope — Cheapest viable
| Profile | Models | Use Case |
|---------|--------|----------|
| `budget-mixed` | Sonnet + Flash + Kimi | Minimal cost |
| `local-free` | Ollama DeepSeek Coder v3 | Zero cost, offline |

---

## Troubleshooting

**Plugin not loading?**
- Check `opencode.json` has OMO Suites in `plugin` array
- Run `omocs doctor` for diagnostics
- Check OpenCode version (requires 1.0.150+)

**Profile switch not working?**
- Verify `oh-my-opencode.json` exists at `~/.config/opencode/oh-my-opencode.json`
- Check file permissions
- Run `omocs config get` to see current state

**Tools not appearing in OpenCode?**
- Restart OpenCode after adding plugin
- Check plugin build: `cd ~/.omocs && bun run build`
- Verify `dist/plugin.js` exists

---

## Uninstall

```bash
# Remove plugin from opencode.json (edit manually)
# Remove installation
rm -rf ~/.omocs
```
