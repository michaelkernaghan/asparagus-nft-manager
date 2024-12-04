import React, { useState } from 'react';

// Mock data structure matching what we'll get from TezosAdapter
const mockNFTs = [
  {
    id: 'KT1-1',
    name: 'Example NFT #1',
    collection: 'My Collection',
    imageUrl: '/api/placeholder/400/400',
    attributes: {
      contractAddress: 'KT1...',
      tokenId: '1'
    }
  },
  {
    id: 'KT1-2',
    name: 'Example NFT #2',
    collection: 'My Collection',
    imageUrl: '/api/placeholder/400/400',
    attributes: {
      contractAddress: 'KT1...',
      tokenId: '2'
    }
  }
];

export default function NFTDashboard() {
  const [nfts] = useState(mockNFTs);
  const [error, setError] = useState(null);

  // Function to list an NFT for sale
  async function listNFT(nft, price) {
    try {
      console.log('Listing NFT for sale:', nft, 'Price:', price);
      // TODO: Connect to TezosAdapter
      alert('List NFT functionality will be connected here');
    } catch (error) {
      console.error('Failed to list NFT:', error);
      setError('Failed to list NFT');
    }
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
      <h1 className="text-2xl font-bold mb-6">My NFTs</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {nfts.map((nft) => (
          <div key={nft.id} className="border rounded-lg p-4">
            <img 
              src={nft.imageUrl} 
              alt={nft.name}
              className="w-full h-48 object-cover rounded-lg mb-4"
            />
            <h2 className="text-lg font-bold">{nft.name}</h2>
            <p className="text-sm text-gray-600 mb-4">{nft.collection}</p>
            
            <div className="space-y-2">
              <input
                type="number"
                placeholder="Price in TEZ"
                className="w-full p-2 border rounded mb-2"
                min="0"
                step="0.1"
                onChange={(e) => console.log('Price:', e.target.value)}
              />
              <button 
                onClick={() => listNFT(nft, 1)}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded px-4 py-2 transition-colors"
              >
                List for Sale
              </button>
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