/**
 * @memorymerge/core
 * 
 * Pluggable decentralized memory layer for AI agent swarms.
 * Powered by 0G Storage, 0G Compute, and 0G Chain.
 * 
 * @example
 * import { createMemoryManager, VerifiableSnapshot } from '@memorymerge/core';
 * 
 * const memory = createMemoryManager('my-agent');
 * await memory.writeFact('key', 'value', 0.9);
 * const snap = VerifiableSnapshot.build(facts, 1, 'swarm-id');
 */

// Core memory primitives
export {
  MemoryManager,
  createMemoryManager,
} from '../../../src/sdk/memoryManager';

export type {
  FactEntry,
  TaskPayload,
  InsightEntry,
  SwarmContext,
  SnapshotResult,
  InheritanceResult,
} from '../../../src/sdk/memoryManager';

// Storage client
export {
  ZeroGStorageClient,
  createStorageClient,
} from '../../../src/sdk/storageClient';

// Reflection engine
export {
  ReflectionEngine,
  createReflectionEngine,
} from '../../../src/sdk/reflectionEngine';

export type {
  ReflectionResult,
} from '../../../src/sdk/reflectionEngine';

// Anchor client
export {
  AnchorClient,
  createAnchorClient,
} from '../../../src/sdk/anchorClient';

export type {
  AnchorResult,
} from '../../../src/sdk/anchorClient';

// Plugin adapter interfaces
export {
  TurnCountTrigger,
  FactCountTrigger,
  TimedTrigger,
  CompositeTrigger,
  createZeroGConfig,
} from '../../../src/sdk/adapters';

export type {
  StorageAdapter,
  ComputeAdapter,
  AnchorAdapter,
  TriggerStrategy,
  TriggerContext,
  MemoryMergeConfig,
} from '../../../src/sdk/adapters';

// 0G reference adapter implementations
export {
  ZeroGStorageAdapter,
  ZeroGComputeAdapter,
  ZeroGChainAnchor,
  createDefaultAdapters,
} from '../../../src/sdk/zeroGAdapters';

// Merkle verification
export {
  VerifiableSnapshot,
  verifyFact,
  hashFactEntry,
} from '../../../src/sdk/verifiableSnapshot';

export type {
  VerifiableSnapshotData,
  MerkleProof,
  SnapshotVerification,
} from '../../../src/sdk/verifiableSnapshot';
