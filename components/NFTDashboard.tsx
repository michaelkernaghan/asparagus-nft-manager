import React, { useState, useEffect } from 'react';
import type { TezosToolkit } from '@taquito/taquito';
import type { BeaconWallet } from '@taquito/beacon-wallet';

const createPlaceholder = (text: string) => {
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f0f0f0"/>
      <text 
        x="50%" 
        y="50%" 
        font-family="sans-serif" 
        font-size="16" 
        fill="#666" 
        text-anchor="middle" 
        dominant-baseline="middle"
      >
        ${text}
      </text>
    </svg>
  `)}`;
};

interface NFT {
  id: string;
  chainType: string;
  name: string;
  collection?: string;
  description?: string;
  imageUrl?: string;
  attributes?: {
    symbol?: string;
    contractAddress?: string;
    tokenId?: string;
  };
}

interface MarketplaceLink {
  name: string;
  url: string;
  icon?: string;
}

const OBJKT_MARKETPLACE_V4 = "KT1WvzYHCNBvDSdwafTHv7nJ1dWmZ8GCYuuC";

const getContractAddress = (nft: NFT): string | null => {
  return nft.attributes?.contractAddress || null;
};

const getTokenId = (nft: NFT): string | null => {
  return nft.attributes?.tokenId || null;
};

const getMarketplaceUrls = (nft: NFT): MarketplaceLink[] => {
  const contract = getContractAddress(nft);
  const tokenId = getTokenId(nft);

  if (!contract || !tokenId) {
    console.log(`Missing data for NFT ${nft.id}:`, {
      contract: contract ? 'present' : 'missing',
      tokenId: tokenId ? 'present' : 'missing',
      attributes: nft.attributes
    });
    return [];
  }
  
  const links: MarketplaceLink[] = [
    {
      name: 'OBJKT',
      url: `https://objkt.com/asset/${contract}/${tokenId}`,
      icon: '🟣'
    },
    {
      name: 'Teia',
      url: `https://teia.art/objkt/${tokenId}`,
      icon: '🎨'
    },
    {
      name: 'fxhash',
      url: `https://www.fxhash.xyz/gentk/${tokenId}`,
      icon: '⬡'
    },
    {
      name: 'Versum',
      url: `https://versum.xyz/token/tez/${contract}/${tokenId}`,
      icon: '🔷'
    }
  ];

  return links;
};

