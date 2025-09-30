"use client";

import { ConnectButton } from "@/components/wallet-connect/ConnectButton";
import { PoolList } from "@/components/pools/PoolList";
import { useReownEthersSigner } from "@/hooks/useReownEthersSigner";
import { getPoolsForChain } from "@/lib/pools";

const highlights = [
  {
    title: "Encrypted liquidity",
    description:
      "Confidential pools keep sensitive balances protected while you trade.",
  },
  {
    title: "Native USDC support",
    description: "Swap against stable liquidity secured by Circle-managed rails.",
  },
  {
    title: "Permissionless access",
    description: "Provide or manage liquidity directly from your connected wallet.",
  },
];

export default function PoolsPage() {
  const { chainId, isConnected } = useReownEthersSigner();
  const pools = getPoolsForChain(chainId);

  return (
    <div className="min-h-[100dvh] bg-black text-slate-100">
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_55%)]" />
        <div className="mx-auto max-w-6xl px-4 py-16 lg:py-20 space-y-12">
          <header className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center rounded-full border border-slate-800/80 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-400">
                Pool Directory
              </div>
              <div className="space-y-4">
                <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
                  Discover privacy-preserving liquidity on LUNARYS
                </h1>
                <p className="text-slate-400 text-base md:text-lg">
                  Explore encrypted pools that balance transparent UX with full
                  confidentiality. Connect your wallet to supply liquidity or
                  start swapping instantly.
                </p>
              </div>
              {!isConnected && (
                <div>
                  <ConnectButton />
                </div>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              {highlights.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-800/90 bg-slate-900/60 p-5 shadow-[0_0_25px_rgba(12,74,110,0.25)]"
                >
                  <div className="text-sm font-medium text-cyan-300">
                    {item.title}
                  </div>
                  <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </header>

          <section className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Available pools</h2>
                <p className="text-sm text-slate-400">
                  Minimal cards keep asset pairs and network context front-and-center.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-slate-800/80 bg-slate-900/70 px-3 py-2 text-xs text-slate-400">
                <span className="font-mono text-slate-300">{chainId ?? "—"}</span>
                <span className="text-slate-600">•</span>
                <span>{pools.length ? `${pools.length} pool${pools.length > 1 ? "s" : ""}` : "No pools"}</span>
              </div>
            </div>
            <PoolList pools={pools} />
          </section>
        </div>
      </div>
    </div>
  );
}
