import { tool } from "@opencode-ai/plugin/tool";
import { formatAgentList } from "../helpers";
import { agents, categoryRouting, getAgentForCategory, listCategories, listAgentIds } from "../../data/agents";

export const agentTools: Record<string, any> = {
  omocs_agent_route: tool({
    description: "Find the best agent for a task category (e.g. visual-engineering, debugging, ultrabrain, code-review). Returns agent details and routing info.",
    args: {
      category: tool.schema.string().describe("Task category (e.g. debugging, visual-engineering, code-review, ultrabrain, database, security)"),
    },
    async execute(args) {
      const agent = getAgentForCategory(args.category);
      if (!agent) {
        const categories = listCategories().join(", ");
        return `❌ Unknown category '${args.category}'.\n\nAvailable categories:\n${categories}`;
      }
      return [
        `🎯 Category: **${args.category}**`,
        `   Routed to: ${agent.emoji} **${agent.name}** (${agent.id})`,
        `   ${agent.description}`,
        `   Model: ${agent.preferredModel}`,
        `   Thinking budget: ${agent.thinkingBudget} tokens`,
        `   Tools: ${agent.tools.join(", ")}`,
        `   Tags: ${agent.tags.join(", ")}`,
      ].join("\n");
    },
  }),

  omocs_agent_info: tool({
    description: "Get detailed info about a specific agent (model, thinking budget, description, tools, tags). Use agent ID like 'sisyphus', 'momus', 'frontend-ui-ux-engineer'.",
    args: {
      name: tool.schema.string().describe("Agent ID (e.g. sisyphus, atlas, momus, frontend-ui-ux-engineer)"),
    },
    async execute(args) {
      const agent = agents[args.name];
      if (!agent) {
        const ids = listAgentIds().join(", ");
        return `❌ Agent '${args.name}' not found.\n\nAvailable agents: ${ids}`;
      }

      // Find categories routed to this agent
      const routedCategories = Object.entries(categoryRouting)
        .filter(([_, agentId]) => agentId === args.name)
        .map(([cat]) => cat);

      return [
        `${agent.emoji} **${agent.name}** (${agent.id})`,
        `   ${agent.description}`,
        "",
        `   Model: ${agent.preferredModel}`,
        `   Thinking budget: ${agent.thinkingBudget} tokens`,
        `   System prompt: ${agent.systemPromptFile}`,
        `   Tools: ${agent.tools.join(", ")}`,
        `   Tags: ${agent.tags.join(", ")}`,
        "",
        `   Routes ${routedCategories.length} categories:`,
        ...routedCategories.map(c => `   • ${c}`),
      ].join("\n");
    },
  }),

  omocs_agent_list: tool({
    description: "List all 28 available OMO Suites agents with their models, thinking budgets, and specializations.",
    args: {},
    async execute() {
      return formatAgentList();
    },
  }),
};
