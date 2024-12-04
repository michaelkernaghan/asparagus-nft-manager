import dotenv from 'dotenv';

dotenv.config();

export const CONFIG = {
  TEZOS: {
    RPC_URL: process.env.TEZOS_RPC_URL || 'https://mainnet.api.tez.ie',
    TZKT_API: process.env.TEZOS_TZKT_API || 'https://api.tzkt.io',
    MARKETPLACE_CONTRACT: process.env.TEZOS_MARKETPLACE_CONTRACT,
    MARKET_APIS: {
      OBJKT: process.env.TEZOS_OBJKT_API || 'https://api.objkt.com',
      TEIA: process.env.TEZOS_TEIA_API || 'https://api.teia.art'
    }
  },
  APP: {
    PORT: parseInt(process.env.PORT || '3000', 10),
    ENV: process.env.NODE_ENV || 'development'
  }
};

export type Config = typeof CONFIG;