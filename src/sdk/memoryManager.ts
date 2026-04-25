import 'dotenv/config';
import { ZeroGStorageClient, createStorageClient } from './storageClient';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface FactEntry {
  key: string;
  value: string;
  confidence: number;
  authorAgent: string;
  timestamp: number;
  reviewed: boolean;
}

export interface TaskPayload {
  taskId: string;
  status: 'pending' | 'in_progress' | 'pending_review' | 'complete';
  assignedTo: string;
  description: string;
  result?: string;
  createdAt: number;
  updatedAt: number;
}

export interface InsightEntry {
  key: string;
  insight: string;
  importance: number;
  generatedAt: number;
  epochNumber: number;
}

export interface SwarmContext {
  swarmId: string;
  goal: string;
  facts: FactEntry[];
  tasks: TaskPayload[];
  insights: InsightEntry[];
  lastUpdated: number;
}

export interface SnapshotResult {
  rootHash: string;
  timestamp: number;
  label: string;
  factCount: number;
  taskCount: number;
  insightCount: number;
}

// ─── MemoryManager ────────────────────────────────────────────────────────────

export class MemoryManager {
  private storage: ZeroGStorageClient;
  private swarmId: string;
  private agentId: string;

  constructor(swarmId: string, agentId: string, storage?: ZeroGStorageClient) {
    this.swarmId = swarmId;
    this.agentId = agentId;
    this.storage = storage ?? createStorageClient();
  }

  // ─── Key Builders ──────────────────────────────────────────────────────────

  private factKey(key: string): string {
    return `swarm/${this.swarmId}/facts/${key}`;
  }

  private taskKey(taskId: string): string {
    return `swarm/${this.swarmId}/tasks/${taskId}`;
  }

  private insightKey(key: string): string {
    return `swarm/${this.swarmId}/insights/${key}`;
  }

  private goalKey(): string {
    return `swarm/${this.swarmId}/context/current_goal`;
  }

  // ─── Facts ─────────────────────────────────────────────────────────────────

  /**
   * Write a fact to shared swarm memory.
   * Confidence starts low when first written — Critic agent raises it.
   */
  async writeFact(key: string, value: string, confidence: number = 0.0): Promise<void> {
    const entry: FactEntry = {
      key,
      value,
      confidence,
      authorAgent: this.agentId,
      timestamp: Date.now(),
      reviewed: false,
    };
    await this.storage.writeKV(this.factKey(key), entry);
    console.log(`[MemoryMerge] Fact written: "${key}" by ${this.agentId}`);
  }

  /**
   * Read a single fact from swarm memory.
   */
  async readFact(key: string): Promise<FactEntry | null> {
    const result = await this.storage.readKV(this.factKey(key));
    if (!result) return null;
    return result as FactEntry;
  }

  /**
   * Get all facts from swarm memory.
   */
  async getAllFacts(): Promise<FactEntry[]> {
    const prefix = `swarm/${this.swarmId}/facts/`;
    const keys = this.storage.listKeys(prefix);
    const facts: FactEntry[] = [];

    for (const key of keys) {
      const raw = await this.storage.readKV(key);
      if (raw) facts.push(raw as FactEntry);
    }

    return facts;
  }

  /**
   * Update confidence score on a fact — used by Critic agent.
   */
  async updateFactConfidence(
    key: string,
    confidence: number,
    reviewed: boolean
  ): Promise<void> {
    const existing = await this.readFact(key);
    if (!existing) {
      console.warn(`[MemoryMerge] Cannot update confidence — fact not found: "${key}"`);
      return;
    }
    const updated: FactEntry = {
      ...existing,
      confidence,
      reviewed,
    };
    await this.storage.writeKV(this.factKey(key), updated);
    console.log(`[MemoryMerge] Fact confidence updated: "${key}" → ${confidence}`);
  }

  // ─── Tasks ─────────────────────────────────────────────────────────────────

