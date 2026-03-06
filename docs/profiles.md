# Profiles

OMO Suites ships with **13 profiles** across 4 scope types. Each profile defines which AI model every agent uses.

## 🌐 All Scope — Every agent uses same model

| Profile | Model | Best For |
|---------|-------|----------|
| **opus-4.6-all** | Claude Opus 4.6 | Maximum quality, complex tasks |
| **codex-5.3-all** | GPT-5.3 Codex | OpenAI-focused workflows |
| **gemini-3-all** | Gemini 3.1 Pro + Flash | Google ecosystem, large context |
| **sonnet-4.6-all** | Claude Sonnet 4.6 | Balanced cost/quality |
| **kimi-k2.5-all** | Kimi K2.5 | Ultra cheap, Claude-like |

## 👑 Lead Scope — Primary for leaders, cheaper for workers

| Profile | Lead Model | Worker Model | Best For |
|---------|------------|--------------|----------|
| **opus-4.6-lead** | Opus 4.6 | Sonnet + Gemini + Codex | Premium lead, budget workers |
| **sonnet-4.6-lead** | Sonnet 4.6 | Gemini + Flash | Mid-cost lead + cheap workers |

## 🔀 Mixed Scope — Best model per role

| Profile | Models | Best For |
|---------|--------|----------|
| **codex-5.3-hybrid** | Codex + Gemini + Flash + Sonnet | Multi-provider diversity |
| **codex-5.3-gemini** | Codex + Gemini Pro + Flash | OpenAI + Google duo |
| **codex-5.3-sonnet** | Codex + Sonnet 4.6 | OpenAI + Anthropic duo |
| **ultra-mixed** | Opus + Codex + Gemini + Sonnet + Kimi | **Best possible per task** |

## 💰 Economy Scope — Cheapest viable models

| Profile | Models | Best For |
|---------|--------|----------|
| **budget-mixed** | Sonnet + Flash + Kimi | Minimal cost, still functional |
| **local-free** | Ollama DeepSeek Coder v3 | Zero cost, fully offline |

## Usage

```bash
# List all profiles
omocs profile list

# Switch to a profile
omocs profile use ultra-mixed

# Create a custom profile
omocs profile create

# Export/share a profile
omocs profile export
```
