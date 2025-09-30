"use client";
import { useReownEthersSigner } from "@/hooks/useReownEthersSigner";
import { getPoolsForChain } from "@/lib/pools";
import { PoolList } from "@/components/pools/PoolList";
import { PositionList } from "@/components/pools/PositionList";
import { ConnectButton } from "@/components/wallet-connect/ConnectButton";

export default function Home() {
  const { isConnected, chainId } = useReownEthersSigner();
  const pools = getPoolsForChain(chainId);

  return (
    <div className="min-h-[100dvh] bg-black text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold bg-gradient-to-r from-cyan-300 to-sky-300 bg-clip-text text-transparent">
            LUNARYS — Pools
          </h1>
          {!isConnected && <ConnectButton />}
        </div>

        <section className="space-y-3">
          <h2 className="text-slate-300 font-semibold">Available Pools</h2>
          <PoolList pools={pools} />
        </section>

        <section className="space-y-3">
          <h2 className="text-slate-300 font-semibold">Your Positions</h2>
          <PositionList />
        </section>
      </div>
    </div>
  );
}
