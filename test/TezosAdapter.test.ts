import { NFTMetadata, ChainAdapter, MarketData } from '../src/types/nft';
import { CONFIG } from '../src/config/config';
import { MarketDataService } from '../src/services/MarketDataService';

// Use mocks instead of real implementations
jest.mock('@taquito/taquito', () => {
  return {
    TezosToolkit: jest.fn().mockImplementation(() => ({
      contract: {
        at: jest.fn()
      },
      setProvider: jest.fn()
    }))
  };
});

jest.mock('@taquito/signer', () => {
  return {
    InMemorySigner: jest.fn().mockImplementation(() => ({
      publicKeyHash: jest.fn().mockResolvedValue('tz1test')
    }))
  };
});

// Mock the MarketDataService
jest.mock('../src/services/MarketDataService', () => {
  return {
    MarketDataService: jest.fn().mockImplementation(() => ({
      getMarketData: jest.fn().mockImplementation((nft: NFTMetadata) => ({
        floorPrice: 1000000,
        lastSalePrice: 900000,
        currentListings: 5,
        currency: 'XTZ',
        source: 'mock'
      }))
    }))
  };
});

// Mock CONFIG to ensure marketplace contract is set
jest.mock('../src/config/config', () => ({
  CONFIG: {
    TEZOS: {
      RPC_URL: 'https://mainnet.api.tez.ie',
      TZKT_API: 'https://api.tzkt.io',
      MARKETPLACE_CONTRACT: 'KT1MarketPlace',
      MARKET_APIS: {
        OBJKT: 'https://api.objkt.com',
        TEIA: 'https://api.teia.art',
        VERSUM: 'https://api.versum.xyz'
      }
    }
  }
}));


// Import adapter after mocks are set up
import { TezosAdapter } from '../src/adapters/TezosAdapter';

