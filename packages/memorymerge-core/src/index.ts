/**
 * @memorymerge/core
 * 
 * Pluggable decentralized memory layer for AI agent swarms.
 * Powered by 0G Storage + Compute + Chain.
 * 
 * Install: npm install @memorymerge-sdk/core
 * 
 * @example
 * import { createMemoryManager, VerifiableSnapshot } from "@memorymerge/core";
 * const memory = createMemoryManager("my-agent");
 * await memory.writeFact("key", "value", 0.9);
 */

export { MemoryManager, createMemoryManager } from "./sdk/memoryManager";
export type { FactEntry, TaskPayload, InsightEntry, SwarmContext, SnapshotResult, InheritanceResult } from "./sdk/memoryManager";
export { ZeroGStorageClient, createStorageClient } from "./sdk/storageClient";
export { ReflectionEngine, createReflectionEngine } from "./sdk/reflectionEngine";
export type { ReflectionResult } from "./sdk/reflectionEngine";
export { AnchorClient, createAnchorClient } from "./sdk/anchorClient";
export type { AnchorResult } from "./sdk/anchorClient";
export { TurnCountTrigger, FactCountTrigger, TimedTrigger, CompositeTrigger, createZeroGConfig } from "./sdk/adapters";
export type { StorageAdapter, ComputeAdapter, AnchorAdapter, TriggerStrategy, TriggerContext, MemoryMergeConfig } from "./sdk/adapters";
export { ZeroGStorageAdapter, ZeroGComputeAdapter, ZeroGChainAnchor, createDefaultAdapters } from "./sdk/zeroGAdapters";
export { VerifiableSnapshot, verifyFact, hashFactEntry } from "./sdk/verifiableSnapshot";
export type { VerifiableSnapshotData, MerkleProof, SnapshotVerification } from "./sdk/verifiableSnapshot";
export { MemoryMergeSkill, createMemoryMergeSkill } from "./skill/MemoryMergeSkill";
export type { MemoryMergeSkillConfig, RecallResult, MemoryStats, OpenClawSkill } from "./skill/MemoryMergeSkill";
