/**
 * MemoryMerge Verifiable Snapshots
 * 
 * Deterministic Merkle tree snapshots of swarm memory.
 * 
 * Any fact in any snapshot can be independently verified by anyone
 * with just the fact data and the root hash anchored on 0G Chain.
 * 
 * This makes MemoryMerge the only agent memory framework where you
 * can cryptographically prove what an AI agent knew at any point in time.
 * 
 * How it works:
 * 1. Sort facts deterministically by key
 * 2. Hash each fact with keccak256(key + value + confidence)
 * 3. Build a Merkle tree from the hashes
 * 4. Store root hash on 0G Chain via MemoryAnchor contract
 * 5. Anyone can verify any fact with the proof + root hash
 * 
 * @module VerifiableSnapshot
 */

import { ethers } from 'ethers';
import MerkleTree from 'merkletreejs';
import { FactEntry } from './memoryManager';

// ── Interfaces ─────────────────────────────────────────────────

export interface VerifiableSnapshotData {
  /** The Merkle root hash — anchor this on 0G Chain */
  rootHash: string;

  /** Total facts included in this snapshot */
  factCount: number;

  /** Epoch number this snapshot belongs to */
  epochNumber: number;

  /** ISO timestamp */
  createdAt: string;

  /** Swarm ID */
  swarmId: string;

  /** The leaves (hashed facts) for proof generation */
  leaves: string[];

  /** Ordered fact keys matching leaves */
  factKeys: string[];
}

export interface MerkleProof {
  /** The fact being proven */
  fact: FactEntry;

  /** Merkle proof path */
  proof: string[];

  /** The root hash to verify against */
  rootHash: string;

  /** Leaf hash of this fact */
  leaf: string;

  /** Whether this proof is valid */
  valid: boolean;
}

export interface SnapshotVerification {
  /** Whether the fact exists in the snapshot */
  verified: boolean;

  /** The fact that was verified */
  fact: FactEntry;

  /** Root hash used for verification */
  rootHash: string;

  /** Proof path used */
  proof: string[];

  /** Human-readable verification message */
  message: string;
}

// ── Deterministic Fact Hasher ──────────────────────────────────

/**
 * Deterministically hash a fact entry.
 * Same fact always produces same hash.
 * Any change to key, value, or confidence changes the hash.
 */
function hashFact(fact: FactEntry): string {
  const canonical = JSON.stringify({
    key: fact.key,
    value: fact.value,
    confidence: Math.round(fact.confidence * 1000) / 1000,
  });
  return ethers.keccak256(ethers.toUtf8Bytes(canonical));
}

// ── VerifiableSnapshot ─────────────────────────────────────────

export class VerifiableSnapshot {

  /**
   * Build a deterministic Merkle snapshot from swarm facts.
   * 
   * Facts are sorted by key for determinism — same set of facts
   * always produces the same root hash, regardless of insertion order.
   * 
   * @param facts - Array of facts from swarm memory
   * @param epochNumber - Current epoch number
   * @param swarmId - Swarm identifier
   * 
   * @example
   * const snapshot = VerifiableSnapshot.build(facts, 1, 'my-swarm');
   * console.log(snapshot.rootHash); // anchor this on 0G Chain
   */
  static build(
    facts: FactEntry[],
    epochNumber: number,
    swarmId: string
  ): VerifiableSnapshotData & { tree: MerkleTree } {
    if (facts.length === 0) {
      const emptyHash = ethers.keccak256(ethers.toUtf8Bytes('empty'));
      return {
        rootHash: emptyHash,
        factCount: 0,
        epochNumber,
        createdAt: new Date().toISOString(),
        swarmId,
        leaves: [],
        factKeys: [],
        tree: new MerkleTree([], ethers.keccak256),
      };
    }

    // Sort deterministically by key
    const sorted = [...facts].sort((a, b) => a.key.localeCompare(b.key));

    // Hash each fact
    const leaves = sorted.map(f => hashFact(f));
    const factKeys = sorted.map(f => f.key);

    // Build Merkle tree
    const tree = new MerkleTree(
      leaves,
      (data: Buffer) => Buffer.from(
        ethers.keccak256(new Uint8Array(data)).slice(2),
        'hex'
      ),
      { sortPairs: true }
    );

    const rootHash = '0x' + tree.getRoot().toString('hex');

    console.log(`[VerifiableSnapshot] Built Merkle tree:`);
    console.log(`  Facts     : ${facts.length}`);
    console.log(`  Root hash : ${rootHash}`);
    console.log(`  Epoch     : ${epochNumber}`);

    return {
      rootHash,
      factCount: facts.length,
      epochNumber,
      createdAt: new Date().toISOString(),
      swarmId,
      leaves,
      factKeys,
      tree,
    };
  }

