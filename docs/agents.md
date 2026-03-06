# Agents

OMO Suites includes **15 specialized agents** that handle **32 task categories**. Each agent has a tuned model, thinking budget, and system prompt.

## Agent Roster

| Agent | Emoji | Model | Budget | Specialization |
|-------|-------|-------|--------|----------------|
| **Sisyphus** | 🔨 | Claude Opus 4.6 | 16K | Implementation, code writing |
| **Atlas** | 🗺️ | Claude Opus 4.6 | 20K | Task orchestration, delegation |
| **Prometheus** | 🔥 | Claude Opus 4.6 | 40K | Planning, requirements |
| **Metis** | 🧠 | Claude Opus 4.6 | 32K | Gap analysis, edge cases |
| **Momus** | 👁️ | GPT-5.3 Codex | 40K | Code review, quality |
| **Oracle** | 🔮 | GPT-5.3 Codex | 32K | Architecture decisions |
| **Hephaestus** | ⚒️ | GPT-5.3 Codex | 50K | Deep refactoring |
| **Librarian** | 📚 | Claude Sonnet 4.6 | 8K | Search, documentation |
| **Explore** | 🧭 | Claude Sonnet 4.6 | 10K | Codebase discovery |
| **Multimodal Looker** | 👀 | Claude Sonnet 4.6 | 15K | Visual analysis |
| **Frontend UI/UX** | 🎨 | Gemini 3.1 Pro | 20K | UI/UX, accessibility |
| **Architect** | 🏗️ | Claude Opus 4.6 | 40K | System design |
| **Database Expert** | 🗃️ | Claude Opus 4.6 | 32K | Queries, migrations |
| **DevRel** | 🚀 | Kimi K2.5 | 20K | Docs, writing |
| **Image Generator** | 🖼️ | GLM Image | — | Image generation |

## Category Routing

Each task category automatically routes to the best agent:

| Categories | Agent |
|-----------|-------|
| `deep`, `ultrabrain`, `deep-reasoning` | Sisyphus |
| `backend`, `debugging`, `refactor`, `testing`, `deployment`, `migration` | Sisyphus |
| `visual-engineering`, `artistry`, `accessibility`, `i18n`, `seo`, `develop-web-game` | Frontend UI/UX |
| `code-review`, `spec-review` | Momus |
| `api-design`, `architect` | Architect |
| `database` | Database Expert |
| `brainstorming`, `business-analysis` | Oracle |
| `writing`, `research` | DevRel |
| `security`, `performance` | Hephaestus |
| `token-efficiency`, `introspection` | Metis |
| `quick`, `unspecified-low` | Librarian |
| `image-generation` | Image Generator |

## Usage

```bash
# List all agents
omocs agent list

# Switch active agent
omocs agent use momus

# Get agent details + system prompt
omocs agent info atlas

# List all 32 task categories
omocs agent categories

# Route a task to the best agent
omocs agent route debugging
```
