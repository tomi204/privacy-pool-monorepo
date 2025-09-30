"use client";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, ArrowUpRight } from "lucide-react";

export function PoolCard({
  address,
  chainId,
  chainName,
}: {
  address: `0x${string}`;
  chainId: number;
  chainName: string;
}) {
  return (
    <Link href={`/pool/${address}`} className="group block">
      <Card className="relative overflow-hidden border-slate-900/80 bg-slate-950/70 transition duration-200 group-hover:border-cyan-500/60 group-hover:shadow-[0_0_28px_rgba(6,182,212,0.25)]">
        <CardContent className="space-y-6 p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex -space-x-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/40 bg-cyan-500/10 text-cyan-300">
                  <Lock className="h-5 w-5" />
                </div>
                <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900">
                  <Image
                    src="/usdc.png"
                    alt="USDC"
                    fill
                    sizes="48px"
                    className="object-contain p-2"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Encrypted pool
                </p>
                <h3 className="text-lg font-semibold text-white">ctKN / USDC</h3>
              </div>
            </div>
            <ArrowUpRight className="h-5 w-5 flex-shrink-0 text-slate-500 transition group-hover:text-cyan-300" />
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm text-slate-300">
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                Network
              </p>
              <p className="font-medium text-white">{chainName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                Chain ID
              </p>
              <p className="font-mono text-xs text-slate-200">{chainId}</p>
            </div>
            <div className="col-span-2 space-y-1">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                Pool address
              </p>
              <p className="truncate font-mono text-xs text-slate-400">
                {address}
              </p>
            </div>
          </div>
        </CardContent>
        <div className="absolute inset-x-10 -bottom-10 h-20 rounded-full bg-cyan-500/10 blur-2xl transition-opacity duration-200 group-hover:opacity-80" />
      </Card>
    </Link>
  );
}
