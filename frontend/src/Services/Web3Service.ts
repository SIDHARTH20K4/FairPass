import { createPublicClient, createWalletClient, http, parseEther, formatEther, type Address, type Hash, defineChain } from 'viem';
import { eventFactoryABI, eventImplementationABI, eventTicketABI } from '../../web3/constants';

// Define Sonic Testnet chain
const sonicTestnet = defineChain({
  id: 14601,
  name: 'Sonic Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Sonic',
    symbol: 'S',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.soniclabs.com'],
    },
    public: {
      http: ['https://rpc.testnet.soniclabs.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'SonicScan',
      url: 'https://testnet.sonicscan.org',
    },
  },
  testnet: true,
});

// Use the full ABIs from constants
const EVENT_FACTORY_ABI = eventFactoryABI;
const EVENT_IMPLEMENTATION_ABI = eventImplementationABI;
const EVENT_TICKET_ABI = eventTicketABI;

export enum EventType {
  FREE = 0,
  PAID = 1,
  APPROVAL = 2
}

export interface CreateEventParams {
  name: string;
  eventType: EventType;
  ticketPrice: string; // in wei as string
  eventOwner?: Address;
}

export interface BuyTicketParams {
  eventAddress: Address;
  metadataURI: string;
  value?: string; // in wei as string
}

export interface MintForUserParams {
  eventAddress: Address;
  user: Address;
  metadataURI: string;
}

export interface ListTicketParams {
  eventAddress: Address;
  tokenId: number;
  price: string; // in wei as string
}

export interface BuyResaleParams {
  eventAddress: Address;
  tokenId: number;
  price: string; // in wei as string
}

class Web3Service {
  private publicClient: any = null;
  private walletClient: any = null;
  private isInitialized: boolean = false;
  private eventFactoryAddress: Address | null = null;
  private readonly RPC_URL = process.env.NEXT_PUBLIC_SONIC_RPC_URL || 'https://rpc.testnet.soniclabs.com';
  private readonly EVENT_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_EVENT_FACTORY_ADDRESS as Address;

  async initialize(): Promise<void> {
    try {
      // Create public client for reading blockchain data
      this.publicClient = createPublicClient({
        chain: sonicTestnet,
        transport: http(this.RPC_URL)
      });

      // Check if we have the required environment variables
      if (!this.EVENT_FACTORY_ADDRESS) {
        throw new Error('EVENT_FACTORY_ADDRESS environment variable is required');
      }

      this.eventFactoryAddress = this.EVENT_FACTORY_ADDRESS;
      this.isInitialized = true;

      console.log('Web3Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Web3Service:', error);
      throw error;
    }
  }

  setWalletClient(walletClient: any) {
    this.walletClient = walletClient;
  }

  // Utility functions
  parseEther(value: string): string {
    return parseEther(value).toString();
  }

  formatEther(value: string): string {
    return formatEther(BigInt(value));
  }

