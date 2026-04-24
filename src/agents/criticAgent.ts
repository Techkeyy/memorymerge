import 'dotenv/config';
import OpenAI from 'openai';
import { MemoryManager } from '../sdk/memoryManager';
import { ReflectionEngine } from '../sdk/reflectionEngine';

export class CriticAgent {
  private memory: MemoryManager;
  private reflection: ReflectionEngine;
  private client: OpenAI;
  private model: string;
  private agentId: string = 'critic';

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
   * Review all pending_review tasks.
   * Scores facts, flags contradictions, promotes verified knowledge.
   */
  async reviewPendingTasks(): Promise<number> {
    const context = await this.memory.getSwarmContext();
    const pendingReview = context.tasks.filter(t => t.status === 'pending_review');

    if (pendingReview.length === 0) {
      console.log('[Critic] No tasks pending review.');
      return 0;
    }

    console.log(`\n[Critic] Reviewing ${pendingReview.length} task(s)...`);
    let reviewed = 0;

    for (const task of pendingReview) {
      const taskFacts = context.facts.filter(f =>
        f.key.startsWith(`${task.taskId}_`)
      );

      const factsText = taskFacts
        .map(f => `- [${f.key}] (confidence: ${f.confidence}): ${f.value}`)
        .join('\n') || 'No facts found for this task';

      const prompt = `You are a Critic agent in an AI research swarm.
Your job is to evaluate the quality and reliability of research findings.

Swarm Goal: "${context.goal}"
Task reviewed: "${task.description}"
Task result: "${task.result ?? 'No result'}"

Facts submitted by Researcher:
${factsText}

Critically evaluate these findings:
1. Are the facts accurate and well-supported?
2. Are there any contradictions or inconsistencies?
3. What confidence score (0.0-1.0) should each fact receive?

Return ONLY valid JSON — no preamble, no explanation:
{
  "overallQuality": 0.8,
  "approved": true,
  "factScores": [
    {
      "key": "exact_fact_key",
      "confidence": 0.85,
      "reviewed": true
    }
  ],
  "critique": "brief critique of the research quality in 1-2 sentences"
}

Return valid JSON only. No markdown. No backticks.`;

      try {
        const response = await this.client.chat.completions.create({
          model: this.model,
          messages: [
            { role: 'system', content: 'You are a critic agent. Return only valid JSON.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 600,
        });

        const raw = response.choices[0]?.message?.content ?? '{}';
        const cleaned = raw
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();

        const evaluation: {
          overallQuality: number;
          approved: boolean;
          factScores: Array<{ key: string; confidence: number; reviewed: boolean }>;
          critique: string;
        } = JSON.parse(cleaned);

        // Update confidence scores for each fact
        for (const score of evaluation.factScores) {
          await this.memory.updateFactConfidence(
            score.key,
            score.confidence,
            score.reviewed
          );
        }

        // Write critique as a fact
        await this.memory.writeFact(
          `critic_review_${task.taskId}`,
          evaluation.critique,
          0.95
        );

        // Mark task complete
        await this.memory.updateTaskStatus(task.taskId, 'complete');

        console.log(`[Critic] Task ${task.taskId} reviewed:`);
        console.log(`  Quality: ${evaluation.overallQuality}`);
        console.log(`  Approved: ${evaluation.approved}`);
        console.log(`  Critique: ${evaluation.critique}`);

        reviewed++;
      } catch (error) {
        console.error(`[Critic] Review failed for task ${task.taskId}:`, error);
        await this.memory.updateTaskStatus(task.taskId, 'complete');
      }

      await this.reflection.tick();
    }

    return reviewed;
  }
}
