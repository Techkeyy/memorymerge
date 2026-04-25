import 'dotenv/config';
import OpenAI from 'openai';
import { MemoryManager, TaskPayload } from '../sdk/memoryManager';
import { ReflectionEngine } from '../sdk/reflectionEngine';
import { createAnchorClient } from '../sdk/anchorClient';

export class PlannerAgent {
  private memory: MemoryManager;
  private reflection: ReflectionEngine;
  private client: OpenAI;
  private model: string;
  private agentId: string = 'planner';

  constructor(memory: MemoryManager, reflection: ReflectionEngine) {
    this.memory = memory;
    this.reflection = reflection;

    const serviceUrl = process.env.ZG_SERVICE_URL;
    const apiSecret = process.env.ZG_API_SECRET;

    if (!serviceUrl || !apiSecret) {
      throw new Error('Missing ZG_SERVICE_URL or ZG_API_SECRET');
    }

    this.client = new OpenAI({ baseURL: serviceUrl, apiKey: apiSecret });
    this.model = 'qwen/qwen-2.5-7b-instruct';
  }

  /**
   * Initialize the swarm with a goal and create the first set of tasks.
   * Called once at swarm startup.
   */
  async initializeSwarm(goal: string): Promise<void> {
    console.log(`\n[Planner] Initializing swarm with goal: "${goal}"`);
    await this.memory.setGoal(goal);

    try {
      const anchor = createAnchorClient();
      await anchor.setSwarmGoal(
        process.env.SWARM_ID ?? 'memorymerge-swarm-001',
        goal
      );
      console.log('[Planner] Goal anchored on 0G Chain');
    } catch (e) {
      console.warn('[Planner] Goal anchor failed (non-fatal):', e);
    }

    const context = await this.memory.getSwarmContext();

    const prompt = `You are a Planner agent in an AI research swarm.

The swarm goal is: "${goal}"

Current swarm memory:
- Facts known: ${context.facts.length}
- Tasks existing: ${context.tasks.length}
- Insights: ${context.insights.length}

Your job: Break this goal into 3 concrete research subtasks.
Each task must be specific, actionable, and independently executable.

Return ONLY a valid JSON array — no preamble, no explanation:
[
  {
    "taskId": "task_001",
    "description": "specific task description",
    "assignedTo": "researcher"
  },
  {
    "taskId": "task_002", 
    "description": "specific task description",
    "assignedTo": "researcher"
  },
  {
    "taskId": "task_003",
    "description": "specific task description", 
    "assignedTo": "researcher"
  }
]

Return valid JSON only. No markdown. No backticks.`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: 'You are a planning agent. Return only valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 800,
      });

      const raw = response.choices[0]?.message?.content ?? '[]';
      const cleaned = raw
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      const tasks: Array<{ taskId: string; description: string; assignedTo: string }> =
        JSON.parse(cleaned);

      for (const task of tasks) {
        await this.memory.writeTask(task.taskId, {
          status: 'pending',
          assignedTo: task.assignedTo,
          description: task.description,
        });
        console.log(`[Planner] Task created: ${task.taskId} → "${task.description}"`);
      }

      console.log(`[Planner] Swarm initialized with ${tasks.length} tasks`);
    } catch (error) {
      console.error('[Planner] Failed to initialize swarm:', error);
      // Fallback: create a single generic task
      await this.memory.writeTask('task_001', {
        status: 'pending',
        assignedTo: 'researcher',
        description: `Research and gather information about: ${goal}`,
      });
    }

    await this.reflection.tick();
  }

  /**
   * Review completed tasks and decide next actions.
   * Called after Critic has reviewed findings.
   */
  async reviewAndPlan(): Promise<string> {
    console.log(`\n[Planner] Reviewing swarm progress...`);

    const context = await this.memory.getSwarmContext();

    const pendingTasks = context.tasks.filter(t => t.status === 'pending');
    const completedTasks = context.tasks.filter(t => t.status === 'complete');
    const insights = context.insights;

    const prompt = `You are a Planner agent reviewing research swarm progress.

Goal: "${context.goal}"

Progress:
- Completed tasks: ${completedTasks.length}
- Pending tasks: ${pendingTasks.length}
- Insights accumulated: ${insights.length}

Top insights so far:
${insights.slice(0, 3).map(i => `- [importance ${i.importance}] ${i.insight}`).join('\n') || 'None yet'}

Completed task results:
${completedTasks.map(t => `- ${t.taskId}: ${t.result ?? 'no result'}`).join('\n') || 'None yet'}

Based on this, provide a brief assessment (2-3 sentences):
1. Is the goal sufficiently researched?
2. What is the most important gap still remaining?
3. Recommended next action for the swarm.`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: 'You are a planning agent. Be concise and direct.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 400,
      });

      const assessment = response.choices[0]?.message?.content ?? 'No assessment available';
      console.log(`[Planner] Assessment: ${assessment}`);

      await this.memory.writeFact(
        `planner_assessment_${Date.now()}`,
        assessment,
        0.9
      );

      await this.reflection.tick();
      return assessment;
    } catch (error) {
      console.error('[Planner] reviewAndPlan failed:', error);
      return 'Planner assessment unavailable';
    }
  }
}
