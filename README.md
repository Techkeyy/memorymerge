<div align="center">

# MemoryMerge

### Decentralized Memory OS for AI Agent Swarms

**Cryptographic Knowledge Provenance · Pluggable · Self-Improving · Powered by 0G**

[![0G Network](https://img.shields.io/badge/0G-Galileo%20Testnet-blue)](https://0g.ai)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://typescriptlang.org)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-Compatible-purple)](https://openclaw.ai)
[![Track](https://img.shields.io/badge/Track-1%20%2B%202-gold)](https://ethglobal.com)
[![Merkle Verified](https://img.shields.io/badge/Merkle-Verified-purple)](https://github.com/Techkeyy/memorymerge#merkle-verification)

[Live Demo](#live-demo) · [Quick Start](#quick-start) · [Architecture](#architecture) · [0G Integration](#0g-integration) · [SDK Reference](#sdk-reference)

</div>

---

## The Problem

Every AI agent you run today has amnesia.

Restart it — memory gone. Switch machines — memory gone.
Run three agents on the same task — they cannot share 
what they learned.

But worse: even when agents do have memory, you cannot 
prove where that knowledge came from. Any agent can claim 
to know anything. There is no chain of custody for AI knowledge.

**MemoryMerge solves both problems at once.**

---

## What MemoryMerge Does

MemoryMerge is a **Verifiable Knowledge Provenance Layer** 
for multi-agent AI swarms.

It gives agents persistent decentralized memory backed by 
**0G Storage** — and critically, it makes that knowledge 
**cryptographically provable**. Any swarm can inherit verified 
insights from any previous swarm, with the root hash anchored 
on **0G Chain** as immutable proof via 0G Storage PoRA consensus.

```typescript
// Any OpenClaw agent gets persistent + provable memory
import { createMemoryManager } from 'memorymerge';

const memory = createMemoryManager('my-agent');

// Write to 0G Storage KV
await memory.writeFact('finding', 'value', confidence);

// Archive permanently to 0G Storage Log
const snap = await memory.snapshot(epoch);

// Inherit verified knowledge from another swarm
await memory.inheritVerifiedInsights(
  snap.rootHash,    // 0G Storage PoRA proof
  'source-swarm-id' // cryptographically verified
);
```

---

## How It Works

### The Swarm

Three specialized OpenClaw agents collaborate through shared memory on 0G Storage:
User gives goal to Planner
↓
[Planner Agent]
Reads swarm memory from 0G Storage KV
Breaks goal into 3 concrete subtasks
Writes tasks → swarm/{id}/tasks/{taskId}
↓
[Researcher Agent]
Reads pending tasks from 0G Storage KV
Executes research using 0G Compute inference
Writes facts → swarm/{id}/facts/{key}
Updates task → status: pending_review
↓
[Critic Agent]
Reads facts from 0G Storage KV
Scores confidence on each fact (0.0 - 1.0)
Updates fact confidence scores
Updates task → status: complete
↓
[Reflection Engine — fires every 8 turns]
Pulls all facts from 0G Storage KV
Sends to 0G Compute (qwen/qwen-2.5-7b-instruct, TeeML verified)
Compresses + ranks → distills into top 5 insights
Writes insights → swarm/{id}/insights/{key}
Archives full snapshot → 0G Storage Log (permanent + immutable)
Anchors Merkle root → MemoryAnchor contract on 0G Chain
↓
Swarm resumes — smarter, leaner, more focused than before

### Agent Coordination

Agents do not communicate directly. There is no message queue, no websocket, no API between agents.

**Coordination happens exclusively through 0G Storage state.**

This is the same pattern that makes Git work — shared state, not direct communication. The result is a swarm that is fully resumable, inspectable, and auditable at any point in time.

| Agent | Reads from 0G Storage | Writes to 0G Storage |
|-------|----------------------|---------------------|
| Planner | goal, all facts, all tasks, insights | new tasks (status: pending) |
| Researcher | pending tasks, existing facts | new facts (confidence: 0.0), task updates |
| Critic | pending_review tasks, raw facts | confidence scores, task: complete |
| Reflection Engine | all facts | insights, Log archive, Chain anchor |

### Memory Layers

| Layer | Technology | Purpose | Durability |
|-------|-----------|---------|------------|
| Working Memory | 0G Storage KV | Live facts, tasks, insights | Session + restart |
| Episodic Archive | 0G Storage Log | Immutable reflection snapshots | Permanent forever |
| On-chain Proof | 0G Chain (MemoryAnchor) | Merkle root anchoring | Permanent on-chain |
| Intelligence | 0G Compute (TeeML) | Compression + ranking | TEE-verified output |

---

## Live Demo

> **Demo:** https://memory-merge.vercel.app

**What the live demo shows:**
- A real research goal given to the swarm
- Memory Explorer dashboard — facts, tasks, and insights updating in real time from 0G Storage
- Reflection cycle firing — watch 20 raw facts compress into 5 ranked insights live
- Kill the swarm, restart it — full memory restored automatically from 0G Storage
- Snapshot root hashes verifiable directly on 0G StorageScan

## Cross-Swarm Knowledge Inheritance

The feature that makes MemoryMerge a trust layer, 
not just a storage layer.

Any new swarm can inherit verified insights from a previous 
swarm's anchored snapshot. The proof is the root hash itself — 
0G Storage's PoRA consensus means if data downloads and resolves 
to a hash anchored on 0G Chain, it is cryptographically verified.

```typescript
// Swarm B inherits from Swarm A's verified snapshot
await memory.inheritVerifiedInsights(
  '0x1781b1553fbef4187767085f99064e9cdbee788b49f62fe63aa0e0dcab7ff467',
  'memorymerge-demo-001',
  { minImportance: 7, maxInsights: 5, inheritFacts: true }
);
// Swarm B now starts with verified knowledge
// No re-research needed. Cryptographically provable.
```

**Live proof — two connected swarms on 0G:**

| Swarm | Root Hash | StorageScan |
|-------|-----------|-------------|
| memorymerge-demo-001 | 0x1781b155...ff467 | [Verify](https://storagescan-galileo.0g.ai/tx/0x1781b1553fbef4187767085f99064e9cdbee788b49f62fe63aa0e0dcab7ff467) |
| memorymerge-inherit-001 | 0xd3248931...80fc | [Verify](https://storagescan-galileo.0g.ai/tx/0xd3248931055ff35a2104a114f8e4d50493587d4af94ab6a0986dd035adab80fc) |

Run the demo: `npm run inherit`

## Plugin Adapter System

MemoryMerge is a modular framework. Every core component
is swappable via clean TypeScript interfaces.

```typescript
import { 
  StorageAdapter, 
  ComputeAdapter, 
  AnchorAdapter,
  TurnCountTrigger,
  FactCountTrigger,
  CompositeTrigger,
  ZeroGStorageAdapter,
  ZeroGComputeAdapter,
  ZeroGChainAnchor,
} from 'memorymerge';

// Use default 0G adapters
const storage = new ZeroGStorageAdapter();
const compute = new ZeroGComputeAdapter();
const anchor  = new ZeroGChainAnchor();

// Or implement your own:
class MyStorageAdapter implements StorageAdapter {
  async write(key: string, value: object): Promise<string> { ... }
  async read(key: string): Promise<object | null> { ... }
  list(prefix: string): string[] { ... }
  async archive(snapshot: object, label: string): Promise<string> { ... }
  async downloadByHash(hash: string): Promise<object | null> { ... }
}

// Combine triggers:
const trigger = new CompositeTrigger([
  new TurnCountTrigger(8),      // fire every 8 turns
  new FactCountTrigger(20),     // OR when facts exceed 20
]);
```

**Available interfaces:**
- `StorageAdapter` — swap 0G Storage for any backend
- `ComputeAdapter` — swap 0G Compute for any LLM
- `AnchorAdapter` — swap 0G Chain for any anchoring strategy
- `TriggerStrategy` — control when reflection fires

## OpenClaw Skill Integration

Drop MemoryMerge into any OpenClaw agent in three lines:

```typescript
import { createMemoryMergeSkill } from 'memorymerge/skill';

const skill = createMemoryMergeSkill({
  agentId: 'my-agent',
  swarmId: 'my-swarm-001',
  reflectionInterval: 8,
});

await skill.initialize();

// OpenClaw turn hooks:
const memoryContext = await skill.onTurnStart();
const systemPrompt  = basePrompt + memoryContext;
const response      = await callLLM(systemPrompt, userInput);
await skill.onTurnEnd(userInput, response);

// Direct memory operations:
await skill.remember('user prefers TypeScript', 0.9);
const results = await skill.recall('TypeScript');
const stats   = await skill.getStats();
await skill.reflect();
```

Run the OpenClaw reference implementation:
```bash
npm run openclaw -- --name "Alice" --goal "learn Solidity"
```

## Merkle Fact Verification

**MemoryMerge is the only agent memory framework where you
can cryptographically prove what an AI agent knew at any point in time.**

Every reflection cycle builds a deterministic Merkle tree
from the swarm's facts. The root hash is anchored on 0G Chain.
Anyone can verify any fact with just the proof and root hash —
no access to the original snapshot needed.

```typescript
import { VerifiableSnapshot, verifyFact } from 'memorymerge';

// Build a verifiable snapshot
const snapshot = VerifiableSnapshot.build(facts, epochNumber, swarmId);
console.log(snapshot.rootHash); // anchor this on 0G Chain

// Generate proof for a specific fact
const proof = VerifiableSnapshot.generateProof(fact, snapshot);

// Anyone can verify independently:
const result = verifyFact(fact, snapshot.rootHash, proof.proof);
console.log(result.verified); // true — cryptographically proven
```

**Live verification demo:**
```bash
npm run verify
# Real fact verified : true
# Fake fact rejected : true
# Merkle root        : 0x509a83ada122b9bd3a...
```

The Merkle root is anchored on 0G Chain via MemoryAnchor.sol.
Any fact can be proven or disproven by anyone with zero trust.

---

## Quick Start

### Prerequisites

- Node.js 20+
- A funded 0G Galileo testnet wallet (get tokens at https://faucet.0g.ai)
- 0G Compute CLI configured

### 1. Install

```bash
# From npm (published package)
npm install @memorymerge-sdk/core

npm install @memorymerge-sdk/core
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
# 0G Network - Galileo Testnet
ZG_EVM_RPC=https://evmrpc-testnet.0g.ai
ZG_INDEXER_RPC=https://indexer-storage-testnet-turbo.0g.ai
ZG_PRIVATE_KEY=your_testnet_wallet_private_key

# 0G Compute
ZG_COMPUTE_PROVIDER=0xa48f01287233509FD694a22Bf840225062E67836
ZG_SERVICE_URL=your_service_url_from_compute_cli
ZG_API_SECRET=your_app_sk_from_compute_cli

# Contract (already deployed — do not change)
MEMORY_ANCHOR_ADDRESS=0x4dbFC89D78Bc89578528a848B5bB5fC22b0C4079

# Swarm identity
SWARM_ID=memorymerge-swarm-001
```

### 3. Set up 0G Compute (one-time)

```bash
npm install -g @0glabs/0g-serving-broker

0g-compute-cli setup-network
0g-compute-cli login
0g-compute-cli deposit --amount 3

0g-compute-cli inference acknowledge-provider \
  --provider 0xa48f01287233509FD694a22Bf840225062E67836

0g-compute-cli inference get-secret \
  --provider 0xa48f01287233509FD694a22Bf840225062E67836
```

Copy the `app-sk-...` value into `ZG_API_SECRET` and the service URL into `ZG_SERVICE_URL`.

### 4. Run the working example

```bash
# Default research goal
npm run example

# Custom goal
npm run example -- "Research decentralized AI infrastructure in 2026"
```

### Available scripts

```bash
npm run example      # Research swarm demo
npm run agent        # Interactive agent with per-turn memory
npm run openclaw     # OpenClaw skill reference implementation  
npm run inherit      # Cross-swarm knowledge inheritance demo
npm run verify       # Merkle fact verification demo
npm run continuous   # Always-on autonomous swarm mode
```

### 5. Verify your memory on 0G StorageScan

After the run completes, the output will print snapshot root hashes.
Verify them at: **https://storagescan-galileo.0g.ai**
Verified snapshot: https://storagescan-galileo.0g.ai/tx/0x7443af76ed540c16eef8a84e3d6579dff70986644fb47476bf4d85473217e3eb

### 6. Restart and resume

Change nothing. Run the same command again with the same `SWARM_ID`.
The swarm loads all memory from 0G Storage and continues from where it stopped.

```bash
npm run example
# Swarm resumes — all facts, insights, and task history restored
```

## Interactive Agent Demo

The fastest way to see MemoryMerge working:

```bash
npm run agent -- --name "Alice" --goal "help me learn Solidity"
```

Have a conversation. Press Ctrl+C to exit.
Restart with the same command. Watch it remember everything.

**What happens under the hood:**
- Every turn: facts extracted and written to 0G Storage KV
- Every 8 turns: reflection engine fires via 0G Compute
- Ctrl+C: final snapshot archived to 0G Storage Log
- Restart: 0G Storage restores full context automatically

**Verified session continuity:**
Agent restored 11 facts and 5 insights across sessions —
all retrieved from 0G Storage nodes, zero local state.

---

## Architecture
┌─────────────────────────────────────────────────────────────────┐
│                      MemoryMerge Stack                          │
├─────────────────────────────────────────────────────────────────┤
│  Interface Layer                                                 │
│  ┌──────────────────────┐  ┌──────────────────────────────────┐ │
│  │   OpenClaw SKILL.md  │  │  Memory Explorer UI (Next.js)    │ │
│  │   Drop-in skill for  │  │  Live KV dashboard · snapshots   │ │
│  │   any OpenClaw agent │  │  reflection viewer · root hashes │ │
│  └──────────────────────┘  └──────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  Agent Layer                                                     │
│  ┌────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  Planner Agent │  │ Researcher Agent│  │   Critic Agent  │  │
│  │  Goal → Tasks  │  │ Tasks → Facts   │  │ Facts → Scores  │  │
│  └────────────────┘  └─────────────────┘  └─────────────────┘  │
│            All coordinate via 0G Storage state only             │
├─────────────────────────────────────────────────────────────────┤
│  MemoryMerge SDK                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  StorageClient   │  MemoryManager  │  ReflectionEngine  │    │
│  │  0g-ts-sdk wrap  │  Facts/Tasks/   │  0G Compute loop   │    │
│  │  KV + Log API    │  Insights/Goals │  compress + rank   │    │
│  └─────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│  0G Infrastructure                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │  0G Storage KV  │  │ 0G Storage Log  │  │   0G Compute   │  │
│  │  Working memory │  │ Episodic archive│  │ qwen-2.5-7b    │  │
│  │  facts · tasks  │  │ Permanent · PoRA│  │ TeeML verified │  │
│  │  insights· goals│  │ Merkle-rooted   │  │ OpenAI-compat  │  │
│  └─────────────────┘  └─────────────────┘  └────────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  0G Chain — MemoryAnchor Contract (EVM)                 │    │
│  │  Anchors snapshot root hashes permanently on-chain      │    │
│  │  0x4dbFC89D78Bc89578528a848B5bB5fC22b0C4079            │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘

---

## 0G Integration

MemoryMerge uses all four 0G components natively and meaningfully.

### 0G Storage KV — Working Memory

Fast millisecond-level reads and writes. Every fact, task, and insight
written during swarm execution lives here. Key structure:
swarm/{swarmId}/facts/{key}          → FactEntry
swarm/{swarmId}/tasks/{taskId}       → TaskPayload
swarm/{swarmId}/insights/{key}       → InsightEntry
swarm/{swarmId}/context/current_goal → GoalEntry

SDK used: `@0gfoundation/0g-ts-sdk` — Indexer class, upload/download via MemData

### 0G Storage Log — Episodic Archive

Permanent, immutable, append-only archival layer.
Every reflection cycle commits a full swarm context snapshot.
These snapshots live forever and are tamper-proof.
Root hashes are verifiable at storagescan-galileo.0g.ai.

### 0G Compute — Reflection Intelligence

Decentralized GPU inference for the reflection engine.
Model: `qwen/qwen-2.5-7b-instruct` with TeeML verification.
Provider: `0xa48f01287233509FD694a22Bf840225062E67836`

Every compression cycle:
1. Pulls all raw facts from 0G Storage KV
2. Sends to 0G Compute via OpenAI-compatible endpoint
3. Receives TEE-verified compressed insights
4. Writes ranked insights back to 0G Storage KV

### 0G Chain — On-Chain Anchoring

MemoryAnchor contract anchors snapshot Merkle roots on-chain.
Every reflection cycle produces a verifiable, permanent proof
that the memory archive is authentic and unmodified.
Contract : 0x4dbFC89D78Bc89578528a848B5bB5fC22b0C4079
Network  : 0G Galileo Testnet
Chain ID : 16602
Explorer : https://chainscan-galileo.0g.ai/address/0x4dbFC89D78Bc89578528a848B5bB5fC22b0C4079

---

## SDK Reference

```typescript
import { 
  createMemoryManager, 
  createReflectionEngine,
  createStorageClient 
} from 'memorymerge';

// Initialize memory manager for an agent
const memory = createMemoryManager('agent-id');

// ── Facts ──────────────────────────────────────────────────
await memory.writeFact('key', 'value', confidence);
await memory.readFact('key');
await memory.getAllFacts();
await memory.updateFactConfidence('key', 0.9, true);

// ── Tasks ──────────────────────────────────────────────────
await memory.writeTask('task-id', {
  status: 'pending',
  assignedTo: 'researcher',
  description: 'Research X'
});
await memory.updateTaskStatus('task-id', 'complete', result);
await memory.readTask('task-id');
await memory.getAllTasks();

// ── Insights ───────────────────────────────────────────────
await memory.writeInsight('key', 'insight text', importance, epoch);
await memory.getAllInsights();

// ── Goal ───────────────────────────────────────────────────
await memory.setGoal('research the state of decentralized AI');
await memory.getGoal();

// ── Full Context (most important method) ───────────────────
const context = await memory.getSwarmContext();
// Returns: { swarmId, goal, facts[], tasks[], insights[], lastUpdated }

// ── Snapshot to 0G Storage Log ─────────────────────────────
const result = await memory.snapshot(epochNumber);
// Returns: { rootHash, timestamp, label, factCount }
// Verify at: https://storagescan-galileo.0g.ai

// ── Reflection Engine ──────────────────────────────────────
const reflection = createReflectionEngine(memory, triggerEvery=20);
await reflection.tick();           // auto-triggers after N turns
await reflection.forceReflection(); // manual trigger
reflection.getTurnsUntilReflection();
```

---

## Project Structure
memorymerge/
├── src/
│   ├── sdk/
│   │   ├── storageClient.ts      # 0G Storage SDK wrapper (KV + Log)
│   │   ├── memoryManager.ts      # Core memory abstraction layer
│   │   ├── reflectionEngine.ts   # 0G Compute reflection loop
│   │   └── index.ts              # Barrel exports
│   ├── agents/
│   │   ├── plannerAgent.ts       # Breaks goals into tasks
│   │   ├── researcherAgent.ts    # Executes tasks, writes facts
│   │   └── criticAgent.ts        # Reviews facts, scores confidence
│   └── orchestrator/
│       └── index.ts              # Wires agents + runs swarm
├── contracts/
│   ├── MemoryAnchor.sol          # On-chain snapshot anchoring
│   └── deploy.ts                 # Deployment script
├── examples/
│   └── researchSwarm.ts          # Working example — run this first
├── ui/                           # Memory Explorer UI (Next.js)
├── hardhat.config.ts             # 0G Galileo testnet config
├── .env.example                  # Environment template
└── README.md

---

## Deployment

| Item | Value |
|------|-------|
| Network | 0G Galileo Testnet |
| Chain ID | 16602 |
| Contract | `0x4dbFC89D78Bc89578528a848B5bB5fC22b0C4079` |
| Contract Explorer | https://chainscan-galileo.0g.ai/address/0x4dbFC89D78Bc89578528a848B5bB5fC22b0C4079 |
| Storage Network | 0G Galileo Storage |
| Storage Explorer | https://storagescan-galileo.0g.ai |
| Compute Provider | `0xa48f01287233509FD694a22Bf840225062E67836` |
| Compute Model | `qwen/qwen-2.5-7b-instruct` (TeeML verified) |
| Live UI | https://memory-merge.vercel.app |

---

## Hackathon Tracks

Submitted to the **0G / Open Agents Hackathon** at ETHGlobal.

### Track 1 — Best Agent Framework, Tooling & Core Extensions

MemoryMerge is a reusable SDK and OpenClaw skill that adds persistent
decentralized memory to any agent or swarm framework. It is infrastructure,
not an app. Any OpenClaw developer can drop in the SKILL.md and get
persistent 0G Storage memory in three lines of code.

- Uses 0G Storage SDK natively for all memory operations
- Uses 0G Compute for autonomous reflection intelligence
- Drop-in OpenClaw SKILL.md for any existing agent
- Working example agent included in /examples

### Track 2 — Best Autonomous Agents, Swarms & iNFT Innovations

A live three-agent swarm (Planner + Researcher + Critic) that coordinates
exclusively through shared 0G Storage state — no direct agent communication.
Autonomous reflection loops run on 0G Compute every N turns, compressing
and improving the swarm's collective knowledge without human intervention.

- Three specialized agents with defined roles
- Coordination via 0G Storage state (explained above)
- Autonomous reflection powered by 0G Compute TeeML inference
- Permanent episodic archives on 0G Storage Log

---

## Team

| Name | Role | Contact |
|------|------|---------|
| Praise | Solo Builder | Telegram: @iszee23 |

**Telegram:** @iszee23  
**X (Twitter):** @yourXhandle

---

## License

MIT — see [LICENSE](LICENSE)

---

<div align="center">

Built for the **0G / Open Agents Hackathon** at ETHGlobal  
Powered by 0G Storage · 0G Compute · 0G Chain

**[GitHub](https://github.com/Techkeyy/memorymerge) · 
[Live Demo](https://memorymerge.vercel.app) · 
[Contract](https://chainscan-galileo.0g.ai/address/0x4dbFC89D78Bc89578528a848B5bB5fC22b0C4079)**

</div>
