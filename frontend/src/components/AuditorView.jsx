import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { ethers } from 'ethers';
import './AuditorView.css';

const AuditorView = () => {
  const { contract } = useWeb3();
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Helper function to format event data into a structured object
  const formatEvent = (log) => {
    const { from, to, tokenId } = log.args;
    const shortFrom = `${from.substring(0, 6)}...${from.substring(from.length - 4)}`;
    const shortTo = `${to.substring(0, 6)}...${to.substring(to.length - 4)}`;
    const id = log.transactionHash + tokenId.toString();

    // Check for Minting (from ZeroAddress)
    if (from === ethers.ZeroAddress) {
      return {
        id,
        icon: '✨',
        eventType: 'created',
        parts: {
          prefix: `Token #${tokenId} was `,
          keyword: 'CREATED',
          suffix: ` and sent to ${shortTo}.`
        }
      };
    }
    
    // Check for Burning (to ZeroAddress)
    if (to === ethers.ZeroAddress) {
        return {
          id,
          icon: '🔥',
          eventType: 'burned',
          parts: {
            prefix: `Token #${tokenId} was `,
            keyword: 'BURNED',
            suffix: ` by ${shortFrom}.`
          }
        };
    }
    
    // All other transfers
    return {
      id,
      icon: '🚚',
      eventType: 'transferred',
      parts: {
        prefix: `Token #${tokenId} was `,
        keyword: 'TRANSFERRED',
        suffix: ` from ${shortFrom} to ${shortTo}.`
      }
    };
  };
  
  const fetchPastEvents = useCallback(async () => {
    if (!contract) return;
    
    setIsLoading(true);
    try {
      const transferFilter = contract.filters.Transfer();
      const pastLogs = await contract.queryFilter(transferFilter, 0, 'latest');
      
      const formattedEvents = pastLogs.map(formatEvent).reverse(); // Show newest first
      setEvents(formattedEvents);

    } catch (err) {
      console.error("Error fetching past events:", err);
    } finally {
      setIsLoading(false);
    }
  }, [contract]);


  useEffect(() => {
    fetchPastEvents();

    if (contract) {
      const transferFilter = contract.filters.Transfer();
      const listener = (from, to, tokenId, log) => {
        const newEvent = formatEvent({ args: { from, to, tokenId }, transactionHash: log.transactionHash });
        
        setEvents(prevEvents => {
          if (prevEvents.find(e => e.id === newEvent.id)) {
            return prevEvents;
          }
          return [newEvent, ...prevEvents];
        });
      };

      contract.on(transferFilter, listener);

      return () => {
        contract.off(transferFilter, listener);
      };
    }
  }, [contract, fetchPastEvents]);

  return (
    <div className="auditor-view">
      <header className="auditor-header">
        <h1>📡 Live Blockchain Activity</h1>
        <p>A real-time feed of all supply chain events recorded on-chain.</p>
      </header>

      <div className="feed-container">
        {isLoading ? (
          <div className="loading-feed">
            <div className="spinner"></div>
            <p>Fetching historical data from the blockchain...</p>
          </div>
        ) : events.length === 0 ? (
          <p className="empty-feed">No on-chain activity has been recorded yet.</p>
        ) : (
          <div className="timeline">
            {events.map((event) => (
              <div key={event.id} className={`timeline-item ${event.eventType}`}>
                <div className="timeline-icon">{event.icon}</div>
                <div className="timeline-content">
                  <p>
                    {event.parts.prefix}
                    <strong className="event-keyword">{event.parts.keyword}</strong>
                    {event.parts.suffix}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditorView;