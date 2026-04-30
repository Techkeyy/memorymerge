import 'dotenv/config';
import { ethers } from 'ethers';

const MEMORY_ANCHOR_ABI = [
  'function anchorSnapshot(string calldata swarmId, bytes32 rootHash, uint256 epochNumber, string calldata label) external',
  'function setSwarmGoal(string calldata swarmId, string calldata goal) external',
  'function getSnapshotCount(string calldata swarmId) external view returns (uint256)',
  'function getLatestSnapshot(string calldata swarmId) external view returns (tuple(bytes32 rootHash, uint256 epochNumber, uint256 timestamp, address anchoredBy, string label))',
];

export interface AnchorResult {
  txHash: string;
  blockNumber: number;
  contractAddress: string;
  swarmId: string;
  epochNumber: number;
  rootHash: string;
}

export class AnchorClient {
  private contract: ethers.Contract;
  private signer: ethers.Wallet;
  private contractAddress: string;

  constructor() {
    const rpcUrl = process.env.ZG_EVM_RPC;
    const privateKey = process.env.ZG_PRIVATE_KEY;
    const contractAddress = process.env.MEMORY_ANCHOR_ADDRESS;

    if (!rpcUrl || !privateKey || !contractAddress) {
      throw new Error(
        'Missing: ZG_EVM_RPC, ZG_PRIVATE_KEY, or MEMORY_ANCHOR_ADDRESS'
      );
    }

    this.contractAddress = contractAddress;

    const provider = new ethers.JsonRpcProvider(rpcUrl, undefined, {
      staticNetwork: true,
    });

    (provider as any).getFeeData = async () => ({
      gasPrice: ethers.parseUnits('10', 'gwei'),
      maxFeePerGas: null,
      maxPriorityFeePerGas: null,
    });

    this.signer = new ethers.Wallet(privateKey, provider);
    this.contract = new ethers.Contract(
      contractAddress,
      MEMORY_ANCHOR_ABI,
      this.signer
    );
  }

  async anchorSnapshot(
    swarmId: string,
    rootHash: string,
    epochNumber: number,
    label: string
  ): Promise<AnchorResult> {
    try {
      console.log(`[AnchorClient] Anchoring epoch ${epochNumber} on 0G Chain...`);

      const paddedHash = rootHash.startsWith('0x')
        ? (rootHash.length === 66 ? rootHash : rootHash.padEnd(66, '0'))
        : ('0x' + rootHash.padEnd(64, '0'));

      const tx = await this.contract.anchorSnapshot(
        swarmId,
        paddedHash as `0x${string}`,
        epochNumber,
        label,
        { gasLimit: 200000 }
      );

      const receipt = await tx.wait();

      const result: AnchorResult = {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        contractAddress: this.contractAddress,
        swarmId,
        epochNumber,
        rootHash,
      };

      console.log(`[AnchorClient] ✓ Anchored on 0G Chain`);
      console.log(`  TX    : ${receipt.hash}`);
      console.log(`  Block : ${receipt.blockNumber}`);
      console.log(`  View  : https://chainscan-galileo.0g.ai/tx/${receipt.hash}`);

      return result;
    } catch (error) {
      console.error('[AnchorClient] Anchor failed:', error);
      throw error;
    }
  }

  async setSwarmGoal(swarmId: string, goal: string): Promise<string> {
    try {
      const tx = await this.contract.setSwarmGoal(swarmId, goal, {
        gasLimit: 200000,
      });
      const receipt = await tx.wait();
      console.log(`[AnchorClient] Goal set on-chain: ${receipt.hash}`);
      return receipt.hash;
    } catch (error) {
      console.warn('[AnchorClient] setSwarmGoal failed (non-fatal):', error);
      return '';
    }
  }

  async getSnapshotCount(swarmId: string): Promise<number> {
    try {
      const count = await this.contract.getSnapshotCount(swarmId);
      return Number(count);
    } catch {
      return 0;
    }
  }

  async getLatestSnapshot(swarmId: string): Promise<{
    rootHash: string;
    epochNumber: number;
    timestamp: string;
    anchoredBy: string;
    label: string;
  } | null> {
    try {
      const snap = await this.contract.getLatestSnapshot(swarmId);
      return {
        rootHash: snap.rootHash,
        epochNumber: Number(snap.epochNumber),
        timestamp: new Date(Number(snap.timestamp) * 1000).toISOString(),
        anchoredBy: snap.anchoredBy,
        label: snap.label,
      };
    } catch {
      return null;
    }
  }
}

export function createAnchorClient(): AnchorClient {
  return new AnchorClient();
}