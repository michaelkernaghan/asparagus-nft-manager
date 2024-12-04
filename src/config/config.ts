import dotenv from 'dotenv';

dotenv.config();

export const CONFIG = {
  TEZOS: {
    RPC_URL: process.env.TEZOS_RPC_URL || 'https://mainnet.api.tez.ie',
    TZKT_API: process.env.TEZOS_TZKT_API || 'https://api.tzkt.io',
    MARKETPLACE_CONTRACT: process.env.TEZOS_MARKETPLACE_CONTRACT,
    MARKET_APIS: {
      OBJKT: process.env.TEZOS_OBJKT_API || 'https://api.objkt.com',
      TEIA: process.env.TEZOS_TEIA_API || 'https://api.teia.art',
      VERSUM: process.env.TEZOS_VERSUM_API || 'https://api.versum.xyz'
    }
  },
  STARGAZE: {
    RPC_URL: process.env.STARGAZE_RPC_URL || 'https://rpc.stargaze-apis.com',
    REST_URL: process.env.STARGAZE_REST_URL || 'https://rest.stargaze-apis.com',
    CHAIN_ID: process.env.STARGAZE_CHAIN_ID || 'stargaze-1'
  },
  APP: {
    PORT: parseInt(process.env.PORT || '3000', 10),
    ENV: process.env.NODE_ENV || 'development'
  }
};

// Type definitions for the config
export type Config = typeof CONFIG;
export type TezosConfig = typeof CONFIG.TEZOS;
export type StargazeConfig = typeof CONFIG.STARGAZE;
export type AppConfig = typeof CONFIG.APP;