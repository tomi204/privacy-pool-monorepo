"use client";
import { useParams } from "next/navigation";
import { useReownEthersSigner } from "@/hooks/useReownEthersSigner";
import { usePoolBasics } from "@/hooks/usePoolBasics";
import { PoolShell } from "@/components/pool/PoolShell";
import { SwapPanel } from "@/components/pool/SwapPanel";
import { ProvidePanel } from "@/components/pool/ProvidePanel";
import { ProvideConfidentialPanel } from "@/components/pool/ProvideConfidentialPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function PoolPage() {
  const params = useParams<{ address: `0x${string}` }>();
  const poolAddress = params.address;

  const {
    ethersSigner,
    ethersReadonlyProvider,
    isConnected,
    chainId,
    accounts,
  } = useReownEthersSigner();
  const user = accounts?.[0];

  const {
    token0Ref,
    token1Ref,
    token0Addr,
    token1Addr,
    sym0,
    sym1,
    dec0,
    dec1,
    fee,
    r0,
    r1v,
    bal0,
    bal1,
    allow0,
  } = usePoolBasics(poolAddress, ethersReadonlyProvider, user);

  const fallbackToken0 = (token0Ref.current?.target ?? undefined) as
    | `0x${string}`
    | undefined;
  const fallbackToken1 = (token1Ref.current?.target ?? undefined) as
    | `0x${string}`
    | undefined;

  const token0Address = token0Addr ?? fallbackToken0;
  const token1Address = token1Addr ?? fallbackToken1;

  return (
    <div className="min-h-[100dvh] bg-black text-slate-100">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <PoolShell
          address={poolAddress}
          headerRight={
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className="border-cyan-400/50 text-cyan-300 font-mono"
              >
                {chainId ?? "—"}
              </Badge>
              {!isConnected && (
                <Button size="sm" className="bg-cyan-600 hover:bg-cyan-500">
                  Conectar
                </Button>
              )}
            </div>
          }
          swap={
            <SwapPanel
              poolAddress={poolAddress}
              signer={ethersSigner}
              userAddress={user}
              chainId={chainId}
              sym0={sym0}
              sym1={sym1}
              dec0={dec0}
              dec1={dec1}
              fee={fee}
              r0={r0}
              r1v={r1v}
              bal0={bal0}
              bal1={bal1}
              allow0={allow0}
              token0Address={token0Address}
              token1Address={token1Address}
            />
          }
          provide={
            <div className="grid lg:grid-cols-2 gap-6">
              <ProvidePanel
                poolAddress={poolAddress}
                signer={ethersSigner}
                token0Address={token0Address}
                dec0={dec0}
                sym0={sym0}
                bal0={bal0}
              />
              <ProvideConfidentialPanel poolAddress={poolAddress} />
            </div>
          }
        />
      </div>
    </div>
  );
}
