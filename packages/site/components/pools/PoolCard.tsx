"use client";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

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
    <Link href={`/pool/${address}`} className="block">
      <Card className="border-slate-800 bg-slate-900/60 hover:bg-slate-900 transition">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-cyan-300/15 border border-cyan-300/30 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-cyan-300" />
            </div>
            <div>
              <div className="font-semibold text-slate-100">USDC X CTKN</div>
              <div className="text-xs text-slate-400">
                {chainName} • {chainId}
              </div>
              <div className="text-[10px] text-slate-500">{address}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