  /**
   * Generate a Merkle proof for a specific fact.
   * 
   * The proof allows anyone to verify the fact was in the snapshot
   * without downloading the entire snapshot.
   * 
   * @param fact - The fact to generate a proof for
   * @param snapshotData - The snapshot containing the fact
   * 
   * @example
   * const proof = VerifiableSnapshot.generateProof(fact, snapshot);
   * console.log(proof.valid); // true if fact is in snapshot
   */
  static generateProof(
    fact: FactEntry,
    snapshotData: VerifiableSnapshotData & { tree: MerkleTree }
  ): MerkleProof {
    const leaf = hashFact(fact);
    const leafBuffer = Buffer.from(leaf.slice(2), 'hex');

    const proofBuffers = snapshotData.tree.getProof(leafBuffer);
    const proof = proofBuffers.map(p => '0x' + p.data.toString('hex'));

    const valid = snapshotData.tree.verify(
      proofBuffers,
      leafBuffer,
      snapshotData.tree.getRoot()
    );

    return {
      fact,
      proof,
      rootHash: snapshotData.rootHash,
      leaf,
      valid,
    };
  }

  /**
   * Verify a fact against a root hash using a Merkle proof.
   * 
   * This is the verification function — anyone can call this
   * with just the fact, proof, and root hash.
   * No access to the original snapshot needed.
   * 
   * @param fact - The fact to verify
   * @param rootHash - The root hash anchored on 0G Chain
   * @param proof - The Merkle proof path
   * 
   * @example
   * const result = VerifiableSnapshot.verify(fact, rootHash, proof);
   * if (result.verified) {
   *   console.log('Fact is cryptographically proven in this snapshot');
   * }
   */
  static verify(
    fact: FactEntry,
    rootHash: string,
    proof: string[]
  ): SnapshotVerification {
    try {
      const leaf = hashFact(fact);
      const leafBuffer = Buffer.from(leaf.slice(2), 'hex');
      const rootBuffer = Buffer.from(rootHash.slice(2), 'hex');

      const proofBuffers = proof.map(p => ({
        data: Buffer.from(p.slice(2), 'hex'),
      }));

      const tree = new MerkleTree([], (data: Buffer) =>
        Buffer.from(
          ethers.keccak256(new Uint8Array(data)).slice(2),
          'hex'
        ),
        { sortPairs: true }
      );

      const verified = tree.verify(proofBuffers, leafBuffer, rootBuffer);

      return {
        verified,
        fact,
        rootHash,
        proof,
        message: verified
          ? `✓ Fact cryptographically proven in snapshot ${rootHash.slice(0, 20)}...`
          : `✗ Fact NOT found in snapshot ${rootHash.slice(0, 20)}...`,
      };
    } catch (error) {
      return {
        verified: false,
        fact,
        rootHash,
        proof,
        message: `Verification error: ${error}`,
      };
    }
  }

  /**
   * Serialize snapshot data for storage (without the tree object).
   * Use this when storing snapshot metadata to 0G Storage.
   */
  static serialize(
    data: VerifiableSnapshotData & { tree: MerkleTree }
  ): VerifiableSnapshotData {
    const { tree: _tree, ...serializable } = data;
    return serializable;
  }
}

// ── Standalone verification (no tree needed) ───────────────────

/**
 * Verify a fact against a root hash without the original tree.
 * 
 * This is the public verification API — share the proof with
 * anyone and they can verify independently.
 * 
 * @example
 * // Share with a third party:
 * const { rootHash, proof } = await getProofFromSwarm(factKey);
 * const result = verifyFact(fact, rootHash, proof);
 */
export function verifyFact(
  fact: FactEntry,
  rootHash: string,
  proof: string[]
): SnapshotVerification {
  return VerifiableSnapshot.verify(fact, rootHash, proof);
}

/**
 * Hash a fact deterministically.
 * Useful for building custom verification flows.
 */
export function hashFactEntry(fact: FactEntry): string {
  return hashFact(fact);
}
