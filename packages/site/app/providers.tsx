"use client";

import type { ReactNode } from "react";

import { InMemoryStorageProvider } from "@/hooks/useInMemoryStorage";
import { ReownEthersSignerProvider } from "@/hooks/useReownEthersSigner";
import { AppKit } from "./Reown";
import { LunarysProvider } from "@/context/Lunarys";

type Props = {
  children: ReactNode;
};

export function Providers({ children }: Props) {
  return (
    <AppKit>
      <ReownEthersSignerProvider
        initialMockChains={{ 31337: "http://localhost:8545" }}
      >
        <InMemoryStorageProvider>
          <LunarysProvider>{children}</LunarysProvider>
        </InMemoryStorageProvider>
      </ReownEthersSignerProvider>
    </AppKit>
  );
}
