"use client";
import { useMemo, useState } from "react";
import { ethers } from "ethers";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { fmt } from "@/lib/fmt";
import { useProvide0 } from "@/hooks/useProvide0";
import { PrivacyPoolV2ABI } from "@/abi/PrivacyPoolV2ABI";
import { toast } from "sonner";

export function ProvidePanel(props: {
  poolAddress: `0x${string}`;
  signer: ethers.Signer | null | undefined;
  token0Address: `0x${string}` | undefined;
  dec0: number;
  sym0: string;
  bal0: bigint;
}) {
  const { poolAddress, signer, token0Address, dec0, sym0, bal0 } = props;
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState("");
  const [minTick, setMinTick] = useState("-120");
  const [maxTick, setMaxTick] = useState("120");
  const [deadlineSec, setDeadlineSec] = useState(600);

  const { ensureApprove, provide0 } = useProvide0(
    poolAddress,
    token0Address,
    PrivacyPoolV2ABI.abi,
    signer || null
  );

  const amountWei = useMemo(() => {
    try {
      return ethers.parseUnits(amount || "0", dec0);
    } catch {
      return BigInt(0);
    }
  }, [amount, dec0]);

  const onProvide0 = async () => {
    try {
      setBusy(true);
      await ensureApprove(amountWei);
      const owner = await signer!.getAddress();
      const receipt = await provide0(
        { min: Number(minTick), max: Number(maxTick) },
        amountWei,
        owner,
        deadlineSec
      );
      toast.success(
        `Liquidity provided successfully (${receipt?.gasUsed?.toString() ?? "?"} gas)`
      );
      setAmount("");
    } catch (error: any) {
      toast.error(`Failed to provide liquidity: ${error?.message ?? error}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-slate-800 bg-slate-900/60">
      <CardContent className="p-4 space-y-4">
        <div className="text-sm text-slate-400">
          Balance {sym0}: <span className="font-mono">{fmt(bal0, dec0)}</span>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <div className="text-xs text-slate-500 mb-1">Amount ({sym0})</div>
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              inputMode="decimal"
            />
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">minTick</div>
            <Input
              value={minTick}
              onChange={(e) => setMinTick(e.target.value)}
              inputMode="numeric"
            />
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">maxTick</div>
            <Input
              value={maxTick}
              onChange={(e) => setMaxTick(e.target.value)}
              inputMode="numeric"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-slate-500 mb-1">Deadline (s)</div>
            <Input
              type="number"
              min={30}
              value={deadlineSec}
              onChange={(e) => setDeadlineSec(Number(e.target.value || 600))}
            />
          </div>
        </div>

        <Separator className="bg-slate-800" />

        <Button
          disabled={busy || !signer || amountWei <= BigInt(0)}
          onClick={onProvide0}
          className="w-full h-11 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500"
        >
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Provide {sym0}
        </Button>
      </CardContent>
    </Card>
  );
}
