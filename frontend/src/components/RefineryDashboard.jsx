import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../context/Web3Context';
import './RefineryDashboard.css';

// --- Configuration from Environment Variables ---
const DISTRIBUTOR_ADDRESS = import.meta.env.VITE_DISTRIBUTOR_ADDRESS || '';
const IPFS_GATEWAY = import.meta.env.VITE_IPFS_GATEWAY || 'https://ipfs.io/ipfs/';
const REFINED_NFT_URI = import.meta.env.VITE_REFINERY_REFINED_NFT_URI || '';

// --- Helper Function to Safely Fetch JSON ---
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

const RefineryDashboard = () => {
  const { contract, account } = useWeb3();
  const [allTokens, setAllTokens] = useState([]);
  const [selectedTokenId, setSelectedTokenId] = useState('');
  const [status, setStatus] = useState({ message: '', type: '' });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const resolveIpfsUrl = useCallback((uri) => {
    if (uri?.startsWith('ipfs://')) {
      return uri.replace('ipfs://', IPFS_GATEWAY);
    }
    return uri;
  }, []);

  const fetchOwnedNFTs = useCallback(async () => {
    if (!contract || !account) return;
    setFetching(true);
    setAllTokens([]);

    try {
      const filter = contract.filters.Transfer(null, account);
      const events = await contract.queryFilter(filter);
      const tokenIds = [...new Set(events.map(event => event.args.tokenId))];
      
      const tokenPromises = tokenIds.map(async (tokenId) => {
        try {
          const owner = await contract.ownerOf(tokenId);
          if (owner.toLowerCase() === account.toLowerCase()) {
            const tokenURI = await contract.tokenURI(tokenId);
            const metadataUrl = resolveIpfsUrl(tokenURI);
            const metadata = await fetchJsonWithValidation(metadataUrl);
            
            const isRefined = metadata.name.toLowerCase().includes('refined') || 
                              metadata.attributes?.some(attr => attr.value.toLowerCase() === 'refined');

            return {
              tokenId: tokenId.toString(),
              name: metadata.name,
              image: resolveIpfsUrl(metadata.image),
              type: isRefined ? 'refined' : 'raw',
            };
          }
        } catch (err) {
          console.error(`Could not process owned token #${tokenId.toString()}:`, err);
        }
        return null;
      });

      const results = (await Promise.all(tokenPromises)).filter(Boolean);
      // Sort to show raw materials first
      results.sort((a, b) => (a.type === 'raw' ? -1 : 1));
      setAllTokens(results);

    } catch (error) {
      console.error("Failed to fetch owned NFTs by event query:", error);
      setStatus({ message: 'Error fetching your NFTs. Check console.', type: 'error' });
    } finally {
      setFetching(false);
    }
  }, [contract, account, resolveIpfsUrl]);

  const handleRefine = async () => {
    if (!selectedTokenId) {
      setStatus({ message: 'Please select a raw material to refine.', type: 'error' });
      return;
    }
    try {
      setStatus({ message: 'Starting refinement...', type: 'info' });
      setLoading(true);

      const refineTx = await contract.refineBatch(selectedTokenId, [REFINED_NFT_URI]);
      const receipt = await refineTx.wait();

      const refinedIds = [];
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed?.name === 'BatchRefined') {
            refinedIds.push(...parsed.args.newTokenIds.map(id => id.toString()));
          }
        } catch { continue; }
      }

      for (const tokenId of refinedIds) {
        await contract.transferFrom(account, DISTRIBUTOR_ADDRESS, tokenId);
      }
      
      setSelectedTokenId('');
      setStatus({ message: `Refinement successful! NFTs transferred.`, type: 'success' });
      await fetchOwnedNFTs();
    } catch (err) {
      console.error(err);
      setStatus({ message: 'Refinement or Transfer failed. See console.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if(contract && account) {
      fetchOwnedNFTs();
    }
  }, [contract, account, fetchOwnedNFTs]);

  return (
    <div className="refinery-container">
      <aside className="action-sidebar">
        <div className="sidebar-header">
          <h1>🔬 Refinery</h1>
          <p>Refine raw materials into valuable new assets.</p>
        </div>
        
        <div className="sidebar-content">
          <h2>Execution Panel</h2>
          <p className="step-description">
            {selectedTokenId 
              ? `Selected Token #${selectedTokenId}. Ready to refine.`
              : "Select a raw material from your inventory to begin."
            }
          </p>
          <button
            onClick={handleRefine}
            disabled={loading || !selectedTokenId || fetching}
            className="refine-button"
          >
            {loading ? (
              <>
                <div className="spinner"></div>
                <span>Processing...</span>
              </>
            ) : (
              '🚀 Execute Refinement'
            )}
          </button>
          {status.message && (
            <div className={`status-message ${status.type}`}>
              <span className="status-icon">
                {status.type === 'success' && '✅'}
                {status.type === 'error' && '❌'}
                {status.type === 'info' && 'ℹ️'}
              </span>
              <p>{status.message}</p>
            </div>
          )}
        </div>

        <footer className="sidebar-footer">
          <p>Connected as: <span className="account-address">{account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'N/A'}</span></p>
        </footer>
      </aside>

      <main className="inventory-display">
        <header className="inventory-header">
          <h2>Your Full Inventory ({allTokens.length})</h2>
        </header>
        {fetching ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Fetching your on-chain assets...</p>
          </div>
        ) : (
          <div className="inventory-grid-container">
            {allTokens.length === 0 ? (
              <div className="empty-state">
                <h3>No Tokens Found</h3>
                <p>Your inventory is empty. Acquire some raw materials to get started.</p>
              </div>
            ) : (
              <div className="nft-grid">
                {allTokens.map((token) => (
                  <div
                    key={token.tokenId}
                    className={`nft-card ${selectedTokenId === token.tokenId ? 'selected' : ''} ${token.type === 'refined' ? 'non-selectable' : ''}`}
                    onClick={() => {
                      if (token.type === 'raw') {
                        setSelectedTokenId(token.tokenId);
                      }
                    }}
                  >
                    <div className="nft-card-image-container">
                      <img src={token.image} alt={token.name} className="nft-image" />
                      <span className={`token-badge ${token.type}`}>{token.type.toUpperCase()}</span>
                    </div>
                    <div className="nft-info">
                      <span className="nft-name">{token.name}</span>
                      <span className="nft-id">#{token.tokenId}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default RefineryDashboard;
