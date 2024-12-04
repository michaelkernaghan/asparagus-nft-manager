import React, { useState, useEffect } from 'react';

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

  useEffect(() => {
    async function fetchNFTs() {
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
    }

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
    try {
      const price = listingPrice[nft.id];
      if (!price || isNaN(parseFloat(price))) {
        alert('Please enter a valid price');
        return;
      }
      setListingStatus(prev => ({ ...prev, [nft.id]: 'listing' }));
      
      const contract = getContractAddress(nft);
      const tokenId = getTokenId(nft);
      
      console.log('Listing NFT:', {
        id: nft.id,
        price,
        contract,
        tokenId
      });
      
      setListingStatus(prev => ({ ...prev, [nft.id]: 'listed' }));
      setTimeout(() => {
        setListingStatus(prev => ({ ...prev, [nft.id]: 'complete' }));
      }, 3000);
    } catch (err) {
      console.error('Error listing NFT:', err);
      setListingStatus(prev => ({ ...prev, [nft.id]: 'error' }));
      setTimeout(() => {
        setListingStatus(prev => ({ ...prev, [nft.id]: '' }));
      }, 3000);
    }
  };

  const handleBurnNFT = async (nft: NFT) => {
    if (!confirm(`Are you sure you want to burn NFT: ${nft.name}?`)) return;
    try {
      const contract = getContractAddress(nft);
      const tokenId = getTokenId(nft);
      
      console.log('Burning NFT:', {
        id: nft.id,
        contract,
        tokenId
      });
      
      alert('NFT burned successfully');
    } catch (err) {
      console.error('Error burning NFT:', err);
      alert('Failed to burn NFT');
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {nfts.map((nft) => (
          <div key={nft.id} className="border rounded-lg p-4 bg-white shadow-sm relative">
            <input
              type="checkbox"
              checked={selectedNFTs[nft.id] || false}
              onChange={(e) => setSelectedNFTs(prev => ({ ...prev, [nft.id]: e.target.checked }))}
              className="absolute top-2 right-2 w-4 h-4"
            />
            <div className="aspect-square mb-4 bg-gray-100 rounded-lg overflow-hidden">
              <img 
                src={getImageUrl(nft)}
                alt={nft.name || 'NFT'}
                className="w-full h-full object-contain"
                onError={() => handleImageError(nft.id)}
                loading="lazy"
              />
            </div>
            <h2 className="text-lg font-bold truncate" title={nft.name}>{nft.name}</h2>
            <p className="text-sm text-gray-600 truncate" title={nft.collection}>{nft.collection}</p>
            {getTokenId(nft) && (
              <p className="text-xs text-gray-500 mb-4">Token ID: {getTokenId(nft)}</p>
            )}
            
            <div className="space-y-2 mt-4">
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="Price in TEZ"
                  value={listingPrice[nft.id] || ''}
                  onChange={(e) => handlePriceChange(nft.id, e.target.value)}
                  className="flex-1 px-3 py-2 border rounded"
                />
                <button 
                  onClick={() => handleListNFT(nft)}
                  className={`px-4 py-2 rounded text-white transition-colors ${
                    listingStatus[nft.id] === 'listing' ? 'bg-yellow-500' :
                    listingStatus[nft.id] === 'listed' ? 'bg-green-500' :
                    listingStatus[nft.id] === 'error' ? 'bg-red-500' :
                    'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  {listingStatus[nft.id] === 'listing' ? 'Listing...' :
                   listingStatus[nft.id] === 'listed' ? 'Listed!' :
                   listingStatus[nft.id] === 'error' ? 'Failed!' :
                   'List'}
                </button>
              </div>
              
              {listingStatus[nft.id] === 'complete' && (
                <div className="space-y-2">
                  {getMarketplaceUrls(nft).length > 0 ? (
                    <>
                      <p className="text-sm text-gray-600 text-center">View on marketplace:</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {getMarketplaceUrls(nft).map((link) => (
                          <a
                            key={link.name}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded text-sm transition-colors"
                          >
                            <span>{link.icon}</span>
                            <span>{link.name}</span>
                          </a>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-yellow-600 text-center">
                      Marketplace links unavailable (missing contract or token ID)
                    </p>
                  )}
                </div>
              )}

              <button 
                onClick={() => handleBurnNFT(nft)}
                className="w-full bg-red-500 hover:bg-red-600 text-white rounded px-4 py-2"
              >
                Burn NFT
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