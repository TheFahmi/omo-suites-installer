import { tool } from "@opencode-ai/plugin/tool";
import { listTasks, createTask, updateTask, moveTask } from "../../data/launchboard";

export const launchboardTools: Record<string, any> = {
  omocs_task_list: tool({
    description: "List tasks from Launchboard board. Filter by workspace, column, priority, or search query.",
    args: {
      workspace: tool.schema.string().optional().describe("Workspace name"),
      column: tool.schema.string().optional().describe("Column: backlog, planned, ready, in-progress, testing, done"),
      priority: tool.schema.number().optional().describe("1=critical, 2=high, 3=medium, 4=low"),
      search: tool.schema.string().optional().describe("Search query for task title"),
    },
    async execute(args) {
      try {
        const tasks = await listTasks({
          workspace: args.workspace,
          column: args.column,
          priority: args.priority,
          search: args.search,
        });

        if (!tasks || tasks.length === 0) {
          return "📋 No tasks found matching your filters.";
        }

        const priorityNames: Record<number, string> = { 1: '🔴 critical', 2: '🟠 high', 3: '🟡 medium', 4: '🟢 low' };
        const lines = [`# 📋 Launchboard — ${tasks.length} task(s)`, ""];

        for (const t of tasks) {
          const labels = t.labels?.map((l: any) => l.name).join(", ") || "none";
          lines.push(`• **${t.shortId}** — ${t.title}`);
          lines.push(`  Priority: ${priorityNames[t.priority] || t.priority} | Progress: ${t.progress ?? 0}% | Labels: ${labels}`);
          if (t.assignee) lines.push(`  Assignee: ${t.assignee}`);
          lines.push("");
        }

        return lines.join("\n");
      } catch (err: any) {
        return `❌ Failed to list tasks: ${err.message}`;
      }
    },
  }),

  omocs_task_create: tool({
    description: "Create a new task on the Launchboard board.",
    args: {
      title: tool.schema.string().describe("Task title"),
      priority: tool.schema.number().optional().describe("1=critical, 2=high, 3=medium, 4=low (default: 3)"),
      description: tool.schema.string().optional().describe("Task description"),
      labels: tool.schema.array(tool.schema.string()).optional().describe("Label names like feat, bug, chore"),
    },
    async execute(args) {
      try {
        const task = await createTask({
          title: args.title,
          priority: args.priority,
          description: args.description,
          labels: args.labels,
        });

        return [
          `✅ Task created: **${task.shortId}**`,
          `   Title: ${task.title}`,
          `   Priority: ${task.priority}`,
          `   ID: ${task.id}`,
        ].join("\n");
      } catch (err: any) {
        return `❌ Failed to create task: ${err.message}`;
      }
    },
  }),

  omocs_task_update: tool({
    description: "Update an existing task. Use shortId (e.g., feat-a1b2) or UUID.",
    args: {
      taskId: tool.schema.string().describe("Task shortId or UUID"),
      title: tool.schema.string().optional().describe("New title"),
      priority: tool.schema.number().optional().describe("1=critical, 2=high, 3=medium, 4=low"),
      progress: tool.schema.number().optional().describe("Progress 0-100"),
      column: tool.schema.string().optional().describe("Move to column: backlog, planned, ready, in-progress, testing, done"),
    },
    async execute(args) {
      try {
        const updated = await updateTask(args.taskId, {
          title: args.title,
          priority: args.priority,
          progress: args.progress,
          column: args.column,
        });

        return [
          `✅ Task updated: **${updated.shortId}**`,
          `   Title: ${updated.title}`,
          `   Priority: ${updated.priority}`,
          `   Progress: ${updated.progress ?? 0}%`,
        ].join("\n");
      } catch (err: any) {
        return `❌ Failed to update task: ${err.message}`;
      }
    },
  }),

  omocs_task_move: tool({
    description: "Move a task to a different column (e.g., from 'in-progress' to 'testing').",
    args: {
      taskId: tool.schema.string().describe("Task shortId or UUID"),
      column: tool.schema.string().describe("Target column: backlog, planned, ready, in-progress, testing, done"),
    },
    async execute(args) {
      try {
        const moved = await moveTask(args.taskId, args.column);

        return [
          `✅ Task moved: **${moved.shortId}**`,
          `   Title: ${moved.title}`,
          `   Moved to: ${args.column}`,
        ].join("\n");
      } catch (err: any) {
        return `❌ Failed to move task: ${err.message}`;
      }
    },
  }),
};
