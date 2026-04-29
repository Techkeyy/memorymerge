/**
 * MemoryMerge Merkle Fact Verification Demo
 * 
 * Demonstrates cryptographic proof of agent knowledge.
 * 
 * Anyone can verify a specific fact was part of a swarm's
 * memory at a specific epoch — with zero trust required.
 * 
 * Usage:
 *   npm run verify
 */

import 'dotenv/config';
import { createMemoryManager } from '../src/sdk/memoryManager';
import { VerifiableSnapshot, verifyFact } from '../src/sdk/verifiableSnapshot';

async function runVerificationDemo() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║   MemoryMerge — Merkle Fact Verification Demo        ║');
  console.log('║   Cryptographic proof of agent knowledge             ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  console.log('This demo proves that specific facts existed in a swarm');
  console.log('at a specific epoch — cryptographically, with zero trust.\n');

  // ── Step 1: Load current swarm memory ─────────────────────
  console.log('STEP 1 — Loading swarm memory from 0G Storage...');
  const memory = createMemoryManager(
    process.env.SWARM_ID ?? 'memorymerge-demo-001',
    'verify-agent'
  );

  const context = await memory.getSwarmContext();
  console.log(`Loaded ${context.facts.length} facts from 0G Storage\n`);

  if (context.facts.length === 0) {
    console.log('No facts found. Run npm run example first.');
    return;
  }

  // ── Step 2: Build Merkle snapshot ─────────────────────────
  console.log('STEP 2 — Building deterministic Merkle snapshot...');
  const snapshot = VerifiableSnapshot.build(context.facts, 1, 
    process.env.SWARM_ID ?? 'memorymerge-demo-001');

  console.log(`Merkle root hash: ${snapshot.rootHash}`);
  console.log(`Facts included  : ${snapshot.factCount}`);
  console.log(`\nThis root hash can be anchored on 0G Chain.`);
  console.log(`Anyone with this hash can verify any fact.\n`);

  // ── Step 3: Generate proof for first fact ─────────────────
  const factToProve = context.facts[0];
  console.log('STEP 3 — Generating Merkle proof for fact:');
  console.log(`  Key   : ${factToProve.key}`);
  console.log(`  Value : ${factToProve.value.slice(0, 80)}...`);
  console.log(`  Conf  : ${(factToProve.confidence * 100).toFixed(0)}%\n`);

  const proof = VerifiableSnapshot.generateProof(factToProve, snapshot);
  console.log(`Proof path (${proof.proof.length} nodes):`);
  proof.proof.forEach((p, i) => console.log(`  [${i}] ${p}`));
  console.log('');

  // ── Step 4: Verify the proof ───────────────────────────────
  console.log('STEP 4 — Verifying proof independently...');
  console.log('(Simulating third-party verification — no snapshot needed)\n');

  const verification = verifyFact(factToProve, snapshot.rootHash, proof.proof);

  console.log(verification.message);
  console.log(`\nVerified: ${verification.verified}`);

  // ── Step 5: Try to fake a fact ────────────────────────────
  console.log('\nSTEP 5 — Attempting to verify a FAKE fact...');
  const fakeFact = {
    ...factToProve,
    value: 'This is a fake fact that was not in the original snapshot',
  };

  const fakeVerification = verifyFact(fakeFact, snapshot.rootHash, proof.proof);
  console.log(fakeVerification.message);
  console.log(`Verified: ${fakeVerification.verified}`);

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║                 VERIFICATION COMPLETE               ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`\nReal fact verified : ${verification.verified}`);
  console.log(`Fake fact rejected : ${!fakeVerification.verified}`);
  console.log(`\nMerkle root        : ${snapshot.rootHash}`);
  console.log(`\nThis is the only agent memory framework that provides`);
  console.log(`cryptographic proof of what an AI agent knew.`);
  console.log(`\nAnchor this root on 0G Chain → anyone can verify forever.`);
}

runVerificationDemo().catch(console.error);