export default function NFTDashboard() {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [listingPrice, setListingPrice] = useState<Record<string, string>>({});
  const [selectedNFTs, setSelectedNFTs] = useState<Record<string, boolean>>({});
  const [bulkPrice, setBulkPrice] = useState('');
  const [listingStatus, setListingStatus] = useState<Record<string, string>>({});
  const [imageLoadErrors, setImageLoadErrors] = useState<Record<string, boolean>>({});
  const [burning, setBurning] = useState<Record<string, boolean>>({});
  const [wallet, setWallet] = useState<BeaconWallet | null>(null);
  const [tezos, setTezos] = useState<TezosToolkit | null>(null);
  const [connected, setConnected] = useState(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);

  useEffect(() => {
    const initWallet = async () => {
      try {
        if (typeof window !== 'undefined') {
          const { TezosToolkit } = await import('@taquito/taquito');
          const { BeaconWallet } = await import('@taquito/beacon-wallet');
          
          const tezosInstance = new TezosToolkit('https://mainnet.api.tez.ie');
          const walletInstance = new BeaconWallet({
            name: 'Asparagus NFT Manager',
            preferredNetwork: 'mainnet'
          });
          
          tezosInstance.setWalletProvider(walletInstance);
          setTezos(tezosInstance);
          setWallet(walletInstance);

          // Check if already connected
          try {
            const activeAccount = await walletInstance.client.getActiveAccount();
            if (activeAccount) {
              const address = await walletInstance.getPKH();
              setConnected(true);
              setUserAddress(address);
              console.log('Wallet reconnected:', address);
            }
          } catch (err) {
            console.log('No active wallet session');
          }
        }
      } catch (err) {
        console.error('Error initializing wallet:', err);
      }
    };

    initWallet();
  }, []);

  const connectWallet = async () => {
    try {
      if (!wallet) {
        alert('Wallet not initialized');
        return;
      }

      await wallet.requestPermissions({
        network: {
          type: 'mainnet'
        }
      });

      const address = await wallet.getPKH();
      setUserAddress(address);
      setConnected(true);
      console.log('Connected wallet:', address);
    } catch (err) {
      console.error('Error connecting wallet:', err);
      alert('Failed to connect wallet: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const disconnectWallet = async () => {
    try {
      if (wallet) {
        await wallet.client.clearActiveAccount();
        setConnected(false);
        setUserAddress(null);
      }
    } catch (err) {
      console.error('Error disconnecting wallet:', err);
    }
  };

  useEffect(() => {
    const fetchNFTs = async () => {
      try {
        const response = await fetch('/api/nfts');
        if (!response.ok) throw new Error('Failed to fetch NFTs');
        const data = await response.json();
        console.log('First NFT data:', JSON.stringify(data[0], null, 2));
        setNfts(data);
      } catch (err) {
        console.error('Error fetching NFTs:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchNFTs();
  }, []);

  const handleImageError = (nftId: string) => {
    setImageLoadErrors(prev => ({ ...prev, [nftId]: true }));
  };

  const getImageUrl = (nft: NFT) => {
    if (imageLoadErrors[nft.id]) {
      return createPlaceholder(nft.name || 'NFT');
    }
    
    if (nft.imageUrl?.startsWith('ipfs://')) {
      return nft.imageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
    }
    
    return nft.imageUrl || createPlaceholder(nft.name || 'NFT');
  };

  const handlePriceChange = (id: string, value: string) => {
    setListingPrice(prev => ({ ...prev, [id]: value }));
  };

  const handleListNFT = async (nft: NFT) => {
    if (!tezos || !wallet) {
      alert('Wallet not initialized');
      return;
    }

    if (!connected) {
      alert('Please connect your wallet first');
      await connectWallet();
      return;
    }

    if (!userAddress) {
      alert('No wallet address found');
      return;
    }

    const price = listingPrice[nft.id];
    if (!price || isNaN(parseFloat(price))) {
      alert('Please enter a valid price');
      return;
    }

    const contract = getContractAddress(nft);
    const tokenId = getTokenId(nft);

    if (!contract || !tokenId) {
      alert('Missing contract address or token ID');
      return;
    }

    try {
      setListingStatus(prev => ({ ...prev, [nft.id]: 'listing' }));
      
      // Get the NFT contract
      const nftContract = await tezos.wallet.at(contract);
      
      // First, approve the marketplace to transfer the NFT
      const updateOperatorParam = {
        add_operator: {
          owner: userAddress,
          operator: OBJKT_MARKETPLACE_V4,
          token_id: parseInt(tokenId)
        }
      };

      console.log('Approving marketplace...', updateOperatorParam);
      const opApprove = await nftContract.methods.update_operators([updateOperatorParam]).send();
      await opApprove.confirmation(1);

      // Now create the listing on OBJKT
      const marketplaceContract = await tezos.wallet.at(OBJKT_MARKETPLACE_V4);
      
      const listingParam = {
        token: {
          address: contract,
          token_id: tokenId
        },
        amount: 1,
        price: parseFloat(price) * 1000000, // Convert to mutez
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year from now
      };

      console.log('Creating listing...', listingParam);
      const opListing = await marketplaceContract.methods.list_token(listingParam).send();
      await opListing.confirmation(1);
      
      setListingStatus(prev => ({ ...prev, [nft.id]: 'listed' }));
      setTimeout(() => {
        setListingStatus(prev => ({ ...prev, [nft.id]: 'complete' }));
      }, 3000);
      
      console.log('Listing completed:', opListing.hash);
    } catch (err) {
      console.error('Error listing NFT:', err);
      setListingStatus(prev => ({ ...prev, [nft.id]: 'error' }));
      alert('Failed to list NFT: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setTimeout(() => {
        setListingStatus(prev => ({ ...prev, [nft.id]: '' }));
      }, 3000);
    }
  };

  const handleBurnNFT = async (nft: NFT) => {
    if (!tezos || !wallet) {
      alert('Wallet not initialized');
      return;
    }

    if (!connected) {
      alert('Please connect your wallet first');
      await connectWallet();
      return;
    }

    if (!userAddress) {
      alert('No wallet address found');
      return;
    }

    const contract = getContractAddress(nft);
    const tokenId = getTokenId(nft);

    if (!contract || !tokenId) {
      alert('Missing contract address or token ID');
      return;
    }

    if (!confirm(`Are you sure you want to burn NFT: ${nft.name}?`)) return;

    try {
      setBurning(prev => ({ ...prev, [nft.id]: true }));

      const nftContract = await tezos.wallet.at(contract);
      
      // Get the contract's methods
      const methods = await nftContract.methods;
      console.log('Available contract methods:', methods);

      // Try different burn methods
      let op;
      if ('burn' in methods) {
        console.log('Using burn method');
        op = await nftContract.methods.burn([{
          from_: userAddress,
          token_id: parseInt(tokenId),
          amount: 1
        }]).send();
      } else if ('transfer' in methods) {
        console.log('Using transfer method to burn address');
        const BURN_ADDRESS = 'tz1burnburnburnburnburnburnburjAYjjX';
        op = await nftContract.methods.transfer([{
          from_: userAddress,
          txs: [{
            to_: BURN_ADDRESS,
            token_id: parseInt(tokenId),
            amount: 1
          }]
        }]).send();
      } else {
        throw new Error('Contract does not support burning operations');
      }

      console.log('Burn operation submitted:', op.hash);
      await op.confirmation(1);
      console.log('Burn operation confirmed');

      alert('NFT burned successfully');
      fetchNFTs();
    } catch (err) {
      console.error('Error burning NFT:', err);
      alert('Failed to burn NFT: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setBurning(prev => ({ ...prev, [nft.id]: false }));
    }
  };

  const handleBulkList = async () => {
    if (!bulkPrice || isNaN(parseFloat(bulkPrice))) {
      alert('Please enter a valid price for bulk listing');
      return;
    }
    
    const selectedIds = Object.entries(selectedNFTs)
      .filter(([_, selected]) => selected)
      .map(([id]) => id);
    
    if (selectedIds.length === 0) {
      alert('Please select NFTs to list');
      return;
    }

    if (!confirm(`List ${selectedIds.length} NFTs for ${bulkPrice} TEZ each?`)) return;

    for (const id of selectedIds) {
      const nft = nfts.find(n => n.id === id);
      if (nft) {
        setListingPrice(prev => ({ ...prev, [id]: bulkPrice }));
        await handleListNFT(nft);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"/>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-500 rounded-lg">{error}</div>
    );
  }

  return (
    <div className="p-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-green-700">🥬 Asparagus NFT Manager</h1>
        <p className="text-gray-600 mt-2">Manage your Tezos NFTs with ease</p>
        <div className="mt-4">
          {connected ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Connected: {userAddress}</p>
              <button
                onClick={disconnectWallet}
                className="bg-red-500 hover:bg-red-600 text-white rounded px-4 py-2 text-sm"
              >
                Disconnect Wallet
              </button>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              className="bg-blue-500 hover:bg-blue-600 text-white rounded px-4 py-2"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">My NFTs ({nfts.length})</h2>
        <div className="flex gap-4">
          <input
            type="number"
            step="0.1"
            min="0"
            placeholder="Bulk price in TEZ"
            value={bulkPrice}
            onChange={(e) => setBulkPrice(e.target.value)}
            className="px-3 py-2 border rounded"
          />
          <button 
            onClick={handleBulkList}
            className="bg-green-500 hover:bg-green-600 text-white rounded px-4 py-2"
          >
            List Selected NFTs
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
        {nfts.map((nft) => (
          <div key={nft.id} className="border rounded-lg p-3 bg-white shadow-sm relative">
            <input
              type="checkbox"
              checked={selectedNFTs[nft.id] || false}
              onChange={(e) => setSelectedNFTs(prev => ({ ...prev, [nft.id]: e.target.checked }))}
              className="absolute top-2 right-2 w-4 h-4"
            />
            <div className="aspect-square mb-3 bg-gray-100 rounded-lg overflow-hidden">
              <img 
                src={getImageUrl(nft)}
                alt={nft.name || 'NFT'}
                className="w-full h-full object-contain"
                onError={() => handleImageError(nft.id)}
                loading="lazy"
              />
            </div>
            <h2 className="text-base font-bold truncate" title={nft.name}>{nft.name}</h2>
            <p className="text-xs text-gray-600 truncate" title={nft.collection}>{nft.collection}</p>
            {getTokenId(nft) && (
              <p className="text-xs text-gray-500 mb-3">Token ID: {getTokenId(nft)}</p>
            )}
            
            <div className="space-y-2 mt-3">
              <div className="flex gap-1">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="Price"
                  value={listingPrice[nft.id] || ''}
                  onChange={(e) => handlePriceChange(nft.id, e.target.value)}
                  className="w-3/5 px-2 py-1 border rounded text-sm"
                />
                <button 
                  onClick={() => handleListNFT(nft)}
                  className={`w-2/5 px-2 py-1 rounded text-white transition-colors text-sm whitespace-nowrap ${
                    listingStatus[nft.id] === 'listing' ? 'bg-yellow-500' :
                    listingStatus[nft.id] === 'listed' ? 'bg-green-500' :
                    listingStatus[nft.id] === 'error' ? 'bg-red-500' :
                    'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  {listingStatus[nft.id] === 'listing' ? '...' :
                   listingStatus[nft.id] === 'listed' ? '✓' :
                   listingStatus[nft.id] === 'error' ? '✗' :
                   'List'}
                </button>
              </div>
              
              {listingStatus[nft.id] === 'complete' && (
                <div className="space-y-1">
                  {getMarketplaceUrls(nft).length > 0 ? (
                    <>
                      <p className="text-xs text-gray-600 text-center">View on:</p>
                      <div className="flex flex-wrap gap-1 justify-center">
                        {getMarketplaceUrls(nft).map((link) => (
                          <a
                            key={link.name}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded text-xs"
                          >
                            <span>{link.icon}</span>
                            <span>{link.name}</span>
                          </a>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-yellow-600 text-center">
                      Marketplace links unavailable
                    </p>
                  )}
                </div>
              )}

              <button 
                onClick={() => handleBurnNFT(nft)}
                disabled={burning[nft.id] || !connected}
                className={`w-full text-sm px-2 py-1 ${
                  burning[nft.id] 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : !connected
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-red-500 hover:bg-red-600'
                } text-white rounded`}
              >
                {burning[nft.id] ? '...' : !connected ? 'Connect' : 'Burn'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {nfts.length === 0 && !loading && (
        <p className="text-center text-gray-500">No NFTs found</p>
      )}
    </div>
  );
}