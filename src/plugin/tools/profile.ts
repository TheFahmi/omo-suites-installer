import { tool } from "@opencode-ai/plugin/tool";
import { formatProfileList, getOmoConfigPath, getOpencodeConfigPath, readJsonFile, writeJsonFile } from "../helpers";
import { profilesList, getProfile } from "../../data/profiles";

export const profileTools: Record<string, any> = {
  omocs_profile_list: tool({
    description: "List all available OMO Suites profiles with model assignments. 13 profiles across 4 scope types (all, lead, mixed, economy). More than OCS's 8.",
    args: {},
    async execute() {
      return formatProfileList();
    },
  }),

  omocs_profile_switch: tool({
    description: "Switch to a different OMO Suites profile, updating oh-my-opencode agent and category model assignments. Creates backup before writing.",
    args: {
      profile: tool.schema.string().describe("Profile name to switch to (e.g. ultra-mixed, opus-4.6-all, budget-mixed)"),
    },
    async execute(args, context) {
      const profileData = getProfile(args.profile);
      if (!profileData) {
        const available = profilesList.map(p => p.name).join(", ");
        return `❌ Profile '${args.profile}' not found.\n\nAvailable profiles: ${available}`;
      }

      // Update oh-my-opencode.json
      const omoPath = getOmoConfigPath(context.directory);
      const omoConfig = readJsonFile(omoPath);

      // Apply agent overrides
      if (!omoConfig.agents) omoConfig.agents = {};
      for (const [agentId, override] of Object.entries(profileData.agentOverrides)) {
        if (!omoConfig.agents[agentId]) omoConfig.agents[agentId] = {};
        omoConfig.agents[agentId].model = override.model;
      }

      // Apply category overrides
      if (!omoConfig.categories) omoConfig.categories = {};
      for (const [cat, override] of Object.entries(profileData.categoryOverrides)) {
        if (!omoConfig.categories[cat]) omoConfig.categories[cat] = {};
        omoConfig.categories[cat].model = override.model;
      }

      omoConfig.activeProfile = args.profile;
      omoConfig.scope = profileData.scope;
      writeJsonFile(omoPath, omoConfig);

      // Also update .opencode.json agents block
      const ocPath = getOpencodeConfigPath(context.directory);
      const ocConfig = readJsonFile(ocPath);
      ocConfig.agents = {
        ...ocConfig.agents,
        ...profileData.agents,
      };
      writeJsonFile(ocPath, ocConfig);

      const lines = [
        `✅ Switched to profile: **${profileData.name}** [${profileData.scope}]`,
        `   ${profileData.description}`,
        "",
        `   Primary: ${profileData.models.primary}`,
      ];
      if (profileData.models.secondary) lines.push(`   Secondary: ${profileData.models.secondary}`);
      if (profileData.models.frontend) lines.push(`   Frontend: ${profileData.models.frontend}`);
      if (profileData.models.review) lines.push(`   Review: ${profileData.models.review}`);
      if (profileData.models.research) lines.push(`   Research: ${profileData.models.research}`);
      lines.push("");
      lines.push(`   Agent overrides applied: ${Object.keys(profileData.agentOverrides).length}`);
      lines.push(`   Category overrides applied: ${Object.keys(profileData.categoryOverrides).length}`);
      lines.push(`   Configs updated: ${omoPath}, ${ocPath}`);

      return lines.join("\n");
    },
  }),
};
