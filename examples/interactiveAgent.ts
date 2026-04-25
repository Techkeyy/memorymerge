/**
 * MemoryMerge Interactive Agent
 * 
 * A real OpenClaw-compatible agent that demonstrates:
 * ✓ Persistent memory across sessions via 0G Storage KV
 * ✓ Memory written after EVERY turn — not just on snapshot
 * ✓ Full context restored on restart from 0G Storage
 * ✓ Reflection engine compresses memory every 8 turns
 * ✓ Episodic archive to 0G Storage Log
 * ✓ On-chain anchoring via MemoryAnchor contract
 * 
 * Usage:
 *   npm run agent
 *   npm run agent -- --name "Alice" --goal "help me learn Solidity"
 * 
 * Kill it with Ctrl+C. Restart it. It remembers everything.
 */

import 'dotenv/config';
import * as readline from 'readline';
import OpenAI from 'openai';
import { createMemoryManager } from '../src/sdk/memoryManager';
import { createReflectionEngine } from '../src/sdk/reflectionEngine';

// ── Parse CLI args ─────────────────────────────────────────────
function getArg(flag: string, fallback: string): string {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

const AGENT_NAME = getArg('--name', 'MemoryAgent');
const AGENT_GOAL = getArg('--goal', 'Be a helpful assistant that remembers everything');
const SWARM_ID = process.env.SWARM_ID ?? 'memorymerge-swarm-001';

// ── Build system prompt from 0G Storage memory ─────────────────
function buildSystemPrompt(
  agentName: string,
  goal: string,
  facts: Array<{ value: string; confidence: number; authorAgent: string }>,
  insights: Array<{ insight: string; importance: number }>,
  turnCount: number
): string {
  const factsList = facts.length > 0
    ? facts
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 15)
        .map(f => `- ${f.value} (confidence: ${(f.confidence * 100).toFixed(0)}%)`)
        .join('\n')
    : 'No memories yet — this is a fresh session.';

  const insightsList = insights.length > 0
    ? insights
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 5)
        .map(i => `- [${i.importance}/10] ${i.insight}`)
        .join('\n')
    : 'No insights yet.';

  return `You are ${agentName}, an AI assistant with persistent decentralized memory.

Your current goal: ${goal}

WHAT YOU REMEMBER (from 0G Storage — ${facts.length} facts stored):
${factsList}

KEY INSIGHTS (distilled by reflection engine):
${insightsList}

IMPORTANT RULES:
1. You are on turn ${turnCount + 1}. Your memory persists across sessions via 0G Storage.
2. After each response, extract 1-3 NEW facts learned from this conversation.
3. Be specific and reference what you remember when relevant.
4. If this is turn 1 and you have no memories, introduce yourself and ask what the user wants to accomplish.
5. If you have memories, greet the user by referencing something specific you remember.

Respond naturally and helpfully. Be concise.`;
}

// ── Extract facts from a conversation turn ─────────────────────
async function extractFacts(
  client: OpenAI,
  model: string,
  userMessage: string,
  agentResponse: string,
  existingFacts: string[]
): Promise<Array<{ key: string; value: string; confidence: number }>> {
  const prompt = `Extract 1-3 important facts from this conversation turn that are worth remembering.
Focus on: user preferences, goals, names, specific requests, decisions made, or new information learned.
Do NOT extract facts already in the existing memory.

User said: "${userMessage}"
Agent responded: "${agentResponse}"

Existing memory (do not duplicate):
${existingFacts.slice(0, 10).join('\n')}

Return ONLY valid JSON array — no preamble:
[
  {
    "key": "unique_snake_case_key",
    "value": "specific fact to remember",
    "confidence": 0.85
  }
]

If nothing new is worth remembering, return: []`;

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: 'You are a memory extraction engine. Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 400,
    });

    const raw = response.choices[0]?.message?.content ?? '[]';
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    return JSON.parse(cleaned);
  } catch {
    return [];
  }
}

