export enum NetworkType {
    MAINNET = 'mainnet'
  }
  
  export class BeaconWallet {
    constructor(options: any) {}
    
    async getPKH(): Promise<string> {
      return 'tz1...';
    }
  }
  
  export class TezosToolkit {
    constructor(rpc: string) {}
    
    setWalletProvider(wallet: any): void {}
    
    contract = {
      at: async (address: string) => ({
        storage: async () => {
          if (address === 'KT1bad') {
            return {
              token_metadata: {
                get: async () => null
              }
            };
          }
          return {
            token_metadata: {
              get: async (tokenId: string) => ({
                token_id: tokenId,
                token_info: {
                  name: 'Test NFT #1',
                  description: 'A test NFT',
                  artifactUri: 'ipfs://test',
                  thumbnailUri: 'ipfs://thumbnail'
                }
              })
            }
          };
        }
      })
    }
  }