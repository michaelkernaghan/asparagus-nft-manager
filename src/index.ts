import { NFTManager } from './services/NFTManager';

async function main() {
  const manager = new NFTManager();
  
  try {
    // Example usage
    const tezosNFTs = await manager.getNFTs('tezos', 'YOUR_TEZOS_WALLET_ADDRESS');
    console.log('Tezos NFTs:', tezosNFTs);
    
    const stargazeNFTs = await manager.getNFTs('stargaze', 'YOUR_STARGAZE_WALLET_ADDRESS');
    console.log('Stargaze NFTs:', stargazeNFTs);
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);