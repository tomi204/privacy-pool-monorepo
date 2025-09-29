"use client";

import type { ReactNode } from "react";

import { InMemoryStorageProvider } from "@/hooks/useInMemoryStorage";
import { ReownEthersSignerProvider } from "@/hooks/useReownEthersSigner";
import { AppKit } from "./Reown";

type Props = {
  children: ReactNode;
};

export function Providers({ children }: Props) {
  return (
    <AppKit>
      <ReownEthersSignerProvider
        initialMockChains={{ 31337: "http://localhost:8545" }}
      >
        <InMemoryStorageProvider>{children}</InMemoryStorageProvider>
      </ReownEthersSignerProvider>
    </AppKit>
  );
}
