import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  sonic,
  sepolia
} from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'FairPass',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [
    sonic,
    sepolia,
    ...(process.env.NEXT_PUBLIC_ENABLE_TESTNETS === 'true' ? [sepolia] : []),
  ],
  ssr: true,
});