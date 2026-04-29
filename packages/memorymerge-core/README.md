# @memorymerge/core

> Pluggable decentralized memory layer for AI agent swarms.
> Powered by 0G Storage, 0G Compute, and 0G Chain.

Part of the [MemoryMerge](https://github.com/Techkeyy/memorymerge) framework.

## Install

```bash
git clone https://github.com/Techkeyy/memorymerge.git
cd memorymerge && npm install
```

## Quick Start

```typescript
import { createMemoryManager } from '@memorymerge/core';

const memory = createMemoryManager('my-agent');
await memory.writeFact('key', 'value', 0.9);
const context = await memory.getSwarmContext();
```

## Pluggable Adapters

```typescript
import { 
  StorageAdapter, 
  ZeroGStorageAdapter,
  TurnCountTrigger 
} from '@memorymerge/core';

// Implement your own storage:
class MyStorage implements StorageAdapter {
  async write(key: string, value: object): Promise<string> {
    // your implementation
    return 'hash';
  }
  async read(key: string): Promise<object | null> {
    return null;
  }
  list(prefix: string): string[] { return []; }
  async archive(snapshot: object, label: string): Promise<string> {
    return 'hash';
  }
  async downloadByHash(hash: string): Promise<object | null> {
    return null;
  }
}
```

## Merkle Verification

```typescript
import { VerifiableSnapshot, verifyFact } from '@memorymerge/core';

const snapshot = VerifiableSnapshot.build(facts, epoch, swarmId);
const proof = VerifiableSnapshot.generateProof(fact, snapshot);
const result = verifyFact(fact, snapshot.rootHash, proof.proof);
console.log(result.verified); // true
```

## Packages

| Package | Description |
|---------|-------------|
| `@memorymerge/core` | Core SDK — storage, memory, reflection, Merkle |
| `@memorymerge/openclaw` | OpenClaw skill integration |
