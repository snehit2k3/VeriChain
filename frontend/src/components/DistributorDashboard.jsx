import React, { useEffect, useState, useCallback } from 'react';
import { useWeb3 } from '../context/Web3Context';
import './DistributorDashboard.css';

// --- Configuration from Environment Variables ---
const DISTRIBUTOR_ADDRESS = import.meta.env.VITE_DISTRIBUTOR_ADDRESS || '';
const IPFS_GATEWAY = import.meta.env.VITE_IPFS_GATEWAY || 'https://ipfs.io/ipfs/';

// --- Helper function to safely fetch JSON from IPFS ---
const fetchJsonWithValidation = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error fetching ${url}. Status: ${response.status}`);
  }
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    throw new Error(`Expected JSON but received non-JSON response from ${url}`);
  }
  return response.json();
};

const DistributorDashboard = () => {
  const { contract, account } = useWeb3(); // Using account to show a connected status
  const [ownedNFTs, setOwnedNFTs] = useState([]);
  const [loading, setLoading] = useState(true);

  const resolveIpfsUrl = (uri) => {
    if (uri?.startsWith('ipfs://')) {
      return uri.replace('ipfs://', IPFS_GATEWAY);
    }
    return uri;
  };

  // --- EFFICIENT NFT FETCHING LOGIC ---
  const fetchDistributorNFTs = useCallback(async () => {
    if (!contract || !DISTRIBUTOR_ADDRESS) {
        console.error("Contract or Distributor Address is not available.");
        setLoading(false);
        return;
    };
    setLoading(true);

    try {
        const filter = contract.filters.Transfer(null, DISTRIBUTOR_ADDRESS);
        const events = await contract.queryFilter(filter);
        const tokenIds = [...new Set(events.map(event => event.args.tokenId))];

        const nftPromises = tokenIds.map(async (tokenId) => {
            try {
                const owner = await contract.ownerOf(tokenId);
                if (owner.toLowerCase() === DISTRIBUTOR_ADDRESS.toLowerCase()) {
                    const uri = await contract.tokenURI(tokenId);
                    const metadataUrl = resolveIpfsUrl(uri);
                    const metadata = await fetchJsonWithValidation(metadataUrl);
                    return {
                        tokenId: tokenId.toString(),
                        name: metadata.name,
                        image: resolveIpfsUrl(metadata.image),
                        description: metadata.description,
                    };
                }
            } catch (err) {
                console.error(`Could not process token #${tokenId.toString()}:`, err);
            }
            return null;
        });

        const validNFTs = (await Promise.all(nftPromises)).filter(Boolean);
        setOwnedNFTs(validNFTs);
    } catch (error) {
        console.error("Failed to fetch distributor NFTs:", error);
    } finally {
        setLoading(false);
    }
  }, [contract]);

  useEffect(() => {
    fetchDistributorNFTs();
  }, [fetchDistributorNFTs]);

  return (
    <div className="distributor-dashboard">
      <header className="distributor-header">
        <h1>✨ Distributor Inventory ✨</h1>
        <p>Public inventory of all refined products ready for distribution.</p>
        <div className="header-info">
            <span>Distributor Address: <span className="info-value">{DISTRIBUTOR_ADDRESS ? `${DISTRIBUTOR_ADDRESS.slice(0, 6)}...${DISTRIBUTOR_ADDRESS.slice(-4)}` : 'N/A'}</span></span>
            <span>Connected Wallet: <span className="info-value">{account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Not Connected'}</span></span>
        </div>
      </header>

      <main className="inventory-section">
        {loading ? (
          <div className="loader-container">
            <div className="loader"></div>
            <p>Fetching refined products from the blockchain...</p>
          </div>
        ) : (
          <div className="nft-grid">
            {ownedNFTs.length === 0 ? (
              <div className="empty-message">
                <h3>Inventory is currently empty.</h3>
                <p>No refined products have been transferred to the distributor yet.</p>
              </div>
            ) : (
              ownedNFTs.map((nft) => (
                <div key={nft.tokenId} className="nft-card">
                  <div className="nft-image-container">
                    <img src={nft.image} alt={nft.name} className="nft-image" />
                  </div>
                  <div className="nft-info">
                    <h4 className="nft-name">{nft.name}</h4>
                    <p className="nft-token-id">Token #{nft.tokenId}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default DistributorDashboard;
