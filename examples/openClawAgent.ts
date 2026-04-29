/**
 * MemoryMerge OpenClaw Agent Example
 * 
 * Shows how to use MemoryMergeSkill in any OpenClaw-compatible agent.
 * This is the reference implementation for Track 1 judges.
 * 
 * Usage:
 *   npm run openclaw
 *   npm run openclaw -- --name "Alice" --goal "learn Solidity"
 */

import 'dotenv/config';
import * as readline from 'readline';
import OpenAI from 'openai';
import { createMemoryMergeSkill } from '../src/skill/MemoryMergeSkill';

function getArg(flag: string, fallback: string): string {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

const AGENT_NAME = getArg('--name', 'OpenClaw Agent');
const AGENT_GOAL = getArg('--goal', 'Be a helpful assistant with persistent memory');

async function runOpenClawAgent() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║     MemoryMerge + OpenClaw Reference Implementation  ║');
  console.log('║     Persistent memory via 0G Storage                 ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // ── Step 1: Initialize the MemoryMerge skill ───────────────
  const skill = createMemoryMergeSkill({
    agentId: AGENT_NAME.toLowerCase().replace(/\s+/g, '-'),
    swarmId: process.env.SWARM_ID ?? 'memorymerge-swarm-001',
    reflectionInterval: 8,
    autoReflect: true,
    minConfidence: 0.6,
    maxContextFacts: 15,
  });

  await skill.initialize();
  await skill.setGoal(AGENT_GOAL);

  // ── Step 2: Initialize LLM client (0G Compute) ────────────
  const client = new OpenAI({
    baseURL: process.env.ZG_SERVICE_URL,
    apiKey: process.env.ZG_API_SECRET,
  });

  console.log(`Agent: ${AGENT_NAME}`);
  console.log(`Goal : ${AGENT_GOAL}`);
  console.log('\nCommands: /memory /stats /reflect /quit');
  console.log('─────────────────────────────────────────────────────\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  const ask = (prompt: string): Promise<string> =>
    new Promise(resolve => {
      process.stdout.write(prompt);
      rl.once('line', resolve);
    });

  process.on('SIGINT', async () => {
    console.log('\n[MemoryMerge] Saving memory to 0G Storage...');
    await skill.reflect();
    const stats = await skill.getStats();
    console.log(`[MemoryMerge] Saved ${stats.factCount} facts, ${stats.insightCount} insights`);
    console.log('[MemoryMerge] Restart to resume with full memory.\n');
    process.exit(0);
  });

  while (true) {
    const input = await ask('\nYou: ');
    if (!input.trim()) continue;

    if (input === '/quit') { process.emit('SIGINT'); break; }

    if (input === '/memory') {
      const result = await skill.recall('', 0.0);
      console.log(`\n[Memory] ${result.totalFacts} facts in 0G Storage:`);
      result.facts.slice(0, 10).forEach((f, i) => {
        console.log(`  ${i + 1}. [${(f.confidence * 100).toFixed(0)}%] ${f.value.slice(0, 80)}`);
      });
      continue;
    }

    if (input === '/stats') {
      const stats = await skill.getStats();
      console.log(`\n[Stats] Facts: ${stats.factCount} | Insights: ${stats.insightCount} | Turns: ${stats.turnCount} | Next reflect in: ${stats.turnsUntilReflection} turns`);
      continue;
    }

    if (input === '/reflect') {
      await skill.reflect();
      continue;
    }

    // ── Core agent loop ───────────────────────────────────────
    // Step A: Get memory context from 0G Storage
    const memoryContext = await skill.onTurnStart();

    // Step B: Build system prompt with injected memory
    const systemPrompt = `You are ${AGENT_NAME}, an AI assistant with persistent memory.
Goal: ${AGENT_GOAL}

${memoryContext}

Be helpful, concise, and reference your memories when relevant.`;

    // Step C: Call LLM (0G Compute)
    console.log('\n[Agent] Thinking...');
    const response = await client.chat.completions.create({
      model: 'qwen/qwen-2.5-7b-instruct',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: input },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const reply = response.choices[0]?.message?.content ?? 'No response';
    console.log(`\n${AGENT_NAME}: ${reply}`);

    // Step D: Write turn to 0G Storage memory
    await skill.onTurnEnd(input, reply);
  }

  rl.close();
}

runOpenClawAgent().catch(console.error);