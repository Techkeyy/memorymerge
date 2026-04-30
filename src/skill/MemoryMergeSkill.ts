/**
 * MemoryMerge OpenClaw Skill
 * 
 * A drop-in OpenClaw skill that gives any agent persistent
 * decentralized memory backed by 0G Storage.
 * 
 * Installation:
 *   Copy to ~/.openclaw/workspace/skills/memory-merge/
 *   Or import directly in your OpenClaw agent config.
 *   Package form: npm install @memorymerge-sdk/openclaw
 * 
 * Usage in OpenClaw agent:
 *   const skill = new MemoryMergeSkill({ agentId: 'my-agent' });
 *   await skill.initialize();
 *   
 *   // In your agent turn handler:
 *   const context = await skill.getContext();
 *   // Pass context to your system prompt
 *   await skill.remember('user prefers TypeScript', 0.9);
 * 
 * @module MemoryMergeSkill
 */

import 'dotenv/config';
import { MemoryManager, FactEntry, SwarmContext } from '../sdk/memoryManager';
import { createStorageClient } from '../sdk/storageClient';
import { createReflectionEngine } from '../sdk/reflectionEngine';
import { ReflectionEngine } from '../sdk/reflectionEngine';

// ── Interfaces ─────────────────────────────────────────────────

export interface MemoryMergeSkillConfig {
  /** Unique agent identifier */
  agentId: string;

  /** Swarm namespace — agents sharing a swarmId share memory */
  swarmId?: string;

  /** How many turns between reflection cycles. Default: 8 */
  reflectionInterval?: number;

  /** Whether to auto-reflect on turn tick. Default: true */
  autoReflect?: boolean;

  /** Minimum confidence to include in context. Default: 0.5 */
  minConfidence?: number;

  /** Maximum facts to include in context window. Default: 15 */
  maxContextFacts?: number;
}

export interface RecallResult {
  facts: FactEntry[];
  query: string;
  totalFacts: number;
}

export interface MemoryStats {
  factCount: number;
  insightCount: number;
  taskCount: number;
  turnCount: number;
  turnsUntilReflection: number;
  swarmId: string;
  agentId: string;
}

// ── OpenClaw Skill Interface ────────────────────────────────────

/**
 * OpenClaw skill interface.
 * MemoryMergeSkill implements this contract.
 */
export interface OpenClawSkill {
  name: string;
  description: string;
  initialize(): Promise<void>;
  onTurnStart(): Promise<string>;
  onTurnEnd(userInput: string, agentResponse: string): Promise<void>;
}

// ── MemoryMergeSkill ───────────────────────────────────────────

/**
 * OpenClaw skill providing persistent decentralized memory
 * via 0G Storage.
 * 
 * @implements {OpenClawSkill}
 */
export class MemoryMergeSkill implements OpenClawSkill {
  readonly name = 'memory-merge';
  readonly description = 'Persistent decentralized memory via 0G Storage. Survives restarts, shared across agents.';

  private memory: MemoryManager;
  private reflection: ReflectionEngine;
  private config: Required<MemoryMergeSkillConfig>;
  private initialized = false;
  private turnCount = 0;

  constructor(config: MemoryMergeSkillConfig) {
    this.config = {
      agentId: config.agentId,
      swarmId: config.swarmId ?? process.env.SWARM_ID ?? 'memorymerge-swarm-001',
      reflectionInterval: config.reflectionInterval ?? 8,
      autoReflect: config.autoReflect ?? true,
      minConfidence: config.minConfidence ?? 0.5,
      maxContextFacts: config.maxContextFacts ?? 15,
    };

    const storage = createStorageClient();
    this.memory = new MemoryManager(
      this.config.swarmId,
      this.config.agentId,
      storage
    );
    this.reflection = createReflectionEngine(
      this.memory,
      this.config.reflectionInterval
    );
  }

  // ── Lifecycle ─────────────────────────────────────────────────

  /**
   * Initialize the skill and load existing memory from 0G Storage.
   * Call this once before using the skill.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log(`[MemoryMerge] Initializing skill for agent: ${this.config.agentId}`);
    console.log(`[MemoryMerge] Swarm ID: ${this.config.swarmId}`);
    console.log(`[MemoryMerge] Loading memory from 0G Storage...`);

    const context = await this.memory.getSwarmContext();

    console.log(`[MemoryMerge] ✓ Loaded ${context.facts.length} facts`);
    console.log(`[MemoryMerge] ✓ Loaded ${context.insights.length} insights`);

    if (context.facts.length > 0) {
      console.log(`[MemoryMerge] Memory continuity confirmed — previous sessions restored`);
    } else {
      console.log(`[MemoryMerge] Fresh agent — no existing memory found`);
    }

    this.initialized = true;
  }

  // ── OpenClaw Skill Hooks ───────────────────────────────────────

  /**
   * Called at the start of every agent turn.
   * Returns formatted memory context to inject into system prompt.
   */
  async onTurnStart(): Promise<string> {
    if (!this.initialized) await this.initialize();

    const context = await this.memory.getSwarmContext();
    return this.formatContext(context);
  }

  /**
   * Called at the end of every agent turn.
   * Extracts and writes facts from the conversation to 0G Storage.
   * Ticks the reflection engine.
   */
  async onTurnEnd(userInput: string, agentResponse: string): Promise<void> {
    if (!this.initialized) await this.initialize();

    this.turnCount++;

    // Extract and store key information from this turn
    const factKey = `turn_${this.turnCount}_${Date.now()}`;
    const combinedText = `User: ${userInput}\nAgent: ${agentResponse}`;
    await this.memory.writeFact(factKey, combinedText.slice(0, 500), 0.7);

    // Auto-reflect if enabled
    if (this.config.autoReflect) {
      await this.reflection.tick();
    }
  }

