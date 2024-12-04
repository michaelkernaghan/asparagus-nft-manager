import { MarketDataService } from '../../src/services/MarketDataService';
import { NFTMetadata } from '../../src/types/nft';
import { CONFIG } from '../../src/config/config';

// Mock CONFIG
jest.mock('../../src/config/config', () => ({
  CONFIG: {
    TEZOS: {
      MARKET_APIS: {
        OBJKT: 'https://api.objkt.com',
        TEIA: 'https://api.teia.art'
      }
    }
  }
}));

describe('MarketDataService', () => {
  let service: MarketDataService;
  let originalFetch: any;
  
  beforeEach(() => {
    service = new MarketDataService();
    originalFetch = global.fetch;
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  const mockNFT: NFTMetadata = {
    id: 'test-id',
    chainType: 'tezos',
    name: 'Test NFT',
    attributes: {
      contractAddress: 'KT1test',
      tokenId: '1'
    }
  };

  describe('getMarketData', () => {
    it('should fetch market data from Objkt', async () => {
      const mockObjktData = {
        floor_price: '1000000',
        last_sale_price: '900000',
        active_listings_count: 5
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockObjktData
      });

      const marketData = await service.getMarketData(mockNFT);
      
      expect(marketData).toMatchObject({
        currency: 'XTZ',
        floorPrice: 1000000,
        lastSalePrice: 900000,
        currentListings: 5,
        source: 'Objkt'
      });
    });

    it('should try Teia if Objkt fails', async () => {
      // Mock Objkt failure
      (global.fetch as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({
          ok: false
        }));

      // Mock Teia success
      const mockTeiaData = {
        lowest_price: '800000',
        last_sale_price: '750000',
        active_listings: 3
      };

      (global.fetch as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: async () => mockTeiaData
        }));

      const marketData = await service.getMarketData(mockNFT);
      
      expect(marketData).toMatchObject({
        currency: 'XTZ',
        floorPrice: 800000,
        lastSalePrice: 750000,
        currentListings: 3,
        source: 'Teia'
      });
    });

    it('should handle all providers failing', async () => {
      // Mock all providers failing
      (global.fetch as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({ ok: false })) // Objkt fails
        .mockImplementationOnce(() => Promise.resolve({ ok: false })); // Teia fails

      const marketData = await service.getMarketData(mockNFT);
      
      expect(marketData).toMatchObject({
        currency: 'XTZ',
        source: 'none'
      });
    });

    it('should handle malformed data from providers', async () => {
      // Mock Objkt returning malformed data
      (global.fetch as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({
          ok: false,
          json: async () => ({
            floor_price: 'not-a-number',
            last_sale_price: null,
            active_listings_count: 'five'
          })
        }))
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: async () => ({
            lowest_price: '800000',
            last_sale_price: '750000',
            active_listings: 3
          })
        }));

      const marketData = await service.getMarketData(mockNFT);
      
      // Should get data from Teia instead
      expect(marketData).toMatchObject({
        currency: 'XTZ',
        floorPrice: 800000,
        lastSalePrice: 750000,
        currentListings: 3,
        source: 'Teia'
      });
    });

    it('should handle missing NFT attributes', async () => {
      const invalidNFT: NFTMetadata = {
        id: 'test-id',
        chainType: 'tezos',
        name: 'Test NFT'
        // Missing attributes
      };

      await expect(service.getMarketData(invalidNFT))
        .rejects
        .toThrow('Missing contract address or token ID');
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error for Objkt'))
        .mockRejectedValueOnce(new Error('Network error for Teia'));

      const marketData = await service.getMarketData(mockNFT);
      
      expect(marketData).toMatchObject({
        currency: 'XTZ',
        source: 'none'
      });
    });

    it('should cache responses for performance', async () => {
      const mockObjktData = {
        floor_price: '1000000',
        last_sale_price: '900000',
        active_listings_count: 5
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockObjktData
      });

      // First call
      await service.getMarketData(mockNFT);
      
      // Second call to same NFT
      await service.getMarketData(mockNFT);
      
      // Fetch should only be called once
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should refresh cached data after TTL expires', async () => {
      jest.useFakeTimers();

      const mockObjktData = {
        floor_price: '1000000',
        last_sale_price: '900000',
        active_listings_count: 5
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockObjktData
      });

      // First call
      await service.getMarketData(mockNFT);
      
      // Advance time past TTL
      jest.advanceTimersByTime(5 * 60 * 1000); // 5 minutes
      
      // Second call to same NFT
      await service.getMarketData(mockNFT);
      
      // Fetch should be called twice
      expect(fetch).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });
  });
});