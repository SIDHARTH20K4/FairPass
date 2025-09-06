"use client";

import { useState, useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import { eventFactoryABI, eventFactoryAddress } from '../../web3/constants';

interface TransactionStatusProps {
  hash: string;
  onSuccess?: (receipt: any) => void;
  onError?: (error: Error) => void;
  className?: string;
}

export default function TransactionStatus({ 
  hash, 
  onSuccess, 
  onError, 
  className = "" 
}: TransactionStatusProps) {
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'failed'>('pending');
  const [receipt, setReceipt] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const publicClient = usePublicClient();

  console.log('🔍 TransactionStatus component rendered with hash:', hash);

  useEffect(() => {
    console.log('🔍 TransactionStatus useEffect triggered:', { hash, publicClient: !!publicClient });
    if (!hash || !publicClient) {
      console.log('⏭️ Skipping - missing hash or publicClient');
      return;
    }

    const checkTransaction = async () => {
      console.log('🔍 Starting transaction check for hash:', hash);
      try {
        const receipt = await publicClient.waitForTransactionReceipt({ 
          hash: hash as `0x${string}`,
          timeout: 300000 // 5 minutes
        });

        if (receipt.status === 'success') {
          setStatus('confirmed');
          
          // Try to extract contract address from EventCreated event
          let contractAddress = null;
          console.log('🔍 Parsing transaction logs for EventCreated event...');
          console.log('📊 Receipt logs count:', receipt.logs.length);
          
          try {
            for (let i = 0; i < receipt.logs.length; i++) {
              const log = receipt.logs[i];
              console.log(`\n--- Log ${i} ---`);
              console.log('Log address:', log.address);
              console.log('EventFactory address:', eventFactoryAddress);
              console.log('Address match:', log.address.toLowerCase() === eventFactoryAddress.toLowerCase());
              console.log('Log topics:', log.topics);
              console.log('Log data:', log.data);
              
              // Only process logs from the EventFactory contract
              if (log.address.toLowerCase() !== eventFactoryAddress.toLowerCase()) {
                console.log(`⏭️ Skipping log ${i} - not from EventFactory contract`);
                continue;
              }
              
              // Check if this looks like an EventCreated event by examining the topics
              // EventCreated(address indexed eventAddress, string name)
              // The first topic should be the keccak256 hash of "EventCreated(address,string)"
              console.log(`🔍 Log ${i} first topic:`, log.topics[0]);
              console.log(`🔍 Log ${i} has ${log.topics.length} topics`);
              
              try {
                const decoded = publicClient.decodeEventLog({
                  abi: eventFactoryABI,
                  data: log.data,
                  topics: log.topics
                });
                
                console.log(`✅ Successfully decoded log ${i}:`, decoded);
                console.log('Event name:', decoded.eventName);
                console.log('Event args:', decoded.args);
                
                if (decoded.eventName === 'EventCreated') {
                  console.log('🎉 Found EventCreated event!');
                  console.log('🔍 Full decoded args:', decoded.args);
                  console.log('🔍 Args keys:', Object.keys(decoded.args));
                  console.log('🔍 Args values:', Object.values(decoded.args));
                  
                  // Try multiple ways to access the eventAddress
                  contractAddress = decoded.args.eventAddress || 
                                  decoded.args[0] || 
                                  (decoded.args as any).eventAddress ||
                                  (decoded.args as any)[0];
                  
                  console.log('🎉 Extracted contract address:', contractAddress);
                  
                  if (contractAddress) {
                    break;
                  } else {
                    console.warn('⚠️ Could not extract contract address from EventCreated event');
                  }
                }
              } catch (error) {
                console.log(`❌ Failed to decode log ${i}:`, error);
                console.log('Error details:', error instanceof Error ? error.message : 'Unknown error');
                // Skip logs that can't be decoded with our ABI
                continue;
              }
            }
          } catch (error) {
            console.warn('Failed to parse event logs:', error);
          }
          
                              console.log('🔍 Event parsing complete. Contract address found:', contractAddress);

                    // Additional debugging: Let's also check if there are any logs that might contain the contract address
                    if (!contractAddress) {
                      console.log('🔍 No contract address found, checking all logs for potential addresses...');
                      for (let i = 0; i < receipt.logs.length; i++) {
                        const log = receipt.logs[i];
                        console.log(`🔍 All logs ${i}:`, {
                          address: log.address,
                          topics: log.topics,
                          data: log.data,
                          isEventFactory: log.address.toLowerCase() === eventFactoryAddress.toLowerCase()
                        });
                      }
                    }

                    // Alternative approach: Look for the last created contract address in the transaction
                    if (!contractAddress) {
                      console.log('🔍 Trying alternative approach - looking for created contracts...');
                      
                      // Method 1: Look for any logs that might contain contract addresses
                      const potentialAddresses = [];
                      for (let i = 0; i < receipt.logs.length; i++) {
                        const log = receipt.logs[i];
                        console.log(`🔍 Log ${i} analysis:`, {
                          address: log.address,
                          topics: log.topics,
                          data: log.data
                        });
                        
                        // Look for addresses in topics (indexed parameters)
                        for (let j = 1; j < log.topics.length; j++) {
                          const topic = log.topics[j];
                          if (topic && topic.length === 66) { // 0x + 64 hex chars = address
                            const address = '0x' + topic.slice(26); // Remove padding
                            if (address !== '0x0000000000000000000000000000000000000000') {
                              potentialAddresses.push(address);
                              console.log(`🔍 Found potential address in topic ${j}: ${address}`);
                            }
                          }
                        }
                      }
                      
                      // Method 2: Look for the EventCreated event by checking all logs from EventFactory
                      for (let i = 0; i < receipt.logs.length; i++) {
                        const log = receipt.logs[i];
                        if (log.address.toLowerCase() === eventFactoryAddress.toLowerCase()) {
                          console.log(`🔍 EventFactory log ${i}:`, log);
                          // Try to decode this log as EventCreated
                          try {
                            const decoded = publicClient.decodeEventLog({
                              abi: eventFactoryABI,
                              data: log.data,
                              topics: log.topics
                            });
                            console.log(`🔍 Decoded EventFactory log ${i}:`, decoded);
                            if (decoded.eventName === 'EventCreated') {
                              const eventAddress = decoded.args.eventAddress || decoded.args[0];
                              if (eventAddress) {
                                potentialAddresses.push(eventAddress);
                                console.log(`🔍 EventCreated address from manual decode: ${eventAddress}`);
                              }
                            }
                          } catch (error) {
                            console.log(`🔍 Could not decode EventFactory log ${i}:`, error);
                          }
                        }
                      }
                      
                      if (potentialAddresses.length > 0) {
                        // Take the last address found
                        contractAddress = potentialAddresses[potentialAddresses.length - 1];
                        console.log('🎉 Using last found address:', contractAddress);
                      }
                    }
          
          // Fallback: If no contract address found from events, try to get it from the transaction
          if (!contractAddress) {
            console.log('🔄 No contract address from events, checking transaction details...');
            console.log('Transaction to:', receipt.to);
            console.log('Transaction from:', receipt.from);
            console.log('Transaction contractAddress:', receipt.contractAddress);
            
            // Method 3: Look for contract creation in the transaction itself
            // When a factory creates a contract, the new contract address is often in the logs
            console.log('🔍 Checking for contract creation in transaction...');
            
            // Look for any address that's not the EventFactory address
            const allAddresses = new Set();
            allAddresses.add(receipt.to?.toLowerCase());
            allAddresses.add(receipt.from?.toLowerCase());
            allAddresses.add(eventFactoryAddress.toLowerCase());
            
            for (let i = 0; i < receipt.logs.length; i++) {
              const log = receipt.logs[i];
              allAddresses.add(log.address.toLowerCase());
              
              // Look for addresses in topics
              for (let j = 1; j < log.topics.length; j++) {
                const topic = log.topics[j];
                if (topic && topic.length === 66) {
                  const address = '0x' + topic.slice(26);
                  if (address !== '0x0000000000000000000000000000000000000000') {
                    allAddresses.add(address.toLowerCase());
                  }
                }
              }
            }
            
            // Filter out known addresses to find potential new contracts
            const knownAddresses = [
              eventFactoryAddress.toLowerCase(),
              receipt.to?.toLowerCase(),
              receipt.from?.toLowerCase()
            ].filter(Boolean);
            
            const newAddresses = Array.from(allAddresses).filter(addr => 
              addr && !knownAddresses.includes(addr)
            );
            
            console.log('🔍 All addresses found:', Array.from(allAddresses));
            console.log('🔍 Known addresses:', knownAddresses);
            console.log('🔍 Potential new addresses:', newAddresses);
            
            if (newAddresses.length > 0) {
              // Take the last new address found
              contractAddress = newAddresses[newAddresses.length - 1];
              console.log('🎉 Using last new address found:', contractAddress);
            } else if (receipt.contractAddress) {
              contractAddress = receipt.contractAddress;
              console.log('📋 Using contractAddress from receipt:', contractAddress);
            } else {
              console.warn('⚠️ No contract address found in transaction receipt or event logs');
              console.log('🔍 This might indicate that the EventCreated event was not emitted or not parsed correctly');
            }
          }
          
          // Add contract address to receipt if found
          const enhancedReceipt = {
            ...receipt,
            contractAddress: contractAddress || receipt.contractAddress
          };
          
          setReceipt(enhancedReceipt);
          if (onSuccess) {
            onSuccess(enhancedReceipt);
          }
        } else {
          setStatus('failed');
          setError('Transaction failed');
          if (onError) {
            onError(new Error('Transaction failed'));
          }
        }
      } catch (err) {
        setStatus('failed');
        const errorMessage = err instanceof Error ? err.message : 'Transaction failed';
        setError(errorMessage);
        if (onError) {
          onError(err instanceof Error ? err : new Error(errorMessage));
        }
      }
    };

    checkTransaction();
  }, [hash, publicClient, onSuccess, onError]);

  if (status === 'pending') {
    return (
      <div className={`flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg ${className}`}>
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <div>
          <p className="text-sm font-medium text-blue-900">Transaction Pending</p>
          <p className="text-xs text-blue-700 font-mono">
            {hash.slice(0, 10)}...{hash.slice(-8)}
          </p>
        </div>
      </div>
    );
  }

  if (status === 'confirmed') {
    return (
      <div className={`flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg ${className}`}>
        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <div className="flex-1">
          <p className="text-sm font-medium text-green-900">Transaction Confirmed</p>
          <p className="text-xs text-green-700">
            Block: {receipt?.blockNumber?.toString()}
          </p>
          {receipt?.contractAddress && (
            <p className="text-xs text-green-700 font-mono mt-1">
              Contract: {receipt.contractAddress.slice(0, 10)}...{receipt.contractAddress.slice(-8)}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className={`flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        <div>
          <p className="text-sm font-medium text-red-900">Transaction Failed</p>
          <p className="text-xs text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return null;
}

