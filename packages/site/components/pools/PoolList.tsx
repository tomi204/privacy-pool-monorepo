"use client";
import { PoolMeta } from "@/lib/pools";
import { PoolCard } from "./PoolCard";

export function PoolList({ pools }: { pools: PoolMeta[] }) {
  if (!pools.length)
    return <div className="text-slate-400">No hay pools para esta red.</div>;
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {pools.map((p) => (
        <PoolCard key={p.address} {...p} />
      ))}
    </div>
  );
}
