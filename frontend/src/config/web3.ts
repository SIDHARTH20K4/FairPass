// Web3 Configuration
export const WEB3_CONFIG = {
  // Sonic Network Configuration
  CHAIN_ID: 146,
  CHAIN_NAME: 'Sonic',
  RPC_URL: process.env.NEXT_PUBLIC_SONIC_RPC_URL || 'https://rpc.soniclabs.com',
  BLOCK_EXPLORER_URL: 'https://explorer.soniclabs.com',
  
  // Contract Addresses
  EVENT_FACTORY_ADDRESS: process.env.NEXT_PUBLIC_EVENT_FACTORY_ADDRESS as `0x${string}`,
  PLATFORM_OWNER_ADDRESS: process.env.NEXT_PUBLIC_PLATFORM_OWNER_ADDRESS as `0x${string}`,
  
  // Gas Configuration
  GAS_LIMIT: {
    CREATE_EVENT: BigInt(2000000),
    BUY_TICKET: BigInt(500000),
    LIST_FOR_RESALE: BigInt(300000),
    BUY_RESALE: BigInt(400000),
    CHECK_IN: BigInt(200000)
  },
  
  // Default Gas Price (in wei)
  DEFAULT_GAS_PRICE: BigInt(1000000000), // 1 gwei
  
  // Transaction Timeout (in milliseconds)
  TRANSACTION_TIMEOUT: 300000, // 5 minutes
  
  // Retry Configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000, // 2 seconds
} as const;

// Validation
if (!WEB3_CONFIG.EVENT_FACTORY_ADDRESS) {
  console.warn('EVENT_FACTORY_ADDRESS not set in environment variables');
}

if (!WEB3_CONFIG.PLATFORM_OWNER_ADDRESS) {
  console.warn('PLATFORM_OWNER_ADDRESS not set in environment variables');
}
