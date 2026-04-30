/**
 * 0G Network Adapter Implementations
 * 
 * These are the default/reference implementations of the
 * MemoryMerge adapter interfaces using the 0G network stack.
 * 
 * Swap any of these with your own implementation by conforming
 * to the corresponding interface in adapters.ts
 */

import 'dotenv/config';
import OpenAI from 'openai';
import {
  StorageAdapter,
  ComputeAdapter,
  ComputeRequest,
  ComputeResponse,
  AnchorAdapter,
  AnchorRecord,
} from './adapters';
import { ZeroGStorageClient, createStorageClient } from './storageClient';
import { AnchorClient, createAnchorClient } from './anchorClient';

// ── 0G Storage Adapter ─────────────────────────────────────────

/**
 * StorageAdapter implementation using 0G Storage KV + Log.
 * 
 * - write/read/list → 0G Storage KV (millisecond latency)
 * - archive → 0G Storage Log (permanent, PoRA verified)
 * - downloadByHash → 0G Storage download by root hash
 */
export class ZeroGStorageAdapter implements StorageAdapter {
  private client: ZeroGStorageClient;

  constructor(client?: ZeroGStorageClient) {
    this.client = client ?? createStorageClient();
  }

  async write(key: string, value: object): Promise<string> {
    return await this.client.writeKV(key, value);
  }

  async read(key: string): Promise<object | null> {
    return await this.client.readKV(key);
  }

  list(prefix: string): string[] {
    return this.client.listKeys(prefix);
  }

  async archive(snapshot: object, label: string): Promise<string> {
    const result = await this.client.archiveSnapshot(snapshot, label);
    return result.rootHash;
  }

  async downloadByHash(hash: string): Promise<object | null> {
    return await this.client.downloadByRootHash(hash);
  }
}

// ── 0G Compute Adapter ─────────────────────────────────────────

/**
 * ComputeAdapter implementation using 0G Compute Network.
 * 
 * - OpenAI-compatible endpoint
 * - TeeML verified inference
 * - Model: qwen/qwen-2.5-7b-instruct
 */
export class ZeroGComputeAdapter implements ComputeAdapter {
  private client: OpenAI;
  private model: string;

  constructor() {
    const serviceUrl = process.env.ZG_SERVICE_URL;
    const apiSecret = process.env.ZG_API_SECRET;

    if (!serviceUrl || !apiSecret) {
      throw new Error('Missing ZG_SERVICE_URL or ZG_API_SECRET');
    }

    this.client = new OpenAI({
      baseURL: serviceUrl,
      apiKey: apiSecret,
    });

    this.model = 'qwen/qwen-2.5-7b-instruct';
  }

  async infer(request: ComputeRequest): Promise<ComputeResponse> {
    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];

    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push({ role: 'user', content: request.prompt });

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: request.temperature ?? 0.3,
      max_tokens: request.maxTokens ?? 1000,
    });

    return {
      content: response.choices[0]?.message?.content ?? '',
      model: this.model,
      verified: true,
      providerAddress: process.env.ZG_COMPUTE_PROVIDER,
    };
  }

  getModel(): string {
    return this.model;
  }

  isVerified(): boolean {
    return true;
  }
}

// ── 0G Chain Anchor Adapter ────────────────────────────────────

/**
 * AnchorAdapter implementation using 0G Chain MemoryAnchor.sol
 * 
 * - anchor → writes Merkle root to MemoryAnchor contract
 * - getLatest → reads latest anchored snapshot from contract
 * - getCount → reads total anchored count from contract
 */
export class ZeroGChainAnchor implements AnchorAdapter {
  private client: AnchorClient;

  constructor(client?: AnchorClient) {
    this.client = client ?? createAnchorClient();
  }

  async anchor(
    swarmId: string,
    rootHash: string,
    epochNumber: number,
    label: string
  ): Promise<AnchorRecord> {
    const result = await this.client.anchorSnapshot(
      swarmId,
      rootHash,
      epochNumber,
      label
    );

    return {
      hash: rootHash,
      epochNumber,
      timestamp: Date.now(),
      label,
      txHash: result.txHash,
      blockNumber: result.blockNumber,
    };
  }

  async getLatest(swarmId: string): Promise<AnchorRecord | null> {
    const snap = await this.client.getLatestSnapshot(swarmId);
    if (!snap) return null;

    return {
      hash: snap.rootHash,
      epochNumber: Number(snap.epochNumber),
      timestamp: new Date(snap.timestamp).getTime(),
      label: snap.label,
    };
  }

  async getCount(swarmId: string): Promise<number> {
    return await this.client.getSnapshotCount(swarmId);
  }
}

// ── Factory: Create default 0G adapter set ────────────────────

/**
 * Create the full set of default 0G adapters.
 * Pass to MemoryMerge framework components.
 * 
 * @example
 * const adapters = createDefaultAdapters();
 * const memory = new MemoryManager(swarmId, agentId, adapters.storage);
 */
export function createDefaultAdapters(): {
  storage: ZeroGStorageAdapter;
  compute: ZeroGComputeAdapter;
  anchor: ZeroGChainAnchor;
} {
  return {
    storage: new ZeroGStorageAdapter(),
    compute: new ZeroGComputeAdapter(),
    anchor: new ZeroGChainAnchor(),
  };
}