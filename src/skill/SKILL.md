# MemoryMerge Skill for OpenClaw

## What this skill does
Gives your OpenClaw agent persistent decentralized memory
backed by 0G Storage. Facts, tasks, and insights survive
session restarts, machine changes, and agent handoffs.

## Installation
Copy this file to your OpenClaw workspace:
~/.openclaw/workspace/skills/memory-merge/SKILL.md

## Usage in your agent
Your agent can use natural language commands:

- "remember that [fact]" → writes to 0G Storage KV
- "what do I know about [topic]" → reads from 0G Storage KV  
- "save a memory snapshot" → archives to 0G Storage Log
- "what have I learned so far" → returns full swarm context

## SDK integration
```typescript
import { createMemoryManager } from 'memorymerge';

const memory = createMemoryManager('my-openclaw-agent');

// Write a fact to 0G Storage
await memory.writeFact('user_preference', 'prefers TypeScript', 0.9);

// Read full context at start of every turn
const context = await memory.getSwarmContext();

// Pass context to your agent system prompt
const systemPrompt = `
You are a helpful assistant.
Here is what you remember:
${context.facts.map(f => f.value).join('\n')}
`;
```

## 0G components used
- 0G Storage KV: fast working memory (millisecond reads/writes)
- 0G Storage Log: permanent episodic archival
- 0G Chain: on-chain Merkle root anchoring
- 0G Compute: reflection intelligence (qwen/qwen-2.5-7b-instruct)

## Environment variables required
ZG_EVM_RPC=https://evmrpc-testnet.0g.ai
ZG_INDEXER_RPC=https://indexer-storage-testnet-turbo.0g.ai
ZG_PRIVATE_KEY=your_wallet_private_key
ZG_SERVICE_URL=your_0g_compute_service_url
ZG_API_SECRET=your_0g_compute_api_secret
MEMORY_ANCHOR_ADDRESS=0x4dbFC89D78Bc89578528a848B5bB5fC22b0C4079
SWARM_ID=your-unique-swarm-id

## How agent coordination works
Agents do not communicate directly.
They read and write to the same 0G Storage namespace.
Coordination happens through shared state — same pattern as Git.

swarm/{SWARM_ID}/facts/{key}     → researcher writes, critic scores
swarm/{SWARM_ID}/tasks/{taskId}  → planner writes, researcher executes
swarm/{SWARM_ID}/insights/{key}  → reflection engine writes
swarm/{SWARM_ID}/context/goal    → planner sets, all agents read

## Verified deployment
Contract : 0x4dbFC89D78Bc89578528a848B5bB5fC22b0C4079
Network  : 0G Galileo Testnet (chainId: 16602)
Live snapshot proof:
https://storagescan-galileo.0g.ai/tx/0x7443af76ed540c16eef8a84e3d6579dff70986644fb47476bf4d85473217e3eb