  // ── Core Memory Operations ─────────────────────────────────────

  /**
   * Write a fact to persistent 0G Storage memory.
   * 
   * @param fact - The fact to remember
   * @param confidence - Confidence score 0.0-1.0 (default: 0.8)
   * @param key - Optional key override (auto-generated if not provided)
   * 
   * @example
   * await skill.remember('User prefers TypeScript over Python', 0.9);
   */
  async remember(
    fact: string,
    confidence: number = 0.8,
    key?: string
  ): Promise<void> {
    if (!this.initialized) await this.initialize();

    const factKey = key ?? `fact_${this.config.agentId}_${Date.now()}`;
    await this.memory.writeFact(factKey, fact, confidence);
    console.log(`[MemoryMerge] Remembered: "${fact.slice(0, 60)}..." (${(confidence * 100).toFixed(0)}% confidence)`);
  }

  /**
   * Recall facts matching a query string.
   * Searches fact values for the query term.
   * 
   * @param query - Search term
   * @param minConfidence - Minimum confidence filter
   * 
   * @example
   * const results = await skill.recall('TypeScript');
   * console.log(results.facts.map(f => f.value));
   */
  async recall(
    query: string,
    minConfidence?: number
  ): Promise<RecallResult> {
    if (!this.initialized) await this.initialize();

    const threshold = minConfidence ?? this.config.minConfidence;
    const context = await this.memory.getSwarmContext();

    const filtered = context.facts.filter(f =>
      f.confidence >= threshold &&
      f.value.toLowerCase().includes(query.toLowerCase())
    );

    return {
      facts: filtered,
      query,
      totalFacts: context.facts.length,
    };
  }

  /**
   * Get formatted memory context for injection into system prompt.
   * Returns a string ready to include in your agent's system prompt.
   * 
   * @example
   * const context = await skill.getContext();
   * const systemPrompt = `You are a helpful assistant.\n\n${context}`;
   */
  async getContext(): Promise<string> {
    if (!this.initialized) await this.initialize();

    const context = await this.memory.getSwarmContext();
    return this.formatContext(context);
  }

  /**
   * Get the full raw swarm context from 0G Storage.
   */
  async getRawContext(): Promise<SwarmContext> {
    if (!this.initialized) await this.initialize();
    return await this.memory.getSwarmContext();
  }

  /**
   * Force a reflection cycle immediately.
   * Compresses facts into insights via 0G Compute.
   * Archives snapshot to 0G Storage Log.
   */
  async reflect(): Promise<void> {
    if (!this.initialized) await this.initialize();
    console.log(`[MemoryMerge] Running manual reflection...`);
    const result = await this.reflection.forceReflection();
    console.log(`[MemoryMerge] Reflection complete. Snapshot: ${result.snapshotRootHash}`);
  }

  /**
   * Get memory statistics.
   */
  async getStats(): Promise<MemoryStats> {
    if (!this.initialized) await this.initialize();

    const context = await this.memory.getSwarmContext();

    return {
      factCount: context.facts.length,
      insightCount: context.insights.length,
      taskCount: context.tasks.length,
      turnCount: this.turnCount,
      turnsUntilReflection: this.reflection.getTurnsUntilReflection(),
      swarmId: this.config.swarmId,
      agentId: this.config.agentId,
    };
  }

  /**
   * Set the current goal for this agent's swarm.
   */
  async setGoal(goal: string): Promise<void> {
    if (!this.initialized) await this.initialize();
    await this.memory.setGoal(goal);
  }

  /**
   * Get the current goal.
   */
  async getGoal(): Promise<string> {
    if (!this.initialized) await this.initialize();
    return await this.memory.getGoal();
  }

  // ── Private Helpers ───────────────────────────────────────────

  private formatContext(context: SwarmContext): string {
    if (context.facts.length === 0 && context.insights.length === 0) {
      return 'No memory yet. This is a fresh session.';
    }

    const lines: string[] = ['## What you remember (from 0G Storage):'];

    // Top insights first
    if (context.insights.length > 0) {
      lines.push('\n### Key Insights:');
      context.insights
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 5)
        .forEach(ins => {
          lines.push(`- [${ins.importance}/10] ${ins.insight}`);
        });
    }

    // High confidence facts
    const topFacts = context.facts
      .filter(f => f.confidence >= this.config.minConfidence)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, this.config.maxContextFacts);

    if (topFacts.length > 0) {
      lines.push('\n### Facts:');
      topFacts.forEach(f => {
        lines.push(`- (${(f.confidence * 100).toFixed(0)}%) ${f.value}`);
      });
    }

    lines.push(`\n_Memory: ${context.facts.length} facts, ${context.insights.length} insights stored on 0G Storage_`);

    return lines.join('\n');
  }
}

// ── Factory ────────────────────────────────────────────────────

/**
 * Create a MemoryMergeSkill with default configuration.
 * 
 * @example
 * const skill = createMemoryMergeSkill({ agentId: 'my-agent' });
 * await skill.initialize();
 * 
 * // In your agent turn:
 * const context = await skill.onTurnStart();
 * const response = await callLLM(systemPrompt + context + userInput);
 * await skill.onTurnEnd(userInput, response);
 */
export function createMemoryMergeSkill(
  config: MemoryMergeSkillConfig
): MemoryMergeSkill {
  return new MemoryMergeSkill(config);
}