import { createPublicClient, createWalletClient, http, parseEther, formatEther, type Address, type Hash, defineChain } from 'viem';

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

// Contract ABIs (simplified - you'll need the full ABIs from your compiled contracts)
const EVENT_FACTORY_ABI = [
  {
    "inputs": [
      { "name": "name", "type": "string" },
      { "name": "EventType", "type": "uint8" },
      { "name": "ticketPrice", "type": "uint256" }
    ],
    "name": "createEvent",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "eventAddress", "type": "address" },
      { "indexed": false, "name": "name", "type": "string" }
    ],
    "name": "EventCreated",
    "type": "event"
  }
] as const;

const EVENT_IMPLEMENTATION_ABI = [
  {
    "inputs": [
      { "name": "metadataURI", "type": "string" }
    ],
    "name": "buyTicket",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "user", "type": "address" },
      { "name": "metadataURI", "type": "string" }
    ],
    "name": "mintForUser",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "tokenId", "type": "uint256" }
    ],
    "name": "checkIn",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

const EVENT_TICKET_ABI = [
  {
    "inputs": [
      { "name": "tokenId", "type": "uint256" },
      { "name": "price", "type": "uint256" }
    ],
    "name": "listForResale",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "tokenId", "type": "uint256" }
    ],
    "name": "buyResale",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "tokenId", "type": "uint256" }
    ],
    "name": "ownerOf",
    "outputs": [
      { "name": "", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export enum EventType {
  FREE = 0,
  PAID = 1,
  APPROVAL = 2
}

export interface CreateEventParams {
  name: string;
  eventType: EventType;
  ticketPrice: string; // in wei as string
  eventOwner: Address;
}

export interface BuyTicketParams {
  eventAddress: Address;
  metadataURI: string;
  value?: string; // in wei as string for paid events
}

export interface ListTicketParams {
  eventAddress: Address;
  tokenId: number;
  price: string; // in wei as string
}

class Web3Service {
  private publicClient: any = null;
  private walletClient: any = null;
  private eventFactoryAddress: Address | null = null;
  private isInitialized = false;

  // Configuration
  private readonly RPC_URL = process.env.NEXT_PUBLIC_SONIC_RPC_URL || 'https://rpc.soniclabs.com';
  private readonly EVENT_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_EVENT_FACTORY_ADDRESS as Address;

  async initialize(): Promise<void> {
    try {
      // Create public client for reading blockchain data
      this.publicClient = createPublicClient({
        chain: sonic,
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

  // Set wallet client (called when user connects wallet)
  setWalletClient(walletClient: any): void {
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

    try {
      const { name, eventType, ticketPrice, eventOwner } = params;

      // Prepare transaction with optimized gas settings for Sonic testnet
      const hash = await this.walletClient.writeContract({
        address: this.eventFactoryAddress!,
        abi: EVENT_FACTORY_ABI,
        functionName: 'createEvent',
        args: [name, eventType, BigInt(ticketPrice)],
        account: eventOwner,
        gas: BigInt(3000000), // Higher gas limit for testnet
        gasPrice: BigInt(2000000000) // 2 gwei gas price (higher for faster confirmation)
      });

      // Wait for transaction confirmation with extended timeout
      const receipt = await this.publicClient.waitForTransactionReceipt({ 
        hash,
        timeout: 300000, // 5 minutes timeout
        confirmations: 1,
        pollingInterval: 3000 // Check every 3 seconds
      });
      
      // Find the EventCreated event to get the new event address
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

      throw new Error('Event creation transaction completed but event address not found');
    } catch (error) {
      console.error('Failed to create event:', error);
      
      // If it's a timeout error, provide more helpful information
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new Error(`Transaction submitted but timed out waiting for confirmation. Transaction hash: ${hash}. Check the transaction status on SonicScan: https://testnet.sonicscan.org/tx/${hash}`);
      }
      
      throw error;
    }
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
      value: value ? BigInt(value) : 0n
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

  // Helper function to get ticket NFT address from event
  private async getTicketNFTAddress(eventAddress: Address): Promise<Address> {
    // This would need to be implemented based on your EventImplementation contract
    // For now, we'll assume there's a public getter for the ticketNFT address
    const ticketNFTAddress = await this.publicClient.readContract({
      address: eventAddress,
      abi: [
        {
          "inputs": [],
          "name": "ticketNFT",
          "outputs": [
            { "name": "", "type": "address" }
          ],
          "stateMutability": "view",
          "type": "function"
        }
      ],
      functionName: 'ticketNFT'
    });

    return ticketNFTAddress as Address;
  }

  // Utility functions for reading contract state
  async getEventInfo(eventAddress: Address) {
    const [eventName, eventType, ticketPrice] = await Promise.all([
      this.publicClient.readContract({
        address: eventAddress,
        abi: [
          {
            "inputs": [],
            "name": "eventName",
            "outputs": [{ "name": "", "type": "string" }],
            "stateMutability": "view",
            "type": "function"
          }
        ],
        functionName: 'eventName'
      }),
      this.publicClient.readContract({
        address: eventAddress,
        abi: [
          {
            "inputs": [],
            "name": "eventType",
            "outputs": [{ "name": "", "type": "uint8" }],
            "stateMutability": "view",
            "type": "function"
          }
        ],
        functionName: 'eventType'
      }),
      this.publicClient.readContract({
        address: eventAddress,
        abi: [
          {
            "inputs": [],
            "name": "ticketPrice",
            "outputs": [{ "name": "", "type": "uint256" }],
            "stateMutability": "view",
            "type": "function"
          }
        ],
        functionName: 'ticketPrice'
      })
    ]);

    return {
      eventName,
      eventType: Number(eventType),
      ticketPrice: eventPrice.toString()
    };
  }
}

// Export singleton instance
export const web3Service = new Web3Service();

