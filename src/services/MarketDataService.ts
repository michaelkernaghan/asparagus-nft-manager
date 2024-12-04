import { NFTMetadata, MarketData } from '../types/nft';
import { CONFIG } from '../config/config';

interface MarketplaceProvider {
  name: string;
  getMarketData: (nft: NFTMetadata) => Promise<MarketData | null>;
}

class ObjktProvider implements MarketplaceProvider {
  name = 'Objkt';

  async getMarketData(nft: NFTMetadata): Promise<MarketData | null> {
    try {
      const url = `${CONFIG.TEZOS.MARKET_APIS.OBJKT}/v1/token/${nft.attributes?.contractAddress}/${nft.attributes?.tokenId}/marketplace`;
      const response = await fetch(url);

      if (!response.ok) return null;

      const data = await response.json();
      return {
        floorPrice: this.parseNumeric(data.floor_price),
        lastSalePrice: this.parseNumeric(data.last_sale_price),
        currentListings: this.parseNumeric(data.active_listings_count),
        currency: 'XTZ',
        source: this.name
      };
    } catch (err) {
      const error = err as Error;
      console.log(`${this.name} market data error:`, error?.message || 'Unknown error');
      return null;
    }
  }

  private parseNumeric(value: any): number | undefined {
    if (value === null || value === undefined) return undefined;
    const parsed = Number(value);
    return isNaN(parsed) ? undefined : parsed;
  }
}

class TeiaProvider implements MarketplaceProvider {
  name = 'Teia';

  async getMarketData(nft: NFTMetadata): Promise<MarketData | null> {
    try {
      const url = `${CONFIG.TEZOS.MARKET_APIS.TEIA}/tokens/${nft.attributes?.contractAddress}/${nft.attributes?.tokenId}`;
      const response = await fetch(url);

      if (!response.ok) return null;

      const data = await response.json();
      return {
        floorPrice: this.parseNumeric(data.lowest_price),
        lastSalePrice: this.parseNumeric(data.last_sale_price),
        currentListings: this.parseNumeric(data.active_listings),
        currency: 'XTZ',
        source: this.name
      };
    } catch (err) {
      const error = err as Error;
      console.log(`${this.name} market data error:`, error?.message || 'Unknown error');
      return null;
    }
  }

  private parseNumeric(value: any): number | undefined {
    if (value === null || value === undefined) return undefined;
    const parsed = Number(value);
    return isNaN(parsed) ? undefined : parsed;
  }
}

export class MarketDataService {
  private providers: MarketplaceProvider[];
  private cache: Map<string, { data: MarketData; timestamp: number }>;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.providers = [
      new ObjktProvider(),
      new TeiaProvider()
    ];
    this.cache = new Map();
  }

  async getMarketData(nft: NFTMetadata): Promise<MarketData> {
    if (!nft.attributes?.contractAddress || !nft.attributes?.tokenId) {
      throw new Error('Missing contract address or token ID');
    }

    const cacheKey = `${nft.attributes.contractAddress}-${nft.attributes.tokenId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    console.log(`Fetching market data for ${nft.name} from multiple sources...`);
    
    // Try each provider in sequence
    for (const provider of this.providers) {
      try {
        const data = await provider.getMarketData(nft);
        if (data && this.isValidMarketData(data)) {
          this.cache.set(cacheKey, {
            data,
            timestamp: Date.now()
          });
          console.log(`Found market data from ${provider.name}`);
          return data;
        }
      } catch (err) {
        const error = err as Error;
        console.log(`${provider.name} provider failed:`, error?.message || 'Unknown error');
      }
    }

    // Return default data if no provider succeeds
    console.log('No market data available from any provider');
    return {
      currency: 'XTZ',
      source: 'none'
    };
  }

  private isValidMarketData(data: MarketData): boolean {
    // At least one of these fields should be present and valid
    return (
      data.floorPrice !== undefined ||
      data.lastSalePrice !== undefined ||
      data.currentListings !== undefined
    );
  }
}