// ── Main Agent Loop ─────────────────────────────────────────────
async function runAgent() {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║        MemoryMerge Interactive Agent               ║');
  console.log('║  Persistent memory on 0G Storage · OpenClaw-ready  ║');
  console.log('╚════════════════════════════════════════════════════╝\n');
  console.log(`Agent Name : ${AGENT_NAME}`);
  console.log(`Goal       : ${AGENT_GOAL}`);
  console.log(`Swarm ID   : ${SWARM_ID}`);
  console.log(`Network    : 0G Galileo Testnet\n`);

  // ── Initialize SDK ───────────────────────────────────────────
  console.log('[Agent] Initializing 0G Storage connection...');
  const memory = createMemoryManager(SWARM_ID, 'interactive-agent');
  const reflection = createReflectionEngine(memory, 8);

  // ── Initialize 0G Compute client ────────────────────────────
  const serviceUrl = process.env.ZG_SERVICE_URL;
  const apiSecret = process.env.ZG_API_SECRET;

  if (!serviceUrl || !apiSecret) {
    console.error('[Agent] Missing ZG_SERVICE_URL or ZG_API_SECRET in .env');
    process.exit(1);
  }

  const client = new OpenAI({ baseURL: serviceUrl, apiKey: apiSecret });
  const model = 'qwen/qwen-2.5-7b-instruct';

  // ── Load existing memory from 0G Storage ────────────────────
  console.log('[Agent] Loading memory from 0G Storage...');
  const context = await memory.getSwarmContext();
  const existingFacts = context.facts;
  const existingInsights = context.insights;

  if (existingFacts.length > 0) {
    console.log(`[Agent] ✓ Restored ${existingFacts.length} facts from 0G Storage`);
    console.log(`[Agent] ✓ Restored ${existingInsights.length} insights from 0G Storage`);
    console.log(`[Agent] Memory spans previous sessions — continuity confirmed\n`);
  } else {
    console.log('[Agent] Fresh session — no existing memory found');
    console.log('[Agent] Memory will be written to 0G Storage after each turn\n');
    await memory.setGoal(AGENT_GOAL);
  }

  console.log('─────────────────────────────────────────────────────');
  console.log('Type your message and press Enter. Ctrl+C to exit.');
  console.log('Memory is written to 0G Storage after every turn.');
  console.log('Restart the agent anytime — it will remember everything.');
  console.log('─────────────────────────────────────────────────────\n');

  // ── Conversation history (in-session only) ───────────────────
  const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  let turnCount = existingFacts.length > 0 ? existingFacts.length : 0;

  // ── readline interface ────────────────────────────────────────
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  const askQuestion = (prompt: string): Promise<string> => {
    return new Promise(resolve => {
      process.stdout.write(prompt);
      rl.once('line', resolve);
    });
  };

  // ── Graceful shutdown ─────────────────────────────────────────
  process.on('SIGINT', async () => {
    console.log('\n\n[Agent] Shutting down...');
    console.log('[Agent] Running final reflection and snapshot...');
    try {
      const result = await reflection.forceReflection();
      console.log(`[Agent] Final snapshot: ${result.snapshotRootHash}`);
      console.log(`[Agent] Verify at: https://storagescan-galileo.0g.ai/tx/${result.snapshotRootHash}`);
      if (result.anchorTxHash) {
        console.log(`[Agent] Chain anchor: https://chainscan-galileo.0g.ai/tx/${result.anchorTxHash}`);
      }
    } catch (e) {
      console.log('[Agent] Snapshot skipped:', e);
    }
    console.log('\n[Agent] Memory saved to 0G Storage. Restart to resume.\n');
    process.exit(0);
  });

  // ── Main conversation loop ────────────────────────────────────
  while (true) {
    const userInput = await askQuestion(`\nYou: `);

    if (!userInput.trim()) continue;
    if (userInput.toLowerCase() === 'exit' || userInput.toLowerCase() === 'quit') {
      process.emit('SIGINT');
      break;
    }

    // Special commands
    if (userInput.toLowerCase() === '/memory') {
      const ctx = await memory.getSwarmContext();
      console.log(`\n[Memory] ${ctx.facts.length} facts in 0G Storage:`);
      ctx.facts.slice(0, 10).forEach((f, i) => {
        console.log(`  ${i + 1}. [${(f.confidence * 100).toFixed(0)}%] ${f.value}`);
      });
      if (ctx.insights.length > 0) {
        console.log(`\n[Memory] ${ctx.insights.length} insights:`);
        ctx.insights.forEach((ins, i) => {
          console.log(`  ${i + 1}. [${ins.importance}/10] ${ins.insight}`);
        });
      }
      continue;
    }

    if (userInput.toLowerCase() === '/reflect') {
      console.log('[Agent] Running manual reflection...');
      const result = await reflection.forceReflection();
      console.log(`[Agent] Reflection complete. Snapshot: ${result.snapshotRootHash}`);
      continue;
    }

    if (userInput.toLowerCase() === '/status') {
      const ctx = await memory.getSwarmContext();
      console.log(`\n[Status]`);
      console.log(`  Facts in 0G Storage : ${ctx.facts.length}`);
      console.log(`  Insights            : ${ctx.insights.length}`);
      console.log(`  Turn count          : ${turnCount}`);
      console.log(`  Turns until reflect : ${reflection.getTurnsUntilReflection()}`);
      console.log(`  Swarm ID            : ${SWARM_ID}`);
      continue;
    }

    console.log('\n[Agent] Thinking...');

    try {
      // Load fresh context from 0G Storage
      const freshContext = await memory.getSwarmContext();

      // Build system prompt with current memory
      const systemPrompt = buildSystemPrompt(
        AGENT_NAME,
        AGENT_GOAL,
        freshContext.facts,
        freshContext.insights,
        turnCount
      );

      // Add user message to history
      conversationHistory.push({ role: 'user', content: userInput });

      // Call 0G Compute
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory.slice(-6),
        ],
        temperature: 0.7,
        max_tokens: 600,
      });

      const agentResponse = response.choices[0]?.message?.content ?? 'No response';
      conversationHistory.push({ role: 'assistant', content: agentResponse });

      console.log(`\n${AGENT_NAME}: ${agentResponse}`);

      // Extract and write new facts to 0G Storage
      process.stdout.write('\n[Memory] Writing to 0G Storage...');
      const newFacts = await extractFacts(
        client,
        model,
        userInput,
        agentResponse,
        freshContext.facts.map(f => f.value)
      );

      let factsWritten = 0;
      for (const fact of newFacts) {
        await memory.writeFact(
          `turn_${turnCount}_${fact.key}`,
          fact.value,
          fact.confidence
        );
        factsWritten++;
      }

      console.log(` ${factsWritten} fact(s) written`);

      turnCount++;

      // Tick reflection engine
      const reflectionResult = await reflection.tick();
      if (reflectionResult) {
        console.log(`\n[Reflection] Epoch ${reflectionResult.epochNumber} complete`);
        console.log(`[Reflection] ${reflectionResult.insightsGenerated} insights generated`);
        console.log(`[Reflection] Snapshot: ${reflectionResult.snapshotRootHash}`);
        if (reflectionResult.anchorTxHash) {
          console.log(`[Reflection] Chain anchor: https://chainscan-galileo.0g.ai/tx/${reflectionResult.anchorTxHash}`);
        }
      }

    } catch (error) {
      console.error(`\n[Agent] Error:`, error);
      console.log('[Agent] Retrying next turn...');
    }
  }

  rl.close();
}

runAgent().catch(console.error);