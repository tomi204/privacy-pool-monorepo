"use client";
import { PoolMeta } from "@/lib/pools";
import { PoolCard } from "./PoolCard";

export function PoolList({ pools }: { pools: PoolMeta[] }) {
  if (!pools.length)
    return (
      <div className="rounded-2xl border border-dashed border-slate-800/80 bg-slate-950/40 p-8 text-center text-sm text-slate-500">
        No pools are available on this network yet.
      </div>
    );
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {pools.map((p) => (
        <PoolCard key={p.address} {...p} />
      ))}
    </div>
  );
}
