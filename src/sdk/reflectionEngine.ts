import 'dotenv/config';
import OpenAI from 'openai';
import { MemoryManager, InsightEntry, FactEntry } from './memoryManager';
import { AnchorClient, createAnchorClient, AnchorResult } from './anchorClient';
import { VerifiableSnapshot, VerifiableSnapshotData } from './verifiableSnapshot';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface ReflectionResult {
  epochNumber: number;
  factsProcessed: number;
  insightsGenerated: number;
  factsDeleted: string[];
  merkleRootHash: string;
  merkleFactCount: number;
  snapshotRootHash: string;
  snapshotLabel: string;
  anchorTxHash: string;
  anchorBlockNumber: number;
  durationMs: number;
  model: string;
}

export interface CompressedMemory {
  insights: Array<{
    key: string;
    insight: string;
    importance: number;
  }>;
  factsToDelete: string[];
  contradictions: Array<{
    factKeyA: string;
    factKeyB: string;
    description: string;
  }>;
  summary: string;
}

// ─── ReflectionEngine ─────────────────────────────────────────────────────────

export class ReflectionEngine {
  private memory: MemoryManager;
  private client: OpenAI;
  private model: string;
  private anchorClient: AnchorClient;
  private triggerEvery: number;
  private turnCount: number;
  private epochNumber: number;
  private lastReflectionAt: number;

  constructor(config: {
    memory: MemoryManager;
    triggerEvery?: number;
  }) {
    this.memory = config.memory;
    this.triggerEvery = config.triggerEvery ?? 20;
    this.turnCount = 0;
    this.epochNumber = 0;
    this.lastReflectionAt = 0;

    // 0G Compute endpoint — OpenAI-compatible
    const serviceUrl = process.env.ZG_SERVICE_URL;
    const apiSecret = process.env.ZG_API_SECRET;

    if (!serviceUrl || !apiSecret) {
      throw new Error(
        'Missing required env vars: ZG_SERVICE_URL, ZG_API_SECRET'
      );
    }

    this.client = new OpenAI({
      baseURL: serviceUrl,
      apiKey: apiSecret,
    });

    this.model = 'qwen/qwen-2.5-7b-instruct';
    this.anchorClient = createAnchorClient();

    console.log(`[ReflectionEngine] Initialized. Trigger every ${this.triggerEvery} turns.`);
    console.log(`[ReflectionEngine] Using 0G Compute model: ${this.model}`);
  }

  // ─── Tick ──────────────────────────────────────────────────────────────────

  /**
   * Call this after every agent turn.
   * Automatically triggers reflection when turn threshold is reached.
   */
  async tick(): Promise<ReflectionResult | null> {
    this.turnCount++;
    console.log(`[ReflectionEngine] Turn ${this.turnCount}/${this.lastReflectionAt + this.triggerEvery}`);

    if (this.turnCount - this.lastReflectionAt >= this.triggerEvery) {
      console.log(`[ReflectionEngine] Threshold reached. Starting reflection cycle...`);
      return await this.runReflection();
    }

    return null;
  }

  // ─── Core Reflection ───────────────────────────────────────────────────────

  /**
   * Run a full reflection cycle:
   * 1. Gather all current facts from 0G Storage
   * 2. Send to 0G Compute for compression and ranking
   * 3. Write insights back to 0G Storage
   * 4. Delete low-value facts
   * 5. Archive snapshot to 0G Storage Log
   */
  async runReflection(): Promise<ReflectionResult> {
    const startTime = Date.now();
    this.epochNumber++;

    console.log(`\n[ReflectionEngine] ═══ REFLECTION EPOCH ${this.epochNumber} ═══`);

    // Step 1: Gather all facts
    const facts = await this.memory.getAllFacts();
    console.log(`[ReflectionEngine] Gathered ${facts.length} facts for compression`);

    if (facts.length === 0) {
      console.log(`[ReflectionEngine] No facts to reflect on. Skipping.`);
      this.lastReflectionAt = this.turnCount;
      return {
        epochNumber: this.epochNumber,
        factsProcessed: 0,
        insightsGenerated: 0,
        factsDeleted: [],
        merkleRootHash: '',
        merkleFactCount: 0,
        snapshotRootHash: '',
        snapshotLabel: '',
        anchorTxHash: '',
        anchorBlockNumber: 0,
        durationMs: Date.now() - startTime,
        model: this.model,
      };
    }

    // Step 2: Compress via 0G Compute
    const compressed = await this.compressWithAI(facts);
    console.log(`[ReflectionEngine] AI returned ${compressed.insights.length} insights`);

    // Step 3: Write insights back to 0G Storage
    for (const item of compressed.insights) {
      await this.memory.writeInsight(
        item.key,
        item.insight,
        item.importance,
        this.epochNumber
      );
    }

    // Step 4a: Build deterministic Merkle snapshot
    const merkleSnapshot = VerifiableSnapshot.build(
      facts,
      this.epochNumber,
      this.memory.getSwarmId()
    );
    console.log(`[ReflectionEngine] Merkle root: ${merkleSnapshot.rootHash}`);
    console.log(`[ReflectionEngine] This root proves ${merkleSnapshot.factCount} facts`);

    // Step 4b: Log contradictions if any
    if (compressed.contradictions.length > 0) {
      console.warn(`[ReflectionEngine] Found ${compressed.contradictions.length} contradictions:`);
      for (const c of compressed.contradictions) {
        console.warn(`  ⚠ ${c.factKeyA} vs ${c.factKeyB}: ${c.description}`);
      }
    }

    // Step 5: Archive snapshot to 0G Storage Log
    const snapshot = await this.memory.snapshot(this.epochNumber);

    // Step 6: Anchor on 0G Chain
    let anchorResult: AnchorResult | null = null;
    try {
      anchorResult = await this.anchorClient.anchorSnapshot(
        this.memory.getSwarmId(),
        snapshot.rootHash,
        this.epochNumber,
        snapshot.label
      );
    } catch (anchorError) {
      console.warn('[ReflectionEngine] Chain anchor failed (non-fatal):', anchorError);
    }

    this.lastReflectionAt = this.turnCount;

    const result: ReflectionResult = {
      epochNumber: this.epochNumber,
      factsProcessed: facts.length,
      insightsGenerated: compressed.insights.length,
      factsDeleted: compressed.factsToDelete,
      merkleRootHash: merkleSnapshot.rootHash,
      merkleFactCount: merkleSnapshot.factCount,
      snapshotRootHash: snapshot.rootHash,
      snapshotLabel: snapshot.label,
      anchorTxHash: anchorResult?.txHash ?? '',
      anchorBlockNumber: anchorResult?.blockNumber ?? 0,
      durationMs: Date.now() - startTime,
      model: this.model,
    };

    console.log(`[ReflectionEngine] ═══ EPOCH ${this.epochNumber} COMPLETE ═══`);
    console.log(`  Facts processed : ${result.factsProcessed}`);
    console.log(`  Insights created: ${result.insightsGenerated}`);
    console.log(`  Merkle root : ${result.merkleRootHash}`);
    console.log(`  Prove facts : https://github.com/Techkeyy/memorymerge#merkle-verification`);
    console.log(`  Snapshot hash   : ${result.snapshotRootHash}`);
    console.log(`  Chain TX    : ${result.anchorTxHash ? 'https://chainscan-galileo.0g.ai/tx/' + result.anchorTxHash : 'pending/failed'}`);
    console.log(`  Duration        : ${result.durationMs}ms`);
    console.log(`  Verify at       : https://storagescan-galileo.0g.ai\n`);

    return result;
  }

