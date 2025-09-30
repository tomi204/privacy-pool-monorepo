"use client";

import { createAppKit } from "@reown/appkit/react";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { sepolia, localhost } from "@reown/appkit/networks";

const projectId =
  process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ||
  "c54d67b8d6e2adca8b76b5e4db3a7b8a";

const metadata = {
  name: "FHEVM React Template",
  description: "A React template for building FHEVM applications",
  url:
    typeof window !== "undefined"
      ? window.location.origin
      : "https://localhost:3000",
  icons: ["https://avatars.githubusercontent.com/u/37784886"],
};

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
  networks: [sepolia, localhostNetwork],
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
