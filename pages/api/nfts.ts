import { NextApiRequest, NextApiResponse } from 'next';
import { TezosAdapter } from '../../src/adapters/TezosAdapter';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const adapter = new TezosAdapter();
    const walletAddress = process.env.NEXT_PUBLIC_TEZOS_WALLET_ADDRESS;

    if (!walletAddress) {
      throw new Error('Wallet address not configured');
    }

    const nfts = await adapter.getNFTs(walletAddress);
    res.status(200).json(nfts);
  } catch (error) {
    console.error('Error fetching NFTs:', error);
    res.status(500).json({ message: 'Failed to fetch NFTs' });
  }
}