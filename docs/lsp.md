# LSP Configurations

OMO Suites includes **10 LSP (Language Server Protocol) configurations** with auto-detection based on your project's files.

## Available LSP Servers

| LSP | Detects | Install Command |
|-----|---------|-----------------|
| **TypeScript** | `tsconfig.json`, `package.json` | `npm i -g typescript-language-server typescript` |
| **Tailwind CSS** | `tailwind.config.*` | `npm i -g @tailwindcss/language-server` |
| **ESLint** | `.eslintrc*`, `eslint.config.js` | `npm i -g vscode-langservers-extracted` |
| **CSS** | `*.css`, `*.scss` | `npm i -g vscode-langservers-extracted` |
| **HTML** | `*.html` | `npm i -g vscode-langservers-extracted` |
| **JSON** | `*.json` | `npm i -g vscode-langservers-extracted` |
| **YAML** | `*.yml`, `*.yaml` | `npm i -g yaml-language-server` |
| **Prisma** | `schema.prisma` | `npm i -g @prisma/language-server` |
| **SQL** | `*.sql` | `npm i -g sql-language-server` |
| **Markdown** | `*.md` | `brew install marksman` |

## Usage

```bash
# Scan project and detect needed LSP servers
omocs lsp detect

# Install all detected LSP servers
omocs lsp install
```

## How Detection Works

When you run `omocs lsp detect`, it scans your project directory for configuration files and file extensions that indicate which languages/tools you're using. It then suggests the appropriate LSP servers to install.

Detection is automatic — just run it in your project root.
