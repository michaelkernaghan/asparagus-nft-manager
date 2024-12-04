import { ChainAdapter, NFTMetadata, MarketData } from '../types/nft';
import { CONFIG } from '../config/config';
import { TezosToolkit } from '@taquito/taquito';
import { InMemorySigner } from '@taquito/signer';
import { MarketDataService } from '../services/MarketDataService';

interface TokenInfo {
  name?: string;
  description?: string;
  artifactUri?: string;
  thumbnailUri?: string;
  symbol?: string;
}

interface FA2Token {
  token_id: string;
  token_info: TokenInfo;
}

interface ListingParams {
  assetContract: string;
  tokenId: string;
  price: number; // in mutez
  seller: string;
}

export class TezosAdapter implements ChainAdapter {
  private tezos: TezosToolkit;
  private address: string = '';
  private marketDataService: MarketDataService;

  constructor(secretKey?: string) {
    this.tezos = new TezosToolkit(CONFIG.TEZOS.RPC_URL);
    this.marketDataService = new MarketDataService();
    
    if (secretKey) {
      const signer = new InMemorySigner(secretKey);
      this.tezos.setProvider({ signer });
      
      signer.publicKeyHash().then(address => {
        this.address = address;
      });
    }
  }

  private async getWalletAddress(): Promise<string> {
    return this.address;
  }

  private async getFA2Contract(contractAddress: string) {
    try {
      return await this.tezos.contract.at(contractAddress);
    } catch (error) {
      console.error(`Error loading FA2 contract ${contractAddress}:`, error);
      throw error;
    }
  }

  private validateTokenMetadata(metadata: any): boolean {
    if (!metadata || typeof metadata !== 'object') return false;
    if (!metadata.token_id || !metadata.token_info) return false;
    if (!metadata.token_info.name) return false;
    return true;
  }

  private decodeBytes(value?: string): string {
    if (!value) return '';
    try {
      return value;
    } catch {
      return value || '';
    }
  }

  async getNFTs(walletAddress: string): Promise<NFTMetadata[]> {
    try {
      // Update query to filter for FA2 tokens and NFTs
      const response = await fetch(
        `${CONFIG.TEZOS.TZKT_API}/v1/tokens/balances?` + 
        `account=${walletAddress}` +
        `&balance.gt=0` +
        `&token.standard=fa2` +
        `&token.metadata.artifactUri.null=false`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch token balances from TzKT');
      }

      const balances = await response.json();
      const nfts: NFTMetadata[] = [];

      for (const balance of balances) {
        try {
          if (!balance.token?.metadata) {
            console.log(`Skipping token without metadata: ${balance.token?.contract?.address}-${balance.token?.tokenId}`);
            continue;
          }

          // Use the metadata directly from TzKt
          const metadata = balance.token.metadata;
          
          nfts.push({
            id: `${balance.token.contract.address}-${balance.token.tokenId}`,
            chainType: 'tezos',
            name: metadata.name || metadata.symbol || 'Unnamed NFT',
            collection: balance.token.contract.alias || balance.token.contract.address,
            description: metadata.description || '',
            imageUrl: metadata.artifactUri || metadata.thumbnailUri || '',
            attributes: {
              symbol: metadata.symbol || '',
              contractAddress: balance.token.contract.address,
              tokenId: balance.token.tokenId,
              ...metadata.attributes
            }
          });
        } catch (error) {
          console.error(`Error processing token ${balance.token?.contract?.address}-${balance.token?.tokenId}:`, error);
          continue;
        }
      }

      return nfts;
    } catch (error) {
      console.error('Error fetching Tezos NFTs:', error);
      throw error;
    }
  }

  async getMarketData(nft: NFTMetadata): Promise<MarketData> {
    return this.marketDataService.getMarketData(nft);
  }

  private async checkAndSetOperator(
    nft: NFTMetadata,
    marketplaceAddress: string
  ): Promise<boolean> {
    try {
      if (!nft.attributes?.contractAddress || !nft.attributes?.tokenId) {
        throw new Error('Missing NFT contract address or token ID');
      }

      const nftContract = await this.tezos.contract.at(nft.attributes.contractAddress);
      const storage: any = await nftContract.storage();
      
      // Get current wallet address
      const walletAddress = await this.getWalletAddress();
      
      // Check if marketplace is already approved
      let isApproved = false;
      if (storage.operators) {
        const key = {
          owner: walletAddress,
          operator: marketplaceAddress,
          token_id: nft.attributes.tokenId
        };
        isApproved = await storage.operators.get(key);
      }

      if (!isApproved) {
        // Prepare the update_operators call
        const updateOperatorsParam = [{
          add_operator: {
            owner: walletAddress,
            operator: marketplaceAddress,
            token_id: nft.attributes.tokenId
          }
        }];

        // Send the approval transaction
        const operation = await nftContract.methods
          .update_operators(updateOperatorsParam)
          .send();

        // Wait for confirmation
        await operation.confirmation(1);
        console.log('Operator approval confirmed:', operation.hash);
        
        return true;
      }

      return isApproved;
    } catch (error) {
      console.error('Error in checkAndSetOperator:', error);
      throw new Error('Failed to approve marketplace operator');
    }
  }

  private async createListing(
    marketplaceAddress: string,
    params: ListingParams
  ): Promise<boolean> {
    try {
      const marketplaceContract = await this.tezos.contract.at(marketplaceAddress);
      
      // Create the listing operation
      const operation = await marketplaceContract.methods
        .list_token({
          fa2_address: params.assetContract,
          token_id: params.tokenId,
          price: params.price,
          seller: params.seller
        })
        .send();

      // Wait for confirmation
      await operation.confirmation(1);
      console.log('Listing confirmed:', operation.hash);
      
      return true;
    } catch (error) {
      console.error('Error creating listing:', error);
      throw new Error('Failed to create listing on marketplace');
    }
  }

  async listNFT(nft: NFTMetadata, price: number): Promise<boolean> {
    // Check marketplace contract configuration first
    const marketplaceAddress = CONFIG.TEZOS.MARKETPLACE_CONTRACT;
    if (!marketplaceAddress) {
      throw new Error('Marketplace contract address not configured');
    }

    try {
      const walletAddress = await this.getWalletAddress();
      if (!walletAddress) {
        throw new Error('No wallet address available');
      }

      // First, ensure the marketplace is approved as an operator
      const isApproved = await this.checkAndSetOperator(nft, marketplaceAddress);
      if (!isApproved) {
        throw new Error('Failed to approve marketplace operator');
      }

      // Validate NFT attributes
      if (!nft.attributes?.contractAddress || !nft.attributes?.tokenId) {
        throw new Error('Missing NFT contract address or token ID');
      }

      // Convert price to mutez if provided in tez
      const priceInMutez = price * 1_000_000; // Convert tez to mutez

      // Create the listing
      const listingParams: ListingParams = {
        assetContract: nft.attributes.contractAddress,
        tokenId: nft.attributes.tokenId,
        price: priceInMutez,
        seller: walletAddress
      };

      return await this.createListing(marketplaceAddress, listingParams);
    } catch (error) {
      if (error instanceof Error && error.message === 'Marketplace contract address not configured') {
        throw error;
      }
      console.error('Error in listNFT:', error);
      throw error;
    }
  }
}