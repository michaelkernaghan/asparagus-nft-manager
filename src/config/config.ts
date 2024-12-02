import dotenv from 'dotenv';

dotenv.config();

export const CONFIG = {
  TEZOS: {
    RPC_URL: process.env.TEZOS_RPC_URL || 'https://mainnet.api.tez.ie',
    MARKETPLACE_CONTRACT: process.env.TEZOS_MARKETPLACE_CONTRACT,
  },
  STARGAZE: {
    RPC_URL: process.env.STARGAZE_RPC_URL || 'https://rpc.stargaze-apis.com',
    CHAIN_ID: process.env.STARGAZE_CHAIN_ID || 'stargaze-1',
  },
  APP: {
    PORT: process.env.PORT || 3000,
    ENV: process.env.NODE_ENV || 'development',
  }
};