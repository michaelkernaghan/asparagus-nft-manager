import { TezosAdapter } from './adapters/TezosAdapter';
import { CONFIG } from './config/config';

async function main() {
  try {
    const adapter = new TezosAdapter();
    const walletAddress = process.env.TEZOS_WALLET_ADDRESS;
    
    if (!walletAddress) {
      throw new Error('TEZOS_WALLET_ADDRESS not configured');
    }

    console.log(`Fetching NFTs for wallet: ${walletAddress}`);
    const nfts = await adapter.getNFTs(walletAddress);
    
    console.log(`Found ${nfts.length} NFTs`);
    for (const nft of nfts) {
      console.log('\nNFT Details:');
      console.log('-------------');
      console.log(`Name: ${nft.name}`);
      console.log(`Collection: ${nft.collection}`);
      console.log(`Contract: ${nft.attributes?.contractAddress}`);
      console.log(`Token ID: ${nft.attributes?.tokenId}`);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);