/**
 * MemoryMerge — Cross-Swarm Knowledge Inheritance Demo
 * 
 * Demonstrates verifiable knowledge provenance:
 * - Swarm A researches a topic and creates a verified snapshot
 * - Swarm B inherits Swarm A's verified insights via 0G Storage PoRA
 * - The root hash anchored on 0G Chain IS the cryptographic proof
 * - Knowledge is provable, citable, and tamper-proof
 * 
 * Usage:
 *   npm run inherit
 *   npm run inherit -- --source 0x1781b155... --topic "DeFi protocols"
 */

import 'dotenv/config';
import { createMemoryManager } from '../src/sdk/memoryManager';
import { createReflectionEngine } from '../src/sdk/reflectionEngine';
import { createAnchorClient } from '../src/sdk/anchorClient';
import { MemoryMergeOrchestrator } from '../src/orchestrator/index';

function getArg(flag: string, fallback: string): string {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

async function runCrossSwarmDemo() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║   MemoryMerge — Cross-Swarm Knowledge Inheritance    ║');
  console.log('║   Verifiable knowledge provenance via 0G PoRA        ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // The verified source snapshot from our clean run
  const sourceRootHash = getArg(
    '--source',
    '0x1781b1553fbef4187767085f99064e9cdbee788b49f62fe63aa0e0dcab7ff467'
  );
  const sourceSwarmId = getArg('--source-swarm', 'memorymerge-demo-001');
  const newTopic = getArg('--topic', 'How can decentralized AI storage be applied to healthcare data in 2026');

  console.log('SOURCE SWARM');
  console.log(`  Swarm ID   : ${sourceSwarmId}`);
  console.log(`  Root Hash  : ${sourceRootHash}`);
  console.log(`  StorageScan: https://storagescan-galileo.0g.ai/tx/${sourceRootHash}`);
  console.log('');
  console.log('TARGET SWARM');
  console.log(`  New Topic  : ${newTopic}`);
  console.log(`  Swarm ID   : memorymerge-inherit-001\n`);

  // ── Step 1: Set up the new swarm ────────────────────────────
  console.log('STEP 1 — Initializing new swarm with inherited knowledge');
  console.log('─────────────────────────────────────────────────────────\n');

  process.env.SWARM_ID = 'memorymerge-inherit-001';
  const memory = createMemoryManager('memorymerge-inherit-001', 'inherit-agent');

  // ── Step 2: Inherit from source swarm ───────────────────────
  console.log('STEP 2 — Downloading verified snapshot from 0G Storage');
  console.log('         Proof: root hash anchored on 0G Chain via PoRA');
  console.log('─────────────────────────────────────────────────────────\n');

  try {
    const inheritance = await memory.inheritVerifiedInsights(
      sourceRootHash,
      sourceSwarmId,
      { minImportance: 7, maxInsights: 5, inheritFacts: true }
    );

    console.log('\n✓ INHERITANCE VERIFIED');
    console.log(`  Insights inherited : ${inheritance.insightsInherited}`);
    console.log(`  Facts inherited    : ${inheritance.factsInherited}`);
    console.log(`  Verified by        : ${sourceRootHash.slice(0, 30)}...`);
    console.log(`  Chain proof        : ${inheritance.chainProof}\n`);

  } catch (error) {
    console.error('Inheritance failed:', error);
    console.log('Continuing without inherited knowledge...\n');
  }

  // ── Step 3: Show what the new swarm starts with ─────────────
  console.log('STEP 3 — New swarm context after inheritance');
  console.log('─────────────────────────────────────────────────────────\n');

  const context = await memory.getSwarmContext();
  console.log(`Facts available    : ${context.facts.length}`);
  console.log(`Insights available : ${context.insights.length}`);
  console.log(`\nInherited insights:`);
  context.insights
    .sort((a, b) => b.importance - a.importance)
    .forEach((ins, i) => {
      console.log(`  ${i + 1}. [${ins.importance}/10] ${ins.insight}`);
    });

  // ── Step 4: Run a focused swarm on new topic ─────────────────
  console.log('\nSTEP 4 — Running focused swarm on new topic');
  console.log('         Starts with inherited knowledge — not from zero');
  console.log('─────────────────────────────────────────────────────────\n');

  const orchestrator = new MemoryMergeOrchestrator();
  const result = await orchestrator.run(newTopic, 1);

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║         Cross-Swarm Inheritance Demo Complete        ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`\nSource swarm  : ${sourceSwarmId}`);
  console.log(`Target swarm  : memorymerge-inherit-001`);
  console.log(`Facts in new swarm : ${result.factsWritten}`);
  console.log(`Insights generated : ${result.insightsGenerated}`);
  console.log(`\nProof of inheritance:`);
  console.log(`  Source snapshot : https://storagescan-galileo.0g.ai/tx/${sourceRootHash}`);
  if (result.snapshotRootHashes.length > 0) {
    console.log(`  New snapshot    : https://storagescan-galileo.0g.ai/tx/${result.snapshotRootHashes[0]}`);
  }
  console.log(`\nThe knowledge chain is cryptographically verifiable.`);
  console.log(`Any agent can trace insights back to their source swarm.`);
}

runCrossSwarmDemo().catch(console.error);