  /**
   * Write a task to shared swarm memory.
   */
  async writeTask(taskId: string, task: Omit<TaskPayload, 'taskId' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const entry: TaskPayload = {
      ...task,
      taskId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await this.storage.writeKV(this.taskKey(taskId), entry);
    console.log(`[MemoryMerge] Task written: "${taskId}" → ${task.status}`);
  }

  /**
   * Read a single task from swarm memory.
   */
  async readTask(taskId: string): Promise<TaskPayload | null> {
    const result = await this.storage.readKV(this.taskKey(taskId));
    if (!result) return null;
    return result as TaskPayload;
  }

  /**
   * Update task status — used by all agents to signal progress.
   */
  async updateTaskStatus(
    taskId: string,
    status: TaskPayload['status'],
    result?: string
  ): Promise<void> {
    const existing = await this.readTask(taskId);
    if (!existing) {
      console.warn(`[MemoryMerge] Cannot update task — not found: "${taskId}"`);
      return;
    }
    const updated: TaskPayload = {
      ...existing,
      status,
      result: result ?? existing.result,
      updatedAt: Date.now(),
    };
    await this.storage.writeKV(this.taskKey(taskId), updated);
    console.log(`[MemoryMerge] Task status updated: "${taskId}" → ${status}`);
  }

  /**
   * Get all tasks from swarm memory.
   */
  async getAllTasks(): Promise<TaskPayload[]> {
    const prefix = `swarm/${this.swarmId}/tasks/`;
    const keys = this.storage.listKeys(prefix);
    const tasks: TaskPayload[] = [];

    for (const key of keys) {
      const raw = await this.storage.readKV(key);
      if (raw) tasks.push(raw as TaskPayload);
    }

    return tasks;
  }

  // ─── Insights ──────────────────────────────────────────────────────────────

  /**
   * Write a distilled insight — produced by the reflection engine.
   */
  async writeInsight(
    key: string,
    insight: string,
    importance: number,
    epochNumber: number
  ): Promise<void> {
    const entry: InsightEntry = {
      key,
      insight,
      importance,
      generatedAt: Date.now(),
      epochNumber,
    };
    await this.storage.writeKV(this.insightKey(key), entry);
    console.log(`[MemoryMerge] Insight written: "${key}" importance=${importance}`);
  }

  /**
   * Get all insights from swarm memory.
   */
  async getAllInsights(): Promise<InsightEntry[]> {
    const prefix = `swarm/${this.swarmId}/insights/`;
    const keys = this.storage.listKeys(prefix);
    const insights: InsightEntry[] = [];

    for (const key of keys) {
      const raw = await this.storage.readKV(key);
      if (raw) insights.push(raw as InsightEntry);
    }

    return insights;
  }

  // ─── Goal ──────────────────────────────────────────────────────────────────

  /**
   * Set the current swarm goal.
   */
  async setGoal(goal: string): Promise<void> {
    await this.storage.writeKV(this.goalKey(), { goal, setAt: Date.now() });
    console.log(`[MemoryMerge] Goal set: "${goal}"`);
  }

  /**
   * Get the current swarm goal.
   */
  async getGoal(): Promise<string> {
    const result = await this.storage.readKV(this.goalKey());
    if (!result) return '';
    const entry = result as { goal: string };
    return entry.goal ?? '';
  }

  // ─── Swarm Context ─────────────────────────────────────────────────────────

  /**
   * Get the full swarm context — loaded by agents at the start of every turn.
   * This is the single most important method in the entire SDK.
   */
  async getSwarmContext(): Promise<SwarmContext> {
    const [goal, facts, tasks, insights] = await Promise.all([
      this.getGoal(),
      this.getAllFacts(),
      this.getAllTasks(),
      this.getAllInsights(),
    ]);

    return {
      swarmId: this.swarmId,
      goal,
      facts,
      tasks,
      insights,
      lastUpdated: Date.now(),
    };
  }

  // ─── Snapshot ──────────────────────────────────────────────────────────────

  /**
   * Archive the full current swarm context to 0G Storage Log.
   * Called at the end of every reflection cycle.
   * Returns root hash for on-chain anchoring.
   */
  async snapshot(epochNumber: number): Promise<SnapshotResult> {
    const context = await this.getSwarmContext();
    const label = `epoch-${epochNumber}-${Date.now()}`;

    const result = await this.storage.archiveSnapshot(context, label);

    console.log(`[MemoryMerge] Snapshot archived: ${label} → ${result.rootHash}`);

    return {
      rootHash: result.rootHash,
      timestamp: result.timestamp,
      label,
      factCount: context.facts.length,
      taskCount: context.tasks.length,
      insightCount: context.insights.length,
    };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Get the storage client — used by the reflection engine.
   */
  getStorageClient(): ZeroGStorageClient {
    return this.storage;
  }

  /**
   * Get swarm ID.
   */
  getSwarmId(): string {
    return this.swarmId;
  }

  /**
   * Get agent ID.
   */
  getAgentId(): string {
    return this.agentId;
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createMemoryManager(agentId: string, storage?: ZeroGStorageClient): MemoryManager;
export function createMemoryManager(swarmId: string, agentId: string, storage?: ZeroGStorageClient): MemoryManager;
export function createMemoryManager(
  first: string,
  second?: string | ZeroGStorageClient,
  third?: ZeroGStorageClient
): MemoryManager {
  if (typeof second === 'string') {
    return new MemoryManager(first, second, third);
  }

  const swarmId = process.env.SWARM_ID ?? 'memorymerge-swarm-001';
  return new MemoryManager(swarmId, first, second as ZeroGStorageClient | undefined);
}