import { VerifiableSnapshot, verifyFact } from '../src/sdk/verifiableSnapshot';
import { FactEntry } from '../src/sdk/memoryManager';

const mockFacts: FactEntry[] = [
  {
    key: 'fact_001',
    value: '0G Labs provides decentralized AI storage',
    confidence: 0.9,
    authorAgent: 'researcher',
    timestamp: 1000000,
    reviewed: true,
  },
  {
    key: 'fact_002', 
    value: 'MemoryMerge uses Merkle proofs for verification',
    confidence: 0.85,
    authorAgent: 'researcher',
    timestamp: 1000001,
    reviewed: true,
  },
  {
    key: 'fact_003',
    value: '0G Compute provides TeeML verified inference',
    confidence: 0.8,
    authorAgent: 'researcher',
    timestamp: 1000002,
    reviewed: false,
  },
];

describe('VerifiableSnapshot', () => {
  it('builds a snapshot with a valid root hash', () => {
    const snapshot = VerifiableSnapshot.build(mockFacts, 1, 'test-swarm');
    expect(snapshot.rootHash).toBeDefined();
    expect(snapshot.rootHash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(snapshot.factCount).toBe(3);
    expect(snapshot.epochNumber).toBe(1);
    expect(snapshot.swarmId).toBe('test-swarm');
  });

  it('produces deterministic root hash for same facts', () => {
    const snap1 = VerifiableSnapshot.build(mockFacts, 1, 'test-swarm');
    const snap2 = VerifiableSnapshot.build(mockFacts, 1, 'test-swarm');
    expect(snap1.rootHash).toBe(snap2.rootHash);
  });

  it('produces different root hash when fact changes', () => {
    const snap1 = VerifiableSnapshot.build(mockFacts, 1, 'test-swarm');
    const modifiedFacts = [...mockFacts];
    modifiedFacts[0] = { ...modifiedFacts[0], value: 'modified value' };
    const snap2 = VerifiableSnapshot.build(modifiedFacts, 1, 'test-swarm');
    expect(snap1.rootHash).not.toBe(snap2.rootHash);
  });

  it('generates a valid proof for a fact', () => {
    const snapshot = VerifiableSnapshot.build(mockFacts, 1, 'test-swarm');
    const proof = VerifiableSnapshot.generateProof(mockFacts[0], snapshot);
    expect(proof.valid).toBe(true);
    expect(proof.proof).toBeDefined();
    expect(proof.leaf).toMatch(/^0x[a-f0-9]{64}$/);
  });

  it('verifies real fact as true and fake fact as false', () => {
    const snapshot = VerifiableSnapshot.build(mockFacts, 1, 'test-swarm');
    const proof = VerifiableSnapshot.generateProof(mockFacts[0], snapshot);

    const realResult = verifyFact(mockFacts[0], snapshot.rootHash, proof.proof);
    expect(realResult.verified).toBe(true);

    const fakeFact = { ...mockFacts[0], value: 'this is a fake fact' };
    const fakeResult = verifyFact(fakeFact, snapshot.rootHash, proof.proof);
    expect(fakeResult.verified).toBe(false);
  });
});
