import { ChainType, NFTMetadata, MarketData } from '../types/nft';
import { TezosAdapter } from '../adapters/TezosAdapter';
import { StargazeAdapter } from '../adapters/StargazeAdapter';

export class NFTManager {
  private chainAdapters: Map<ChainType, TezosAdapter | StargazeAdapter>;

  constructor() {
    this.chainAdapters = new Map();
    // Initialize chain-specific adapters
    this.chainAdapters.set('tezos', new TezosAdapter());
    this.chainAdapters.set('stargaze', new StargazeAdapter());
  }

  async getNFTs(chainType: ChainType, walletAddress: string): Promise<NFTMetadata[]> {
    const adapter = this.chainAdapters.get(chainType);
    if (!adapter) throw new Error(`Unsupported chain: ${chainType}`);
    return adapter.getNFTs(walletAddress);
  }

  async getMarketData(nft: NFTMetadata): Promise<MarketData> {
    const adapter = this.chainAdapters.get(nft.chainType);
    if (!adapter) throw new Error(`Unsupported chain: ${nft.chainType}`);
    return adapter.getMarketData(nft);
  }

  async listNFT(nft: NFTMetadata, price: number): Promise<boolean> {
    const adapter = this.chainAdapters.get(nft.chainType);
    if (!adapter) throw new Error(`Unsupported chain: ${nft.chainType}`);
    return adapter.listNFT(nft, price);
  }
}