  // Event Factory functions
  async createEvent(params: CreateEventParams): Promise<string> {
    if (!this.isInitialized || !this.walletClient) {
      throw new Error('Web3Service not initialized or wallet not connected');
    }

    let transactionHash: string | null = null;

    try {
      const { name, eventType, ticketPrice, eventOwner } = params;

      // Debug: Log transaction parameters
      console.log('Creating event with parameters:');
      console.log('- EventFactory Address:', this.eventFactoryAddress);
      console.log('- Name:', name);
      console.log('- EventType:', eventType, '(type:', typeof eventType, ')');
      console.log('- TicketPrice:', ticketPrice, '(type:', typeof ticketPrice, ')');
      console.log('- EventOwner:', eventOwner);

      // First, let's check if the EventFactory contract is deployed and accessible
      try {
        const code = await this.publicClient.getBytecode({ address: this.eventFactoryAddress! });
        if (!code || code === '0x') {
          throw new Error(`EventFactory contract not deployed at address ${this.eventFactoryAddress}. Please contact the platform administrator to deploy the EventFactory contract first.`);
        }
        console.log('✅ EventFactory contract found at address:', this.eventFactoryAddress);
        
        // Check if we can call a view function
        const platformOwner = await this.publicClient.readContract({
          address: this.eventFactoryAddress!,
          abi: EVENT_FACTORY_ABI,
          functionName: 'platformOwner',
        });
        console.log('✅ EventFactory platformOwner:', platformOwner);
        
        // Test if we can call getAllEvents to verify the contract is working
        try {
          const allEvents = await this.publicClient.readContract({
            address: this.eventFactoryAddress!,
            abi: EVENT_FACTORY_ABI,
            functionName: 'getAllEvents',
          });
          console.log('✅ EventFactory getAllEvents call successful, found', allEvents.length, 'events');
        } catch (readError) {
          console.warn('⚠️ EventFactory getAllEvents call failed:', readError);
        }
      } catch (contractError) {
        console.error('EventFactory contract check failed:', contractError);
        if (contractError instanceof Error && contractError.message.includes('not deployed')) {
          // Check if the address is the zero address (not configured)
          if (this.eventFactoryAddress === '0x0000000000000000000000000000000000000000') {
            throw new Error(`EventFactory contract address not configured. Please set NEXT_PUBLIC_EVENT_FACTORY_ADDRESS in your environment variables to the deployed EventFactory contract address.`);
          } else {
            throw new Error(`EventFactory contract not deployed at address ${this.eventFactoryAddress}. Please verify the contract address or contact the platform administrator.`);
          }
        }
        throw new Error(`EventFactory contract check failed: ${contractError instanceof Error ? contractError.message : 'Unknown error'}`);
      }

      // Now let's estimate gas to see if there are any issues
      try {
        const gasEstimate = await this.publicClient.estimateContractGas({
          address: this.eventFactoryAddress!,
          abi: EVENT_FACTORY_ABI,
          functionName: 'createEvent',
          args: [name, Number(eventType), BigInt(ticketPrice)],
          account: this.walletClient.account,
        });
        console.log('✅ Gas estimate:', gasEstimate.toString());
      } catch (gasError) {
        console.error('❌ Gas estimation failed:', gasError);
        
        // Try to decode the error if it's a contract error
        if (gasError && typeof gasError === 'object' && 'data' in gasError) {
          console.error('Error data:', gasError.data);
          console.error('Error signature:', gasError.data?.error?.data || 'No signature found');
        }
        
        // Check if it's a specific revert reason
        if (gasError instanceof Error && gasError.message.includes('0x1e4fbdf7')) {
          throw new Error(`Contract function reverted with signature 0x1e4fbdf7. This usually indicates a require() statement failed in the smart contract. Please check that the EventFactory contract is properly deployed and that all parameters are valid.`);
        }
        
        throw new Error(`Gas estimation failed: ${gasError instanceof Error ? gasError.message : 'Unknown error'}`);
      }

      // Prepare transaction with optimized gas settings for Sonic testnet
      transactionHash = await this.walletClient.writeContract({
        address: this.eventFactoryAddress!,
        abi: EVENT_FACTORY_ABI,
        functionName: 'createEvent',
        args: [name, Number(eventType), BigInt(ticketPrice)],
        account: this.walletClient.account,
        gas: BigInt('3000000'), // Higher gas limit for testnet
        gasPrice: BigInt('2000000000') // 2 gwei gas price (higher for faster confirmation)
      });

      console.log('Transaction hash:', transactionHash);

      // Event-based confirmation using block watchers
      console.log('⏳ Waiting for transaction confirmation...');
      if (!transactionHash) {
        throw new Error('Transaction hash not available');
      }
      const receipt = await this.waitForTransactionConfirmation(transactionHash as `0x${string}`, 600000); // 10 minutes timeout
      console.log('✅ Transaction confirmation received:', receipt);
      
      // Debug: Log all receipt details
      console.log('=== TRANSACTION RECEIPT DEBUG ===');
      console.log('Transaction receipt:', receipt);
      console.log('Receipt status:', receipt.status);
      console.log('Receipt logs:', receipt.logs);
      console.log('Number of logs:', receipt.logs.length);
      console.log('Receipt contractAddress:', receipt.contractAddress);
      console.log('Receipt to:', receipt.to);
      console.log('Receipt from:', receipt.from);
      console.log('=== END RECEIPT DEBUG ===');
      
      // Check if transaction was successful
      if (receipt.status !== 'success') {
        console.log('❌ Transaction failed with status:', receipt.status);
        throw new Error(`Transaction failed with status: ${receipt.status}. This usually means the smart contract call reverted. Check the transaction on SonicScan: https://testnet.sonicscan.org/tx/${transactionHash}`);
      }
      
      // Find the EventCreated event to get the new event address
      let eventCreatedLog = null;
      
      console.log('=== SEARCHING FOR EVENTCREATED EVENT ===');
      console.log('EventFactory ABI length:', EVENT_FACTORY_ABI.length);
      console.log('Looking for EventCreated event in', receipt.logs.length, 'logs');
      
      try {
        for (let i = 0; i < receipt.logs.length; i++) {
          const log = receipt.logs[i];
          console.log(`\n--- Log ${i} ---`);
          console.log('Log address:', log.address);
          console.log('Log topics:', log.topics);
          console.log('Log data:', log.data);
          console.log('Log data length:', log.data.length);
          
          try {
            const decoded = this.publicClient.decodeEventLog({
              abi: EVENT_FACTORY_ABI,
              data: log.data,
              topics: log.topics
            });
            console.log(`✅ Successfully decoded log ${i}:`, decoded);
            console.log('Event name:', decoded.eventName);
            console.log('Event args:', decoded.args);
            
            if (decoded.eventName === 'EventCreated') {
              console.log('🎉 FOUND EventCreated event!', decoded);
              eventCreatedLog = log;
              break;
            }
          } catch (error) {
            console.log(`❌ Failed to decode log ${i}:`, error);
            console.log('Error details:', error instanceof Error ? error.message : 'Unknown error');
          }
        }
      } catch (error) {
        console.error('Error processing logs:', error);
        throw new Error(`Failed to process transaction logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      console.log('=== END EVENT SEARCH ===');
      console.log('EventCreated log found:', !!eventCreatedLog);

      if (eventCreatedLog) {
        try {
          const decoded = this.publicClient.decodeEventLog({
            abi: EVENT_FACTORY_ABI,
            data: eventCreatedLog.data,
            topics: eventCreatedLog.topics
          });
          console.log('Final decoded event:', decoded);
          return decoded.args.eventAddress;
        } catch (error) {
          console.error('Error decoding EventCreated event:', error);
          throw new Error(`Failed to decode EventCreated event: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // If no EventCreated event found, log all possible events
      console.log('=== NO EVENTCREATED EVENT FOUND ===');
      console.log('Available events:');
      for (let i = 0; i < receipt.logs.length; i++) {
        const log = receipt.logs[i];
        try {
          const decoded = this.publicClient.decodeEventLog({
            abi: EVENT_FACTORY_ABI,
            data: log.data,
            topics: log.topics
          });
          console.log(`Event ${i}: ${decoded.eventName}`);
        } catch (error) {
          console.log(`Event ${i}: Could not decode`);
        }
      }

      // Fallback: Try to get the event address from the transaction receipt
      // The EventFactory creates a new EventImplementation contract
      // We can try to find the contract creation in the receipt
      console.log('=== TRYING FALLBACK METHODS ===');
      console.log('Trying fallback method to find contract address...');
      
      // Check if there are any contract creations in the receipt
      if (receipt.contractAddress) {
        console.log('✅ Found contract address in receipt:', receipt.contractAddress);
        return receipt.contractAddress;
      }
      
      // Check logs for any contract creation events
      console.log('Checking logs for contract creation events...');
      for (let i = 0; i < receipt.logs.length; i++) {
        const log = receipt.logs[i];
        if (log.topics.length > 0) {
          // Check if this is a contract creation log
          console.log(`Checking log ${i} for contract creation:`, log);
        }
      }

      console.log('=== ALL FALLBACK METHODS FAILED ===');
      throw new Error('Event creation transaction completed but event address not found');
    } catch (error) {
      console.error('❌ Failed to create event:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
      
      // If it's a timeout error, provide more helpful information
      if (error instanceof Error && (error.message.includes('timeout') || error.message.includes('Timed out'))) {
        console.log('🕐 Timeout error detected, checking if transaction was actually confirmed...');
        // Check if transaction is actually confirmed
        if (transactionHash) {
          try {
            const receipt = await this.publicClient.getTransactionReceipt({ hash: transactionHash });
            if (receipt) {
              console.log('Transaction was confirmed despite timeout, processing...');
              // Transaction is confirmed, try to find the event
              const eventCreatedLog = receipt.logs.find((log: any) => {
        try {
          const decoded = this.publicClient.decodeEventLog({
            abi: EVENT_FACTORY_ABI,
            data: log.data,
            topics: log.topics
          });
          return decoded.eventName === 'EventCreated';
        } catch {
          return false;
        }
      });

      if (eventCreatedLog) {
        const decoded = this.publicClient.decodeEventLog({
          abi: EVENT_FACTORY_ABI,
          data: eventCreatedLog.data,
          topics: eventCreatedLog.topics
        });
        return decoded.args.eventAddress;
              }
            }
          } catch (receiptError) {
            console.log('Could not fetch receipt directly:', receiptError);
          }
          
          throw new Error(`Transaction submitted but timed out waiting for confirmation. Transaction hash: ${transactionHash}. Check the transaction status on SonicScan: https://testnet.sonicscan.org/tx/${transactionHash}`);
        } else {
          throw new Error('Transaction failed and no transaction hash available');
        }
      }
      
      throw error;
    }
  }

  // Utility method for event-based transaction confirmation
  private async waitForTransactionConfirmation(hash: Hash, timeoutMs: number = 600000): Promise<any> {
    console.log(`Watching for transaction confirmation: ${hash}`);
    
    return new Promise<any>((resolve, reject) => {
      let timeoutId: NodeJS.Timeout;
      let unwatch: (() => void) | null = null;
      
      // Set up timeout
      timeoutId = setTimeout(() => {
        if (unwatch) unwatch();
        reject(new Error(`Transaction confirmation timeout after ${timeoutMs / 1000} seconds. Hash: ${hash}. Check status at: https://testnet.sonicscan.org/tx/${hash}`));
      }, timeoutMs);
      
      // Watch for new blocks and check transaction status
      unwatch = this.publicClient.watchBlockNumber({
        onBlockNumber: async (blockNumber: bigint) => {
          try {
            console.log(`Checking block ${blockNumber} for transaction ${hash}`);
            const receipt = await this.publicClient.getTransactionReceipt({ hash });
            
            if (receipt) {
              console.log(`✅ Transaction confirmed in block ${blockNumber}`);
              console.log('✅ Receipt received:', receipt);
              console.log('✅ Transaction status:', receipt.status);
              
              // Check if transaction was successful
              if (receipt.status === 'success') {
                clearTimeout(timeoutId);
                if (unwatch) unwatch();
                console.log('✅ Transaction succeeded, resolving promise');
                resolve(receipt);
              } else {
                console.log('❌ Transaction failed with status:', receipt.status);
                clearTimeout(timeoutId);
                if (unwatch) unwatch();
                reject(new Error(`Transaction failed with status: ${receipt.status}. Check the transaction on SonicScan: https://testnet.sonicscan.org/tx/${hash}`));
              }
            } else {
              console.log(`❌ No receipt found for transaction ${hash} in block ${blockNumber}`);
            }
          } catch (error) {
            console.log(`Error checking block ${blockNumber}:`, error);
            // Continue watching, don't reject on individual block check errors
          }
        },
        onError: (error: Error) => {
          console.error('Block watcher error:', error);
          // Don't reject immediately, let timeout handle it
        }
      });
      
      // Also check immediately in case transaction is already confirmed
      this.publicClient.getTransactionReceipt({ hash })
        .then((immediateReceipt: any) => {
          if (immediateReceipt) {
            console.log('Transaction already confirmed');
            clearTimeout(timeoutId);
            if (unwatch) unwatch();
            resolve(immediateReceipt);
          }
        })
        .catch((error: Error) => {
          console.log('Immediate check failed, continuing to watch blocks:', error);
        });
    });
  }

  // Event Implementation functions
  async buyTicket(params: BuyTicketParams): Promise<Hash> {
    if (!this.walletClient) {
      throw new Error('Wallet not connected');
    }

    const { eventAddress, metadataURI, value } = params;

    const hash = await this.walletClient.writeContract({
      address: eventAddress,
      abi: EVENT_IMPLEMENTATION_ABI,
      functionName: 'buyTicket',
      args: [metadataURI],
      value: value ? BigInt(value) : BigInt('0')
    });

    return hash;
  }

  async mintForUser(eventAddress: Address, user: Address, metadataURI: string): Promise<Hash> {
    if (!this.walletClient) {
      throw new Error('Wallet not connected');
    }

    const hash = await this.walletClient.writeContract({
      address: eventAddress,
      abi: EVENT_IMPLEMENTATION_ABI,
      functionName: 'mintForUser',
      args: [user, metadataURI]
    });

    return hash;
  }

  async checkIn(eventAddress: Address, tokenId: number): Promise<Hash> {
    if (!this.walletClient) {
      throw new Error('Wallet not connected');
    }

    const hash = await this.walletClient.writeContract({
      address: eventAddress,
      abi: EVENT_IMPLEMENTATION_ABI,
      functionName: 'checkIn',
      args: [BigInt(tokenId)]
    });

    return hash;
  }

  // Event Ticket functions
  async listTicketForResale(eventAddress: Address, tokenId: number, price: string): Promise<Hash> {
    if (!this.walletClient) {
      throw new Error('Wallet not connected');
    }

    // First, we need to get the ticket NFT contract address from the event
    const ticketNFTAddress = await this.getTicketNFTAddress(eventAddress);

    const hash = await this.walletClient.writeContract({
      address: ticketNFTAddress,
      abi: EVENT_TICKET_ABI,
      functionName: 'listForResale',
      args: [BigInt(tokenId), BigInt(price)]
    });

    return hash;
  }

  async buyResaleTicket(eventAddress: Address, tokenId: number, price: string): Promise<Hash> {
    if (!this.walletClient) {
      throw new Error('Wallet not connected');
    }

    const ticketNFTAddress = await this.getTicketNFTAddress(eventAddress);

    const hash = await this.walletClient.writeContract({
      address: ticketNFTAddress,
      abi: EVENT_TICKET_ABI,
      functionName: 'buyResale',
      args: [BigInt(tokenId)],
      value: BigInt(price)
    });

    return hash;
  }

  async cancelResale(eventAddress: Address, tokenId: number): Promise<Hash> {
    if (!this.walletClient) {
      throw new Error('Wallet not connected');
    }

    const ticketNFTAddress = await this.getTicketNFTAddress(eventAddress);

    const hash = await this.walletClient.writeContract({
      address: ticketNFTAddress,
      abi: EVENT_TICKET_ABI,
      functionName: 'cancelResale',
      args: [BigInt(tokenId)]
    });

    return hash;
  }

  // Helper function to get ticket NFT address from event contract
  private async getTicketNFTAddress(eventAddress: Address): Promise<Address> {
    const ticketNFTAddress = await this.publicClient.readContract({
      address: eventAddress,
      abi: EVENT_IMPLEMENTATION_ABI,
      functionName: 'ticketNFT'
    });

    return ticketNFTAddress as Address;
  }

  // Read functions
  async getEventInfo(eventAddress: Address) {
    const [eventName, eventType, ticketPrice] = await Promise.all([
      this.publicClient.readContract({
        address: eventAddress,
        abi: EVENT_IMPLEMENTATION_ABI,
        functionName: 'eventName'
      }),
      this.publicClient.readContract({
        address: eventAddress,
        abi: EVENT_IMPLEMENTATION_ABI,
        functionName: 'eventType'
      }),
      this.publicClient.readContract({
        address: eventAddress,
        abi: EVENT_IMPLEMENTATION_ABI,
        functionName: 'ticketPrice'
      })
    ]);

    return {
      name: eventName,
      type: eventType,
      price: ticketPrice
    };
  }

  async getTicketOwner(eventAddress: Address, tokenId: number): Promise<Address> {
    const ticketNFTAddress = await this.getTicketNFTAddress(eventAddress);
    
    const owner = await this.publicClient.readContract({
      address: ticketNFTAddress,
      abi: EVENT_TICKET_ABI,
      functionName: 'ownerOf',
      args: [BigInt(tokenId)]
    });

    return owner as Address;
  }

  async getResaleInfo(eventAddress: Address, tokenId: number) {
    const ticketNFTAddress = await this.getTicketNFTAddress(eventAddress);
    
    const resaleInfo = await this.publicClient.readContract({
      address: ticketNFTAddress,
      abi: EVENT_TICKET_ABI,
      functionName: 'getResaleInfo',
      args: [BigInt(tokenId)]
    });

    return resaleInfo;
  }
}

// Export singleton instance
export const web3Service = new Web3Service();