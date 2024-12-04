import React, { useState, useEffect } from 'react';

// Helper function to create placeholder image
const createPlaceholder = (text: string) => {
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f0f0f0"/>
      <text 
        x="50%" 
        y="50%" 
        font-family="sans-serif" 
        font-size="24" 
        fill="#666" 
        text-anchor="middle" 
        dominant-baseline="middle"
      >
        ${text}
      </text>
    </svg>
  `)}`;
};

// Mock data while we set up the real NFT data
const mockNFTs = [
  {
    id: '1',
    name: 'Example NFT #1',
    collection: 'Test Collection',
  },
  {
    id: '2',
    name: 'Example NFT #2',
    collection: 'Test Collection',
  }
];

export default function NFTDashboard() {
  const [nfts, setNfts] = useState(mockNFTs);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [listingPrice, setListingPrice] = useState({});

  const handlePriceChange = (id: string, value: string) => {
    setListingPrice(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleListNFT = async (nft) => {
    try {
      const price = listingPrice[nft.id];
      if (!price || isNaN(parseFloat(price))) {
        alert('Please enter a valid price');
        return;
      }
      console.log(`Listing NFT ${nft.id} for ${price} TEZ`);
      alert(`Would list NFT ${nft.id} for ${price} TEZ`);
    } catch (err) {
      console.error('Error listing NFT:', err);
      alert('Failed to list NFT: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-500 rounded-lg">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">My NFTs ({nfts.length})</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {nfts.map((nft) => (
          <div key={nft.id} className="border rounded-lg p-4 bg-white shadow-sm">
            <img 
              src={nft.imageUrl || createPlaceholder(nft.name)}
              alt={nft.name}
              className="w-full h-48 object-cover rounded-lg mb-4"
            />
            <h2 className="text-lg font-bold">{nft.name}</h2>
            <p className="text-sm text-gray-600 mb-4">{nft.collection}</p>
            
            <div className="space-y-2">
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
                  className="bg-blue-500 hover:bg-blue-600 text-white rounded px-4 py-2 transition-colors"
                >
                  List
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {nfts.length === 0 && (
        <p className="text-center text-gray-500">No NFTs found</p>
      )}
    </div>
  );
}