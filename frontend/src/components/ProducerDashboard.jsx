import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../context/Web3Context';
import './ProducerDashboard.css'; // Make sure to create this new CSS file

// --- Configuration from Environment Variables ---
const IPFS_GATEWAY = import.meta.env.VITE_IPFS_GATEWAY || 'https://ipfs.io/ipfs/';
const PRODUCER_RAW_NFT_URI = import.meta.env.VITE_PRODUCER_RAW_NFT_URI || '';

// --- Reusable Notification Component ---
const Notification = ({ message, type, onDismiss }) => {
  if (!message) return null;
  return (
    <div className={`notification ${type}`}>
      <p>{message}</p>
      <button onClick={onDismiss} className="dismiss-btn">&times;</button>
    </div>
  );
};

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


function ProducerDashboard() {
  const { contract, account } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [notification, setNotification] = useState({ message: '', type: '' });
  const [ownedTokens, setOwnedTokens] = useState([]);
  const [refineryAddress, setRefineryAddress] = useState('');

  const resolveIpfsUrl = (uri) => {
    if (uri?.startsWith('ipfs://')) {
      return uri.replace('ipfs://', IPFS_GATEWAY);
    }
    return uri;
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: '' }), 5000);
  };

  // --- CORRECTED & EFFICIENT NFT FETCHING LOGIC ---
  const fetchOwnedNFTs = useCallback(async () => {
    if (!contract || !account) return;
    setIsFetching(true);
    setOwnedTokens([]);

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
            
            // Assuming producer NFTs are always 'raw'
            const isRefined = metadata.name.toLowerCase().includes('refined');
            if (!isRefined) {
               return {
                tokenId: tokenId.toString(),
                name: metadata.name,
                image: resolveIpfsUrl(metadata.image),
              };
            }
          }
        } catch (err) {
          console.error(`Could not process token #${tokenId.toString()}:`, err);
        }
        return null;
      });

      const results = (await Promise.all(tokenPromises)).filter(Boolean);
      setOwnedTokens(results);
    } catch (error) {
      console.error("Failed to fetch owned NFTs by event query:", error);
      showNotification('Error fetching your NFTs. Check console.', 'error');
    } finally {
      setIsFetching(false);
    }
  }, [contract, account]);

  const handleCreateBatch = async () => {
    if (!PRODUCER_RAW_NFT_URI) {
      showNotification("Producer Raw NFT URI is not configured in .env file.", "error");
      return;
    }
    try {
      setLoading(true);
      showNotification('Sending transaction to create new batch...', 'info');
      const tx = await contract.createRawMaterial(PRODUCER_RAW_NFT_URI);
      await tx.wait();
      showNotification('✅ Batch created successfully!', 'success');
      
      // --- FIXED: Re-fetch NFTs after creating a new one ---
      await fetchOwnedNFTs();

    } catch (err) {
      console.error(err);
      showNotification('❌ Error creating batch. See console for details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTransferToRefinery = async (tokenId) => {
    if (!refineryAddress) {
      showNotification('Please enter a valid refinery address.', 'error');
      return;
    }
    try {
      setLoading(true);
      showNotification(`Transferring Token #${tokenId}...`, 'info');
      const tx = await contract.safeTransferFrom(account, refineryAddress, tokenId);
      await tx.wait();
      showNotification(`✅ Token #${tokenId} transferred successfully.`, 'success');
      
      // This was already correct, but it's good to confirm.
      await fetchOwnedNFTs();

    } catch (err) {
      console.error(err);
      showNotification('❌ Transfer failed. Check the address or console.', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (contract && account) {
      fetchOwnedNFTs();
    }
  }, [contract, account, fetchOwnedNFTs]);

  return (
    <>
      <Notification
        message={notification.message}
        type={notification.type}
        onDismiss={() => setNotification({ message: '', type: '' })}
      />
      <div className="producer-dashboard">
        <header className="producer-header">
          <h1>🌱 Producer Dashboard</h1>
          <p>Create new raw material batches and manage your inventory.</p>
        </header>

        <div className="dashboard-layout">
          <div className="form-container">
            <h3>Create New Raw Material</h3>
            <p className="form-description">Click the button below to mint a new raw material NFT according to the pre-defined metadata URI.</p>
            <button onClick={handleCreateBatch} disabled={loading || isFetching} className="create-button">
              {loading ? (
                <> <div className="spinner-small"></div> Creating... </>
              ) : ( 'Mint New Batch' )}
            </button>
          </div>

          <div className="inventory-container">
            <div className="inventory-header">
              <h3>Your Inventory ({ownedTokens.length})</h3>
              <div className="transfer-controls">
                <input 
                  id="refineryAddress" 
                  type="text" 
                  value={refineryAddress} 
                  onChange={(e) => setRefineryAddress(e.target.value)} 
                  placeholder="Enter Refinery Address to Transfer" 
                />
              </div>
            </div>

            {isFetching ? (
              <div className="loading-state">
                <div className="spinner-large"></div>
                <p>Fetching your inventory...</p>
              </div>
            ) : ownedTokens.length === 0 ? (
              <p className="empty-text">You do not own any raw material NFTs.</p>
            ) : (
              <div className="inventory-grid">
                {ownedTokens.map((token) => (
                  <div key={token.tokenId} className="inventory-card">
                    <img src={token.image} alt={token.name} className="inventory-image" />
                    <div className="inventory-info">
                      <span className="inventory-name">{token.name}</span>
                      <span className="inventory-id">Token #{token.tokenId}</span>
                    </div>
                    <button
                      onClick={() => handleTransferToRefinery(token.tokenId)}
                      disabled={loading || !refineryAddress}
                      className="transfer-button"
                    >
                      Transfer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default ProducerDashboard;
