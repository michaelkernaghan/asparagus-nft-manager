export type ChainType = 'tezos' | 'stargaze';

export interface NFTMetadata {
  id: string;
  chainType: ChainType;
  name: string;
  collection?: string;
  description?: string;
  imageUrl?: string;
  attributes?: {
    contractAddress?: string;
    tokenId?: string;
    symbol?: string;
    [key: string]: any;
  };
}

export interface MarketData {
  floorPrice?: number;
  lastSalePrice?: number;
  currentListings?: number;
  currency: string;
  source?: string;  // Added source property
}

export interface ChainAdapter {
  getNFTs(walletAddress: string): Promise<NFTMetadata[]>;
  getMarketData(nft: NFTMetadata): Promise<MarketData>;
  listNFT(nft: NFTMetadata, price: number): Promise<boolean>;
}