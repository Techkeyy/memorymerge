import 'dotenv/config';
import { ethers } from 'hardhat';

async function main() {
  console.log('Deploying MemoryAnchor to 0G Galileo Testnet...');
  console.log('Network: 0G Galileo (chainId: 16602)');

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${ethers.formatEther(balance)} OG`);

  const MemoryAnchor = await ethers.getContractFactory('MemoryAnchor');
  const contract = await MemoryAnchor.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();

  console.log('\n✓ MemoryAnchor deployed successfully');
  console.log(`  Contract address : ${address}`);
  console.log(`  Network          : 0G Galileo Testnet`);
  console.log(`  Chain ID         : 16602`);
  console.log(`  Deployer         : ${deployer.address}`);
  console.log(`\n  View on explorer : https://chainscan-galileo.0g.ai/address/${address}`);
  console.log('\n⚠  Save this address — add it to your .env as:');
  console.log(`  MEMORY_ANCHOR_ADDRESS=${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
