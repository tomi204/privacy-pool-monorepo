"use client";

import { createAppKit } from "@reown/appkit/react";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { sepolia, mainnet, localhost } from "@reown/appkit/networks";

// Get project ID from environment variable, fallback to demo value
const projectId =
  process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ||
  "c54d67b8d6e2adca8b76b5e4db3a7b8a";

// 2. Create a metadata object
const metadata = {
  name: "FHEVM React Template",
  description: "A React template for building FHEVM applications",
  url:
    typeof window !== "undefined"
      ? window.location.origin
      : "https://localhost:3000",
  icons: ["https://avatars.githubusercontent.com/u/37784886"],
};

// 3. Create the AppKit instance
// Custom localhost network for development
const localhostNetwork = {
  ...localhost,
  id: 31337,
  name: "Localhost",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    public: { http: ["http://127.0.0.1:8545"] },
    default: { http: ["http://127.0.0.1:8545"] },
  },
};

createAppKit({
  adapters: [new EthersAdapter()],
  metadata,
  networks: [sepolia, localhostNetwork, mainnet],
  projectId,
  defaultNetwork: sepolia,
  features: {
    analytics: false,
    email: false,
    socials: false,
  },
});

export function AppKit({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
