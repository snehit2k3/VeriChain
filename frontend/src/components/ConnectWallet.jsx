import React from 'react';
import { useWeb3 } from '../context/Web3Context';

const ConnectWallet = () => {
  const { connectWallet, account, isConnected } = useWeb3();

  // Function to shorten the wallet address for display
  const shortenAddress = (address) => {
    if (!address) return "";
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div>
      {isConnected ? (
        <p>✅ Connected: <strong>{shortenAddress(account)}</strong></p>
      ) : (
        <button onClick={connectWallet}>
          Connect Wallet
        </button>
      )}
    </div>
  );
};

export default ConnectWallet;