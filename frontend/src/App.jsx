import React, { useState, useEffect } from 'react';
import { useWeb3 } from './context/Web3Context';
import ProducerDashboard from './components/ProducerDashboard';
import RefineryDashboard from './components/RefineryDashboard';
import DistributorDashboard from './components/DistributorDashboard';
import AuditorView from './components/AuditorView';
import './App.css';

function App() {
  const { contract, account: userAddress, isConnected, connect, disconnect } = useWeb3();
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const VITE_DISTRIBUTOR_ADDRESS = import.meta.env.VITE_DISTRIBUTOR_ADDRESS || '';

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  const handleLogout = async () => {
    if (disconnect) {
      await disconnect();
    }
  };

  useEffect(() => {
    if (!isConnected || !userAddress) {
      setUserRole(null);
      setIsLoading(false);
      return;
    }

    const checkUserRole = async () => {
      if (contract && userAddress) {
        setIsLoading(true);
        try {
          if (userAddress.toLowerCase() === VITE_DISTRIBUTOR_ADDRESS.toLowerCase()) {
            setUserRole('Distributor');
            return;
          }
          
          const PRODUCER_ROLE = await contract.PRODUCER_ROLE();
          const REFINERY_ROLE = await contract.REFINERY_ROLE();

          const isProducer = await contract.hasRole(PRODUCER_ROLE, userAddress);
          if (isProducer) { setUserRole('Producer'); return; }

          const isRefinery = await contract.hasRole(REFINERY_ROLE, userAddress);
          if (isRefinery) { setUserRole('Refinery'); return; }
          
          setUserRole('Auditor');
        } catch (error) {
          console.error("Error during role check:", error);
          setUserRole('Auditor');
        } finally {
          setIsLoading(false);
        }
      }
    };
    checkUserRole();
  }, [contract, userAddress, isConnected, VITE_DISTRIBUTOR_ADDRESS]);

  const renderDashboard = () => {
    switch (userRole) {
      case 'Producer': return <ProducerDashboard />;
      case 'Refinery': return <RefineryDashboard />;
      case 'Distributor': return <DistributorDashboard />;
      case 'Auditor': return <AuditorView />;
      default: return null; 
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="logo-container">
          <h1>🌿 VeriChain Traceability</h1>
        </div>
        
        <div className="connection-container">
          {isConnected ? (
            <div className="wallet-info">
              <span className="wallet-address">{formatAddress(userAddress)}</span>
              <button onClick={handleLogout} className="logout-button">Logout</button>
            </div>
          ) : (
            <button onClick={connect} className="connect-button">Connect Wallet</button>
          )}
        </div>
      </header>
      
      <main className="main-content">
        {!isConnected ? (
          <>
            <div className="connect-prompt">
              <div className="prompt-box">
                <h2>Welcome to VeriChain</h2>
                <p>The decentralized solution for supply chain transparency.</p>
                <p>Please connect your wallet to continue.</p>
              </div>
            </div>

            {/* === ADD THIS NEW SECTION === */}
            <div className="info-cards-container">
              <div className="info-card">
                <h3>For Producers</h3>
                <p>Register new batches of raw materials onto the blockchain, ensuring the origin and integrity of your products from the very start.</p>
              </div>
              <div className="info-card">
                <h3>For Refineries</h3>
                <p>Receive batches from producers, process them, and update their status on the chain. Create a verifiable link in the product's journey.</p>
              </div>
              <div className="info-card">
                <h3>For Distributors</h3>
                <p>Manage the final leg of the supply chain. Receive goods from refineries and log final distribution, completing the transparent record.</p>
              </div>
            </div>
            {/* === END OF NEW SECTION === */}
          </>
        ) : isLoading ? (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p>Verifying your role on the blockchain...</p>
          </div>
        ) : (
          renderDashboard()
        )}
      </main>
    </div>
  );
}

export default App;