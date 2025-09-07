# FairPass Frontend

## Wallet Integration with RainbowKit

This frontend now uses RainbowKit for seamless wallet connection and authentication.

### Environment Variables

Create a `.env.local` file in the frontend directory with the following variables:

```bash
# WalletConnect Project ID (get from https://cloud.walletconnect.com/)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Enable testnet chains
NEXT_PUBLIC_ENABLE_TESTNETS=true

# API URL
NEXT_PUBLIC_API_URL=https://fairpassbackend.vercel.app/api

```

### Getting WalletConnect Project ID

1. Go to [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. Sign up or sign in
3. Create a new project
4. Copy the Project ID
5. Paste it in your `.env.local` file

### Features

- **Wallet Connection**: Connect MetaMask, WalletConnect, and other popular wallets
- **Wallet-based Authentication**: Sign in using your connected wallet
- **Email Authentication**: Traditional email/password signin still supported
- **Multi-chain Support**: Works with Ethereum mainnet, Polygon, Base, and more
- **Responsive Design**: Works on desktop and mobile devices

### Supported Wallets

- MetaMask
- WalletConnect
- Coinbase Wallet
- Rainbow Wallet
- Trust Wallet
- And many more...

### Usage

1. **Registration**: Connect wallet and create organization account
2. **Sign In**: Use wallet or email/password
3. **Dashboard**: View connected wallet address
4. **Events**: Create and manage events with wallet authentication

### Troubleshooting

If you encounter wallet connection issues:

1. Check your `.env.local` file has the correct Project ID
2. Ensure your browser supports Web3
3. Try refreshing the page
4. Check browser console for errors
5. Verify your wallet is unlocked and on the correct network
