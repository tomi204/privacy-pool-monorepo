"use client";

import Link from "next/link";
import Image from "next/image";
import { PositionList } from "@/components/pools/PositionList";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ConnectButton } from "@/components/wallet-connect/ConnectButton";
import { useReownEthersSigner } from "@/hooks/useReownEthersSigner";
import { Lock } from "lucide-react";

export default function PositionsPage() {
  const { isConnected, chainId } = useReownEthersSigner();

  return (
    <div className="min-h-[100dvh] bg-black text-slate-100">
      <main className="mx-auto max-w-6xl space-y-14 px-4 pb-16 pt-14">
        <section className="grid gap-12 rounded-[42px] border border-slate-900/70 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.08),_transparent_55%)] p-8 lg:grid-cols-[1.1fr,0.9fr] lg:p-12">
          <div className="space-y-7">
            <span className="inline-flex items-center rounded-full border border-slate-900/70 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-400">
              Manage positions
            </span>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
                Decrypt and rebalance encrypted liquidity
              </h1>
              <p className="text-base text-slate-400 md:text-lg">
                Inspect allocations, unlock confidential amounts, and move capital
                between pools while keeping privacy guarantees intact.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {!isConnected ? (
                <ConnectButton />
              ) : (
                <Button asChild className="bg-cyan-600 text-white hover:bg-cyan-500">
                  <Link href="/pools">Browse pools</Link>
                </Button>
              )}
              <Button
                asChild
                variant="secondary"
                className="border border-slate-800 bg-transparent text-slate-200 hover:bg-slate-900"
              >
                <Link href="/">Back to overview</Link>
              </Button>
            </div>
            <Card className="border border-slate-900/70 bg-slate-950/60">
              <CardContent className="flex items-center justify-between gap-4 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-500/40 bg-cyan-500/10 text-cyan-300">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                      Current chain
                    </p>
                    <p className="font-mono text-sm text-slate-200">
                      {chainId ?? "Not connected"}
                    </p>
                  </div>
                </div>
                <Image
                  src="/usdc.png"
                  alt="USDC"
                  width={40}
                  height={40}
                  className="rounded-2xl border border-slate-800/70 bg-slate-900 p-2"
                />
              </CardContent>
            </Card>
          </div>
          <Card className="border border-slate-900/60 bg-slate-950/70">
            <CardContent className="space-y-6 p-8">
              <div className="space-y-2 text-sm text-slate-300">
                <p>
                  Position handles store encrypted liquidity. Decrypt only when you
                  are ready to review balances; everything remains hidden on-chain
                  otherwise.
                </p>
                <p>
                  Manage, withdraw, or migrate allocations confidently from this
                  dedicated workspace with consistent actions throughout the app.
                </p>
              </div>
              <Separator className="bg-slate-900" />
              <div className="space-y-2 text-xs text-slate-500">
                <p>• Trigger decryption on demand — no values leak beforehand.</p>
                <p>• Switch pools instantly with quick navigation shortcuts.</p>
                <p>• Keep track of encrypted handles right beside public data.</p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="rounded-3xl border border-slate-900/70 bg-slate-950/60 p-8">
          <PositionList />
        </section>
      </main>
    </div>
  );
}
