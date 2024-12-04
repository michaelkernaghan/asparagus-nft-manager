import { TezosAdapter } from '../src/adapters/TezosAdapter';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config();

async function main() {
  const adapter = new TezosAdapter();
  
  try {
    const walletAddress = process.env.TEZOS_WALLET_ADDRESS;
    if (!walletAddress) {
      throw new Error('TEZOS_WALLET_ADDRESS not configured in .env');
    }
    
    console.log(`\nFetching NFTs for wallet: ${walletAddress}`);
    const nfts = await adapter.getNFTs(walletAddress);
    
    console.log(`\nFound ${nfts.length} NFTs\n`);
    
    for (const nft of nfts) {
      console.log('\nNFT Details:');
      console.log('-------------');
      console.log(`Name: ${nft.name}`);
      console.log(`Collection: ${nft.collection}`);
      console.log(`Description: ${nft.description}`);
      console.log(`Image URL: ${nft.imageUrl}`);
      console.log(`Contract: ${nft.attributes?.contractAddress}`);
      console.log(`Token ID: ${nft.attributes?.tokenId}`);
      
      if (nft.attributes && Object.keys(nft.attributes).length > 2) {
        console.log('\nAttributes:');
        for (const [key, value] of Object.entries(nft.attributes)) {
          if (key !== 'contractAddress' && key !== 'tokenId') {
            console.log(`${key}: ${value}`);
          }
        }
      }
      
      try {
        const marketData = await adapter.getMarketData(nft);
        console.log('\nMarket Data:');
        console.log('------------');
        console.log(`Floor Price: ${marketData.floorPrice || 'N/A'} ${marketData.currency}`);
        console.log(`Last Sale: ${marketData.lastSalePrice || 'N/A'} ${marketData.currency}`);
        console.log(`Active Listings: ${marketData.currentListings || 'N/A'}`);
      } catch (error) {
        console.error('Error fetching market data:', error);
      }
      
      console.log('\n-------------------');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);