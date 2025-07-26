import React, { createContext, useState, useContext, useCallback } from 'react';
import { ethers } from 'ethers';
import { contractAddress, contractABI } from '../contractInfo';

const Web3Context = createContext();

export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [signer, setSigner] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert("Please install MetaMask to use this dApp!");
      return;
    }
    try {
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      setProvider(web3Provider);
      
      const web3Signer = await web3Provider.getSigner();
      setSigner(web3Signer);
      
      const userAddress = await web3Signer.getAddress();
      setAccount(userAddress);

      const verichainContract = new ethers.Contract(contractAddress, contractABI, web3Signer);
      setContract(verichainContract);
      
      setIsConnected(true);
      console.log("Wallet connected:", userAddress);

    } catch (error) {
      console.error("Error connecting wallet:", error);
      alert("Failed to connect wallet. See console for details.");
    }
  };

  // --- NEW: The Disconnect Function ---
  // This function simply resets the state, effectively "logging out".
  const disconnect = useCallback(() => {
    setAccount(null);
    setProvider(null);
    setContract(null);
    setSigner(null);
    setIsConnected(false);
    console.log("Wallet disconnected.");
  }, []);


  return (
    <Web3Context.Provider value={{
      account,
      provider,
      contract,
      signer,
      isConnected,
      connect: connectWallet, // Keep your original function, but export it as 'connect'
      disconnect,            // --- NEW: Export the disconnect function ---
    }}>
      {children}
    </Web3Context.Provider>
  );
};

// Custom hook to easily use the context
export const useWeb3 = () => {
  return useContext(Web3Context);
};