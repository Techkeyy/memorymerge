import 'dotenv/config';
import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    zgTestnet: {
      url: process.env.ZG_EVM_RPC ?? 'https://evmrpc-testnet.0g.ai',
      accounts: process.env.ZG_PRIVATE_KEY 
        ? [process.env.ZG_PRIVATE_KEY] 
        : [],
      chainId: 16602,
    },
  },
};

export default config;
