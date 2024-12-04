import { NextApiRequest, NextApiResponse } from 'next';
import { TezosAdapter } from '../../src/adapters/TezosAdapter';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { nft, price } = req.body;

    if (!nft || !price) {
      return res.status(400).json({ message: 'Missing nft or price' });
    }

    const adapter = new TezosAdapter();
    await adapter.listNFT(nft, price);

    res.status(200).json({ message: 'NFT listed successfully' });
  } catch (error) {
    console.error('Error listing NFT:', error);
    res.status(500).json({ message: 'Failed to list NFT' });
  }
}