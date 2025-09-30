"use client";
import { useMemo, useState } from "react";
import { ethers } from "ethers";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Info, Loader2 } from "lucide-react";
import { fmt } from "@/lib/fmt";
import { useSwap0to1 } from "@/hooks/useSwap0to1";
import { PrivacyPoolV2ABI } from "@/abi/PrivacyPoolV2ABI";

export function SwapPanel(props: {
  poolAddress: `0x${string}`;
  signer: ethers.Signer | null | undefined;
  sym0: string;
  sym1: string;
  dec0: number;
  dec1: number;
  r0: bigint;
  r1v: bigint;
  bal0: bigint;
  bal1: bigint;
  allow0: bigint;
}) {
  const {
    poolAddress,
    signer,
    sym0,
    sym1,
    dec0,
    dec1,
    r0,
    r1v,
    bal0,
    bal1,
    allow0,
  } = props;
  const [busy, setBusy] = useState(false);
  const [dir0to1, setDir] = useState(true);
  const [slippageBps, setSlippageBps] = useState(50);
  const [inStr, setInStr] = useState("");
  const [outStr, setOutStr] = useState("");

  const { swap0to1 } = useSwap0to1(
    poolAddress,
    PrivacyPoolV2ABI.abi,
    signer || null
  );

  const amountIn = useMemo(() => {
    try {
      return ethers.parseUnits(inStr || "0", dir0to1 ? dec0 : dec1);
    } catch {
      return BigInt(0);
    }
  }, [inStr, dir0to1, dec0, dec1]);

  // quote
  const FEE_DEN = BigInt(1_000_000);
  const fee = BigInt(3000); // opcionalmente pásalo por props si quieres exacto
  const feeFactor = FEE_DEN - fee;

  useMemo(() => {
    if (!inStr || !r0 || !r1v) {
      setOutStr("");
      return;
    }
    try {
      if (dir0to1) {
        const ain = ethers.parseUnits(inStr, dec0);
        const inAfter = (ain * feeFactor) / FEE_DEN;
        if (inAfter <= BigInt(0) || r0 === BigInt(0) || r1v === BigInt(0)) {
          setOutStr("");
          return;
        }
        const k = r0 * r1v;
        const r0a = r0 + inAfter;
        const r1a = k / r0a;
        const out = r1v - r1a;
        setOutStr(ethers.formatUnits(out, dec1));
      } else {
        // exact-out UX: usuario escribe out en token0 en el input "From"
        const out0 = ethers.parseUnits(inStr, dec0);
        if (out0 <= BigInt(0) || out0 >= r0) {
          setOutStr("");
          return;
        }
        const k = r0 * r1v;
        const r0a = r0 - out0;
        const r1a = k / r0a;
        const inAfter = r1a - r1v;
        const needIn = (inAfter * FEE_DEN + (FEE_DEN - feeFactor)) / feeFactor;
        setOutStr(ethers.formatUnits(needIn, dec1));
      }
    } catch {
      setOutStr("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inStr, dir0to1, r0, r1v, dec0, dec1]);

  const needApprove = dir0to1 && allow0 < amountIn && amountIn > BigInt(0);

  const onSwap = async () => {
    try {
      setBusy(true);
      if (dir0to1) {
        const out = outStr ? ethers.parseUnits(outStr, dec1) : BigInt(0);
        if (out <= BigInt(0)) throw new Error("Quote vacío");
        const minOut = (out * BigInt(10_000 - slippageBps)) / BigInt(10_000);
        const rc = await swap0to1(
          amountIn,
          minOut,
          await signer!.getAddress(),
          600
        );
        if (rc?.status !== 1) throw new Error("tx revertida");
      } else {
        // TODO: FHE path (1→0 exact-out) — integra tu createEncryptedInput aquí
        throw new Error("Swap 1→0: integra FHE (pending)");
      }
      setInStr("");
      setOutStr("");
    } catch (e: any) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-slate-800 bg-slate-900/60">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between text-sm text-slate-400">
          <div>
            Balance:{" "}
            <span className="font-mono">
              {dir0to1 ? fmt(bal0, dec0) : fmt(bal1, dec1)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span>Slippage</span>
            <Input
              className="h-8 w-16"
              type="number"
              min={0}
              max={5000}
              value={slippageBps}
              onChange={(e) => setSlippageBps(Number(e.target.value || 0))}
            />
            <span className="text-slate-500">
              {(slippageBps / 100).toFixed(2)}%
            </span>
          </div>
        </div>

        {/* FROM */}
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
          <div className="text-xs text-slate-500 mb-1">From</div>
          <div className="flex items-center gap-2">
            <Input
              value={inStr}
              onChange={(e) => setInStr(e.target.value)}
              placeholder="0.0"
              inputMode="decimal"
              className="text-xl"
            />
            <div className="text-sm text-slate-300">
              {dir0to1 ? sym0 : sym1}
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            className="h-9 w-9 rounded-full border border-slate-800 bg-slate-900 hover:bg-slate-800"
            onClick={() => {
              setDir(!dir0to1);
              setInStr("");
              setOutStr("");
            }}
            aria-label="switch"
          >
            {/* <SwapHorizontal className="h-5 w-5 m-auto text-cyan-300" /> */}
          </button>
        </div>

        {/* TO */}
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
          <div className="text-xs text-slate-500 mb-1">To</div>
          <div className="flex items-center gap-2">
            <Input
              value={outStr}
              onChange={(e) => setOutStr(e.target.value)}
              disabled={dir0to1}
              placeholder="0.0"
              className="text-xl"
            />
            <div className="text-sm text-slate-300">
              {dir0to1 ? sym1 : sym0}
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <Info className="h-3.5 w-3.5" />
            {dir0to1
              ? "Quote estimado (aplica slippage)."
              : "Exact Out: ingresa salida arriba; calculamos input requerido."}
          </div>
        </div>

        <Separator className="bg-slate-800" />

        <Button
          onClick={onSwap}
          disabled={busy || !signer || (dir0to1 && needApprove)}
          className="w-full h-11 bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500"
        >
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          {dir0to1 ? `Swap ${sym0} → ${sym1}` : `Swap ${sym1} → ${sym0}`}
        </Button>

        {dir0to1 && needApprove && (
          <div className="text-xs text-amber-300">
            Necesitás aprobar {sym0} antes de swapear.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
