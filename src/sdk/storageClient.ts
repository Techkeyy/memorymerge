import 'dotenv/config';
import { Indexer, MemData } from '@0gfoundation/0g-ts-sdk';
import { ethers } from 'ethers';

export interface StorageEntry {
  key: string;
  value: object;
  rootHash: string;
  timestamp: number;
}

export interface ArchiveResult {
  rootHash: string;
  timestamp: number;
  label: string;
}

export class ZeroGStorageClient {
  private indexer: Indexer;
  private signer: ethers.Wallet;
  private rpcUrl: string;
  private keyIndex: Map<string, string>;

  constructor() {
    const rpcUrl = process.env.ZG_EVM_RPC;
    const indexerRpc = process.env.ZG_INDEXER_RPC;
    const privateKey = process.env.ZG_PRIVATE_KEY;

    if (!rpcUrl || !indexerRpc || !privateKey) {
      throw new Error(
        'Missing required env vars: ZG_EVM_RPC, ZG_INDEXER_RPC, ZG_PRIVATE_KEY'
      );
    }

    this.rpcUrl = rpcUrl;
    this.indexer = new Indexer(indexerRpc);
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, provider);
    this.keyIndex = new Map();
  }

  /**
   * Write a key-value pair to 0G Storage.
   * Serializes value to JSON, uploads as MemData, stores root hash in local index.
   */
  async writeKV(key: string, value: object): Promise<string> {
    try {
      const payload = JSON.stringify({ key, value, timestamp: Date.now() });
      const encoded = new TextEncoder().encode(payload);
      const file = new MemData(encoded);

      const [uploadResult, err] = await this.indexer.upload(
        file,
        this.rpcUrl,
        this.signer
      );

      const rootHash = 'rootHash' in uploadResult
        ? uploadResult.rootHash
        : uploadResult.rootHashes[0];

      if (err) throw new Error(`Upload failed: ${err}`);
      if (!rootHash) throw new Error('Upload returned no root hash');

      this.keyIndex.set(key, rootHash);
      this.persistIndex();

      console.log(`[0G Storage] Written key="${key}" rootHash=${rootHash}`);
      return rootHash;
    } catch (error) {
      throw new Error(`writeKV failed for key "${key}": ${error}`);
    }
  }

  /**
   * Read a value from 0G Storage by key.
   * Looks up the root hash from local index, downloads and parses the JSON.
   */
  async readKV(key: string): Promise<object | null> {
    try {
      const rootHash = this.keyIndex.get(key);
      if (!rootHash) {
        console.log(`[0G Storage] Key not found in index: "${key}"`);
        return null;
      }

      const outputPath = `./tmp_${Date.now()}.json`;
      const err = await this.indexer.download(rootHash, outputPath, true);
      if (err) throw new Error(`Download failed: ${err}`);

      const fs = await import('fs');
      const raw = fs.readFileSync(outputPath, 'utf8');
      fs.unlinkSync(outputPath);

      const parsed = JSON.parse(raw);
      return parsed.value;
    } catch (error) {
      console.error(`readKV failed for key "${key}": ${error}`);
      return null;
    }
  }

  /**
   * List all keys in the local index that match a given prefix.
   */
  listKeys(prefix: string): string[] {
    const results: string[] = [];
    for (const key of this.keyIndex.keys()) {
      if (key.startsWith(prefix)) {
        results.push(key);
      }
    }
    return results;
  }

  /**
   * Archive a full snapshot to 0G Storage Log layer.
   * Used for episodic memory archival after reflection cycles.
   */
  async archiveSnapshot(snapshot: object, label: string): Promise<ArchiveResult> {
    try {
      const payload = JSON.stringify({
        label,
        snapshot,
        archivedAt: Date.now(),
        type: 'episodic_archive'
      });

      const encoded = new TextEncoder().encode(payload);
      const file = new MemData(encoded);

      const [uploadResult, err] = await this.indexer.upload(
        file,
        this.rpcUrl,
        this.signer
      );

      const rootHash = 'rootHash' in uploadResult
        ? uploadResult.rootHash
        : uploadResult.rootHashes[0];

      if (err) throw new Error(`Archive upload failed: ${err}`);
      if (!rootHash) throw new Error('Archive upload returned no root hash');

      const result: ArchiveResult = {
        rootHash,
        timestamp: Date.now(),
        label
      };

      console.log(`[0G Storage] Archived snapshot label="${label}" rootHash=${rootHash}`);
      return result;
    } catch (error) {
      throw new Error(`archiveSnapshot failed: ${error}`);
    }
  }

  /**
   * Get the root hash for a key from the local index.
   */
  getRootHash(key: string): string | undefined {
    return this.keyIndex.get(key);
  }

  /**
   * Get all entries in the local index.
   */
  getAllIndexEntries(): Array<{ key: string; rootHash: string }> {
    const entries: Array<{ key: string; rootHash: string }> = [];
    for (const [key, rootHash] of this.keyIndex.entries()) {
      entries.push({ key, rootHash });
    }
    return entries;
  }

  /**
   * Persist the key index to disk so it survives process restarts.
   */
  private persistIndex(): void {
    try {
      const fs = require('fs');
      const path = require('path');
      const indexPath = path.join(process.cwd(), '.memory-index.json');
      const indexObj: Record<string, string> = {};
      for (const [k, v] of this.keyIndex.entries()) {
        indexObj[k] = v;
      }
      fs.writeFileSync(indexPath, JSON.stringify(indexObj, null, 2));
    } catch (e) {
      console.warn('[0G Storage] Could not persist index:', e);
    }
  }

  /**
   * Load the persisted key index from disk on startup.
   */
  loadIndex(): void {
    try {
      const fs = require('fs');
      const path = require('path');
      const indexPath = path.join(process.cwd(), '.memory-index.json');
      if (fs.existsSync(indexPath)) {
        const raw = fs.readFileSync(indexPath, 'utf8');
        const indexObj = JSON.parse(raw);
        for (const [k, v] of Object.entries(indexObj)) {
          this.keyIndex.set(k, v as string);
        }
        console.log(`[0G Storage] Loaded ${this.keyIndex.size} keys from index`);
      }
    } catch (e) {
      console.warn('[0G Storage] Could not load index:', e);
    }
  }
}

export function createStorageClient(): ZeroGStorageClient {
  const client = new ZeroGStorageClient();
  client.loadIndex();
  return client;
}