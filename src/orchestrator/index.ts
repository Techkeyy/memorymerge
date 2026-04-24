import 'dotenv/config';
import { createStorageClient } from '../sdk/storageClient';
import { createMemoryManager } from '../sdk/memoryManager';
import { createReflectionEngine } from '../sdk/reflectionEngine';
import { PlannerAgent } from '../agents/plannerAgent';
import { ResearcherAgent } from '../agents/researcherAgent';
import { CriticAgent } from '../agents/criticAgent';

// ─── Swarm State ──────────────────────────────────────────────────────────────

export interface SwarmRunResult {
  goal: string;
  swarmId: string;
  totalTurns: number;
  tasksCompleted: number;
  factsWritten: number;
  insightsGenerated: number;
  reflectionEpochs: number;
  snapshotRootHashes: string[];
  durationMs: number;
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export class MemoryMergeOrchestrator {
  private swarmId: string;
  private snapshotHashes: string[] = [];

  constructor() {
    this.swarmId = process.env.SWARM_ID ?? 'memorymerge-swarm-001';
  }

  /**
   * Run the full MemoryMerge swarm against a research goal.
   * This is the main entry point for the entire system.
   *
   * Flow:
   * 1. Planner reads goal → creates tasks in 0G Storage
   * 2. Researcher reads tasks → executes → writes facts to 0G Storage  
   * 3. Critic reads facts → scores confidence → marks tasks complete
   * 4. Planner reviews progress → reflection engine compresses memory
   * 5. Repeat until all tasks complete
   * 6. Final snapshot archived to 0G Storage Log
   */
  async run(goal: string, maxCycles: number = 3): Promise<SwarmRunResult> {
    const startTime = Date.now();

    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║          MemoryMerge Swarm Starting            ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log(`Goal    : ${goal}`);
    console.log(`SwarmID : ${this.swarmId}`);
    console.log(`Cycles  : ${maxCycles}`);
    console.log(`Network : 0G Galileo Testnet`);
    console.log('─────────────────────────────────────────────────\n');

    // ── Initialize SDK layers ──────────────────────────────────────────────
    console.log('[Orchestrator] Initializing 0G Storage client...');
    const storage = createStorageClient();

    console.log('[Orchestrator] Initializing Memory Manager...');
    const plannerMemory = createMemoryManager('planner', storage);
    const researcherMemory = createMemoryManager('researcher', storage);
    const criticMemory = createMemoryManager('critic', storage);

    console.log('[Orchestrator] Initializing Reflection Engine...');
    const reflection = createReflectionEngine(plannerMemory, 6);

    // ── Initialize Agents ─────────────────────────────────────────────────
    console.log('[Orchestrator] Initializing agents...');
    const planner = new PlannerAgent(plannerMemory, reflection);
    const researcher = new ResearcherAgent(researcherMemory, reflection);
    const critic = new CriticAgent(criticMemory, reflection);

    console.log('[Orchestrator] All agents ready. Starting swarm.\n');

    // ── Phase 1: Planner initializes swarm ────────────────────────────────
    await planner.initializeSwarm(goal);

    // ── Main Swarm Loop ───────────────────────────────────────────────────
    let totalTurns = 0;

    for (let cycle = 1; cycle <= maxCycles; cycle++) {
      console.log(`\n╔═══ CYCLE ${cycle}/${maxCycles} ═══════════════════════════════╗`);

      // Researcher executes all pending tasks
      console.log(`\n[Orchestrator] Researcher phase...`);
      let researcherWorked = true;
      let researchTurns = 0;

      while (researcherWorked && researchTurns < 5) {
        researcherWorked = await researcher.executeNextTask();
        if (researcherWorked) {
          totalTurns++;
          researchTurns++;
        }
      }

      // Critic reviews all pending_review tasks
      console.log(`\n[Orchestrator] Critic phase...`);
      const reviewed = await critic.reviewPendingTasks();
      totalTurns += reviewed;

      // Planner reviews progress
      console.log(`\n[Orchestrator] Planner review phase...`);
      const assessment = await planner.reviewAndPlan();
      totalTurns++;

      // Check if reflection was triggered during this cycle
      const turnsLeft = reflection.getTurnsUntilReflection();
      console.log(`\n[Orchestrator] Cycle ${cycle} complete.`);
      console.log(`  Total turns      : ${totalTurns}`);
      console.log(`  Reflection epoch : ${reflection.getEpochNumber()}`);
      console.log(`  Turns to next ↺  : ${turnsLeft}`);
    }

    // ── Final Snapshot ─────────────────────────────────────────────────────
    console.log('\n[Orchestrator] Running final reflection and snapshot...');
    const finalReflection = await reflection.forceReflection();
    if (finalReflection.snapshotRootHash) {
      this.snapshotHashes.push(finalReflection.snapshotRootHash);
    }

    // ── Final Context Summary ──────────────────────────────────────────────
    const finalContext = await plannerMemory.getSwarmContext();

    const result: SwarmRunResult = {
      goal,
      swarmId: this.swarmId,
      totalTurns,
      tasksCompleted: finalContext.tasks.filter(t => t.status === 'complete').length,
      factsWritten: finalContext.facts.length,
      insightsGenerated: finalContext.insights.length,
      reflectionEpochs: reflection.getEpochNumber(),
      snapshotRootHashes: this.snapshotHashes,
      durationMs: Date.now() - startTime,
    };

    // ── Print Summary ──────────────────────────────────────────────────────
    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║          MemoryMerge Swarm Complete            ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log(`Goal              : ${result.goal}`);
    console.log(`Total turns       : ${result.totalTurns}`);
    console.log(`Tasks completed   : ${result.tasksCompleted}`);
    console.log(`Facts written     : ${result.factsWritten}`);
    console.log(`Insights generated: ${result.insightsGenerated}`);
    console.log(`Reflection epochs : ${result.reflectionEpochs}`);
    console.log(`Duration          : ${(result.durationMs / 1000).toFixed(1)}s`);
    console.log('\nSnapshot hashes (verify on 0G StorageScan):');
    for (const hash of result.snapshotRootHashes) {
      console.log(`  → ${hash}`);
      console.log(`    https://storagescan-galileo.0g.ai/tx/${hash}`);
    }
    console.log('─────────────────────────────────────────────────\n');

    return result;
  }
}

// ─── CLI Entry Point ──────────────────────────────────────────────────────────

async function main() {
  const goal = process.argv[2] ?? 'Research the current state of decentralized AI infrastructure in 2026';

  const orchestrator = new MemoryMergeOrchestrator();

  try {
    const result = await orchestrator.run(goal, 3);
    console.log('[Orchestrator] Run complete. Result saved.');
    process.exit(0);
  } catch (error) {
    console.error('[Orchestrator] Fatal error:', error);
    process.exit(1);
  }
}

main();