describe('TezosAdapter', () => {
  let adapter: TezosAdapter;
  let originalConsoleError: typeof console.error;
  
  beforeEach(() => {
    originalConsoleError = console.error;
    console.error = jest.fn();
    adapter = new TezosAdapter();
    global.fetch = jest.fn();

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    console.error = originalConsoleError;
    jest.restoreAllMocks();
  });

  describe('getNFTs', () => {
    it('should fetch NFTs for a given wallet address', async () => {
      const mockBalances = [{
        token: {
          contract: {
            address: 'KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton',
            alias: 'Tezos Collectibles'
          },
          tokenId: '1',
          metadata: {
            name: 'Test NFT #1',
            description: 'A test NFT',
            artifactUri: 'ipfs://test',
            thumbnailUri: 'ipfs://thumbnail'
          }
        },
        balance: '1'
      }];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBalances
      });

      const nfts = await adapter.getNFTs('tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb');

      expect(Array.isArray(nfts)).toBe(true);
      expect(nfts.length).toBe(1);
      expect(nfts[0]).toMatchObject({
        chainType: 'tezos',
        name: 'Test NFT #1',
        collection: 'Tezos Collectibles'
      });
    });

    it('should handle empty NFT collections', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      const nfts = await adapter.getNFTs('tz1empty');
      expect(nfts).toEqual([]);
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(adapter.getNFTs('tz1invalid'))
        .rejects
        .toThrow('Failed to fetch token balances');
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(adapter.getNFTs('tz1network'))
        .rejects
        .toThrow('Network error');
    });

    it('should handle malformed NFT metadata', async () => {
      const mockBalances = [{
        token: {
          contract: {
            address: 'KT1bad',
            alias: null
          },
          tokenId: 'invalid',
          metadata: null
        },
        balance: '1'
      }];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBalances
      });

      const nfts = await adapter.getNFTs('tz1bad');
      expect(nfts).toEqual([]);
    });
  });

  describe('getMarketData', () => {
    it('should fetch market data through MarketDataService', async () => {
      const mockNFT: NFTMetadata = {
        id: 'test-id',
        chainType: 'tezos',
        name: 'Test NFT',
        attributes: {
          contractAddress: 'KT1test',
          tokenId: '1'
        }
      };

      const marketData = await adapter.getMarketData(mockNFT);
      
      expect(marketData).toMatchObject({
        currency: 'XTZ',
        floorPrice: 1000000,
        lastSalePrice: 900000,
        currentListings: 5,
        source: 'mock'
      });
    });

    // We don't need to test error cases here as they're handled by MarketDataService
  });

  describe('listNFT', () => {
    beforeEach(() => {
      // Ensure marketplace contract is set for each test
      (CONFIG.TEZOS as any).MARKETPLACE_CONTRACT = 'KT1MarketPlace';
    });

    it('should check and set operator approval', async () => {
      const mockNFT: NFTMetadata = {
        id: 'test-id',
        chainType: 'tezos',
        name: 'Test NFT',
        attributes: {
          contractAddress: 'KT1NFTContract',
          tokenId: '1'
        }
      };

      // Mock operator approval
      const mockOperatorSend = jest.fn().mockResolvedValue({
        confirmation: jest.fn().mockResolvedValue(true),
        hash: 'op_hash'
      });

      // Mock listing operation
      const mockListingSend = jest.fn().mockResolvedValue({
        confirmation: jest.fn().mockResolvedValue(true),
        hash: 'listing_op_hash'
      });

      const mockMethods = {
        update_operators: jest.fn().mockReturnValue({ send: mockOperatorSend }),
        list_token: jest.fn().mockReturnValue({ send: mockListingSend })
      };

      // Mock contract storage
      const mockStorage = {
        operators: {
          get: jest.fn().mockResolvedValue(false)
        }
      };

      // Mock contract
      const mockContract = {
        methods: mockMethods,
        storage: jest.fn().mockResolvedValue(mockStorage)
      };

      // Update TezosToolkit mock
      jest.spyOn(adapter['tezos'].contract, 'at')
        .mockResolvedValue(mockContract as any);

      // Mock wallet address
      jest.spyOn(adapter as any, 'getWalletAddress')
        .mockResolvedValue('tz1Owner');

      const result = await adapter.listNFT(mockNFT, 1.5); // 1.5 tez
      expect(result).toBe(true);
      
      // Verify operator approval was called
      expect(mockMethods.update_operators).toHaveBeenCalledWith([{
        add_operator: {
          owner: 'tz1Owner',
          operator: 'KT1MarketPlace',
          token_id: '1'
        }
      }]);

      // Verify listing was created
      expect(mockMethods.list_token).toHaveBeenCalledWith({
        fa2_address: 'KT1NFTContract',
        token_id: '1',
        price: 1500000, // 1.5 tez in mutez
        seller: 'tz1Owner'
      });

      expect(mockOperatorSend).toHaveBeenCalled();
      expect(mockListingSend).toHaveBeenCalled();
    });

    it('should skip operator approval if already approved', async () => {
      const mockNFT: NFTMetadata = {
        id: 'test-id',
        chainType: 'tezos',
        name: 'Test NFT',
        attributes: {
          contractAddress: 'KT1NFTContract',
          tokenId: '1'
        }
      };

      // Mock listing operation
      const mockListingSend = jest.fn().mockResolvedValue({
        confirmation: jest.fn().mockResolvedValue(true),
        hash: 'listing_op_hash'
      });

      // Mock contract storage with existing approval
      const mockStorage = {
        operators: {
          get: jest.fn().mockResolvedValue(true)
        }
      };

      // Mock contract
      const mockContract = {
        methods: {
          list_token: jest.fn().mockReturnValue({ send: mockListingSend })
        },
        storage: jest.fn().mockResolvedValue(mockStorage)
      };

      // Update TezosToolkit mock
      jest.spyOn(adapter['tezos'].contract, 'at')
        .mockResolvedValue(mockContract as any);

      // Mock wallet address
      jest.spyOn(adapter as any, 'getWalletAddress')
        .mockResolvedValue('tz1Owner');

      const result = await adapter.listNFT(mockNFT, 1.5);
      expect(result).toBe(true);
      expect(mockStorage.operators.get).toHaveBeenCalled();
      expect(mockContract.methods.list_token).toHaveBeenCalled();
    });

    it('should handle missing marketplace contract address', async () => {
      // Temporarily override marketplace contract address
      (CONFIG.TEZOS as any).MARKETPLACE_CONTRACT = undefined;

      const mockNFT: NFTMetadata = {
        id: 'test-id',
        chainType: 'tezos',
        name: 'Test NFT',
        attributes: {
          contractAddress: 'KT1NFTContract',
          tokenId: '1'
        }
      };

      await expect(adapter.listNFT(mockNFT, 1.5))
        .rejects
        .toThrow('Marketplace contract address not configured');
    });

    it('should handle listing creation errors', async () => {
      const mockNFT: NFTMetadata = {
        id: 'test-id',
        chainType: 'tezos',
        name: 'Test NFT',
        attributes: {
          contractAddress: 'KT1NFTContract',
          tokenId: '1'
        }
      };

      // Mock operator approval
      const mockStorage = {
        operators: {
          get: jest.fn().mockResolvedValue(true)
        }
      };

      // Mock listing operation with error
      const mockSend = jest.fn().mockRejectedValue(new Error('Listing failed'));
      const mockMethods = {
        list_token: jest.fn().mockReturnValue({ send: mockSend })
      };

      // Mock contract
      const mockContract = {
        methods: mockMethods,
        storage: jest.fn().mockResolvedValue(mockStorage)
      };

      // Update TezosToolkit mock
      jest.spyOn(adapter['tezos'].contract, 'at')
        .mockResolvedValue(mockContract as any);

      // Mock wallet address
      jest.spyOn(adapter as any, 'getWalletAddress')
        .mockResolvedValue('tz1Owner');

      await expect(adapter.listNFT(mockNFT, 1.5))
        .rejects
        .toThrow('Failed to create listing on marketplace');
    });
  });
});