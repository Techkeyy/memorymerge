import 'dotenv/config';
import OpenAI from 'openai';
import { MemoryManager } from '../sdk/memoryManager';
import { ReflectionEngine } from '../sdk/reflectionEngine';

export class ResearcherAgent {
  private memory: MemoryManager;
  private reflection: ReflectionEngine;
  private client: OpenAI;
  private model: string;
  private agentId: string = 'researcher';

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
   * Execute the next pending task from swarm memory.
   * Reads task from 0G Storage, researches it, writes findings back.
   */
  async executeNextTask(): Promise<boolean> {
    const context = await this.memory.getSwarmContext();
    const pendingTasks = context.tasks.filter(t => t.status === 'pending');

    if (pendingTasks.length === 0) {
      console.log('[Researcher] No pending tasks found.');
      return false;
    }

    const task = pendingTasks[0];
    console.log(`\n[Researcher] Executing task: ${task.taskId}`);
    console.log(`[Researcher] Description: ${task.description}`);

    // Mark task as in progress
    await this.memory.updateTaskStatus(task.taskId, 'in_progress');

    const existingFacts = context.facts
      .slice(0, 5)
      .map(f => `- ${f.value}`)
      .join('\n') || 'None yet';

    const existingInsights = context.insights
      .slice(0, 3)
      .map(i => `- [${i.importance}/10] ${i.insight}`)
      .join('\n') || 'None yet';

    const prompt = `You are a Researcher agent in an AI research swarm.

Swarm Goal: "${context.goal}"
Your Task: "${task.description}"

What the swarm already knows:
${existingFacts}

Key insights so far:
${existingInsights}

Research this task thoroughly. Provide:
1. A direct answer or finding (2-3 sentences)
2. 3-5 specific facts discovered
3. Confidence level 0.0-1.0

Return ONLY valid JSON — no preamble, no explanation:
{
  "result": "main finding or answer in 2-3 sentences",
  "facts": [
    {
      "key": "fact_unique_key",
      "value": "specific fact discovered",
      "confidence": 0.8
    }
  ]
}

Return valid JSON only. No markdown. No backticks.`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: 'You are a research agent. Return only valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 800,
      });

      const raw = response.choices[0]?.message?.content ?? '{}';
      const cleaned = raw
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      const output: {
        result: string;
        facts: Array<{ key: string; value: string; confidence: number }>;
      } = JSON.parse(cleaned);

      // Write each fact to 0G Storage
      for (const fact of output.facts) {
        await this.memory.writeFact(
          `${task.taskId}_${fact.key}`,
          fact.value,
          fact.confidence
        );
      }

      // Mark task as pending review
      await this.memory.updateTaskStatus(
        task.taskId,
        'pending_review',
        output.result
      );

      console.log(`[Researcher] Task complete: ${task.taskId}`);
      console.log(`[Researcher] Facts written: ${output.facts.length}`);
      console.log(`[Researcher] Result: ${output.result}`);

      await this.reflection.tick();
      return true;
    } catch (error) {
      console.error('[Researcher] executeNextTask failed:', error);
      await this.memory.updateTaskStatus(
        task.taskId,
        'pending_review',
        'Research failed — error during execution'
      );
      return false;
    }
  }
}
