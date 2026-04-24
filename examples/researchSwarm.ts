/**
 * MemoryMerge — Working Example Agent
 * 
 * This file demonstrates a complete MemoryMerge swarm run.
 * Three agents (Planner, Researcher, Critic) collaborate via
 * shared persistent memory on 0G Storage.
 *
 * Usage:
 *   npm run example
 *   npm run example -- "your custom research goal here"
 *
 * What this demonstrates:
 *   ✓ 0G Storage KV writes (facts, tasks, insights)
 *   ✓ 0G Storage Log archival (episodic snapshots)
 *   ✓ 0G Compute inference (qwen/qwen-2.5-7b-instruct via TeeML)
 *   ✓ Multi-agent coordination via shared memory state
 *   ✓ Autonomous reflection and memory compression
 *   ✓ Session persistence — restart with same SWARM_ID to resume
 */

import 'dotenv/config';
import { MemoryMergeOrchestrator } from '../src/orchestrator/index';

async function runExample() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║         MemoryMerge — Working Example              ║');
  console.log('║  Decentralized Memory OS for AI Agent Swarms       ║');
  console.log('║  Powered by 0G Storage + 0G Compute                ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  // The research goal — change this to anything you want
  const goal = process.argv[2] 
    ?? 'Research the current state of decentralized AI infrastructure and key projects in 2026';

  console.log(`Research Goal: "${goal}"\n`);
  console.log('What will happen:');
  console.log('  1. Planner agent breaks goal into tasks → writes to 0G Storage');
  console.log('  2. Researcher agent executes tasks → writes facts to 0G Storage');
  console.log('  3. Critic agent reviews facts → updates confidence scores');
  console.log('  4. Reflection engine compresses memory via 0G Compute inference');
  console.log('  5. Final snapshot archived to 0G Storage Log permanently');
  console.log('  6. Restart with same SWARM_ID — swarm resumes from memory\n');
  console.log('─────────────────────────────────────────────────────\n');

  const orchestrator = new MemoryMergeOrchestrator();

  try {
    const result = await orchestrator.run(goal, 2);

    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║              Example Run Complete                  ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log(`\nFacts written to 0G Storage    : ${result.factsWritten}`);
    console.log(`Insights generated             : ${result.insightsGenerated}`);
    console.log(`Tasks completed                : ${result.tasksCompleted}`);
    console.log(`Reflection cycles run          : ${result.reflectionEpochs}`);
    console.log(`Total duration                 : ${(result.durationMs / 1000).toFixed(1)}s`);

    if (result.snapshotRootHashes.length > 0) {
      console.log('\nVerify your memory snapshots on 0G StorageScan:');
      for (const hash of result.snapshotRootHashes) {
        console.log(`  https://storagescan-galileo.0g.ai/tx/${hash}`);
      }
    }

    console.log('\nTo resume this swarm in a new session:');
    console.log(`  Set SWARM_ID=${result.swarmId} in your .env`);
    console.log('  Run: npm run example');
    console.log('  The swarm will load all memory from 0G Storage automatically.\n');

  } catch (error) {
    console.error('\n[Example] Fatal error:', error);
    console.error('\nTroubleshooting:');
    console.error('  1. Check your .env file has all required values');
    console.error('  2. Ensure your 0G wallet has testnet tokens');
    console.error('  3. Run: 0g-compute-cli inference list-providers');
    console.error('  4. Verify ZG_SERVICE_URL and ZG_API_SECRET are set');
    process.exit(1);
  }
}

runExample();