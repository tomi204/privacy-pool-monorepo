"use client";
import { useReownEthersSigner } from "@/hooks/useReownEthersSigner";
import { getPoolsForChain } from "@/lib/pools";
import { PoolList } from "@/components/pools/PoolList";
import { PositionList } from "@/components/pools/PositionList";
import { ConnectButton } from "@/components/wallet-connect/ConnectButton";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import { Lock } from "lucide-react";

export default function Home() {
  const { isConnected, chainId } = useReownEthersSigner();
  const pools = getPoolsForChain(chainId);

  return (
    <div className="min-h-[100dvh] bg-black text-slate-100">
      <main className="mx-auto max-w-6xl space-y-16 px-4 pb-16 pt-14">
        <section className="grid gap-12 rounded-[42px] border border-slate-900/70 bg-[radial-gradient(circle_at_top,_rgba(6,182,212,0.08),_transparent_55%)] p-8 lg:grid-cols-[1.05fr,0.95fr] lg:p-12">
          <div className="space-y-8">
            <span className="inline-flex items-center rounded-full border border-slate-900/70 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-400">
              Lunarys Protocol
            </span>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
                Privacy-first liquidity for everyday swaps
              </h1>
              <p className="text-base text-slate-400 md:text-lg">
                Manage liquidity in fully homomorphic pools with a focused,
                minimal interface. Stay in control of encrypted balances while
                enjoying a familiar trading experience.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {isConnected ? (
                <Button
                  asChild
                  className="bg-cyan-600 text-white hover:bg-cyan-500"
                >
                  <Link href="/pools">Explore pools</Link>
                </Button>
              ) : (
                <ConnectButton />
              )}
              <Button
                asChild
                variant="secondary"
                className="border border-slate-800 bg-transparent text-slate-200 hover:bg-slate-900"
              >
                <Link href="/pool/positions">View positions</Link>
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="border-slate-900/70 bg-slate-950/60">
                <CardContent className="p-5">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Active pools
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {pools.length}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-slate-900/70 bg-slate-950/60">
                <CardContent className="p-5">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Confidential asset
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-200">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
                      <Lock className="h-4 w-4" />
                    </div>
                    ctKN (encrypted)
                  </div>
                </CardContent>
              </Card>
              <Card className="border-slate-900/70 bg-slate-950/60">
                <CardContent className="p-5">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Stable pair
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-200">
                    <div className="relative h-8 w-8 overflow-hidden rounded-xl border border-slate-800/70 bg-slate-900">
                      <Image
                        src="/usdc.png"
                        alt="USDC"
                        fill
                        sizes="32px"
                        className="object-contain p-1.5"
                      />
                    </div>
                    USDC support
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className="relative border-slate-900/60 bg-slate-950/70">
            <CardContent className="space-y-6 p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-500/40 bg-cyan-500/10 text-cyan-300">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                    Confidential vault
                  </p>
                  <p className="text-lg font-semibold text-white">Encrypted token</p>
                </div>
              </div>
              <Separator className="bg-slate-900" />
              <div className="space-y-4 text-sm text-slate-300">
                <p>
                  LUNARYS pools wrap assets into FHE-enabled tokens, letting you
                  decrypt positions only when you need to manage them. The
                  counterpart remains liquid USDC for predictable pricing.
                </p>
                <p>
                  Move seamlessly between providing liquidity, swapping, and
                  decrypting positions with a consistent UI designed for clarity.
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-sm text-cyan-200">
                <span className="font-medium">Chain</span>
                <span className="font-mono text-xs text-cyan-100">
                  {chainId ?? "Not connected"}
                </span>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Available pools</h2>
              <p className="text-sm text-slate-400">
                Choose a pool to start swapping or provide liquidity with full
                confidentiality.
              </p>
            </div>
            <Button asChild variant="secondary" className="bg-transparent text-slate-200 hover:bg-slate-900">
              <Link href="/pools">Open pool directory</Link>
            </Button>
          </div>
          <div className="rounded-3xl border border-slate-900/70 bg-slate-950/60 p-8">
            <PoolList pools={pools} />
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Your positions</h2>
              <p className="text-sm text-slate-400">
                Connect and decrypt positions to manage encrypted liquidity with
                confidence.
              </p>
            </div>
            <Button asChild size="sm" className="bg-cyan-600 text-white hover:bg-cyan-500">
              <Link href="/pool/positions">Manage positions</Link>
            </Button>
          </div>
          <div className="rounded-3xl border border-slate-900/70 bg-slate-950/60 p-8">
            <PositionList />
          </div>
        </section>
      </main>
    </div>
  );
}