  // ─── AI Compression ────────────────────────────────────────────────────────

  /**
   * Send facts to 0G Compute inference for compression and ranking.
   * Returns structured insights in JSON format.
   */
  private async compressWithAI(facts: FactEntry[]): Promise<CompressedMemory> {
    const factsList = facts
      .map((f, i) => `${i + 1}. [${f.key}] (confidence: ${f.confidence}): ${f.value}`)
      .join('\n');

    const prompt = `You are a memory compression engine for an AI agent swarm.

You have been given ${facts.length} raw facts collected by the swarm agents.
Your job is to compress, rank, and distill these into high-value insights.

RAW FACTS:
${factsList}

Return ONLY a valid JSON object with this exact structure — no preamble, no explanation:
{
  "insights": [
    {
      "key": "insight_1",
      "insight": "concise distilled insight text",
      "importance": 9
    }
  ],
  "factsToDelete": ["fact_key_1", "fact_key_2"],
  "contradictions": [
    {
      "factKeyA": "key1",
      "factKeyB": "key2", 
      "description": "brief description of contradiction"
    }
  ],
  "summary": "one sentence summary of what the swarm has learned"
}

Rules:
- Extract maximum 5 insights from all facts
- importance is 1-10, where 10 is most critical
- factsToDelete should list keys of redundant or low-value facts
- contradictions should list any facts that conflict with each other
- insights must be concrete and actionable, not vague
- Return valid JSON only. No markdown. No backticks.`;

    try {
      console.log(`[ReflectionEngine] Calling 0G Compute (${this.model})...`);

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a memory compression engine. Return only valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });

      const raw = response.choices[0]?.message?.content ?? '';
      console.log(`[ReflectionEngine] 0G Compute response received (${raw.length} chars)`);

      // Strip markdown code fences if present
      const cleaned = raw
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      const parsed: CompressedMemory = JSON.parse(cleaned);
      return parsed;
    } catch (error) {
      console.error(`[ReflectionEngine] AI compression failed:`, error);
      // Return safe fallback — do not crash the swarm
      return {
        insights: facts.slice(0, 3).map((f, i) => ({
          key: `fallback_insight_${i + 1}`,
          insight: f.value,
          importance: 5,
        })),
        factsToDelete: [],
        contradictions: [],
        summary: 'Reflection fallback — AI compression unavailable',
      };
    }
  }

  // ─── Manual Trigger ────────────────────────────────────────────────────────

  /**
   * Force a reflection cycle regardless of turn count.
   * Use this for testing or manual triggers.
   */
  async forceReflection(): Promise<ReflectionResult> {
    console.log(`[ReflectionEngine] Manual reflection triggered.`);
    return await this.runReflection();
  }

  // ─── State ─────────────────────────────────────────────────────────────────

  getTurnCount(): number {
    return this.turnCount;
  }

  getEpochNumber(): number {
    return this.epochNumber;
  }

  getTurnsUntilReflection(): number {
    return this.triggerEvery - (this.turnCount - this.lastReflectionAt);
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createReflectionEngine(
  memory: MemoryManager,
  triggerEvery: number = 20
): ReflectionEngine {
  return new ReflectionEngine({ memory, triggerEvery });
}