"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Info, Loader2, ArrowDownUp } from "lucide-react";
import { fmt } from "@/lib/fmt";
import { PrivacyPoolV2ABI } from "@/abi/PrivacyPoolV2ABI";
import { CERC20ABI } from "@/abi/CERC20ABI";
import { useLunarys } from "@/context/Lunarys";
import { toast } from "sonner";

const ERC20_ABI = [
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
] as const;

const UINT64_MAX = (BigInt(1) << BigInt(64)) - BigInt(1);

type SwapPanelProps = {
  poolAddress: `0x${string}`;
  signer: ethers.Signer | null | undefined;
  userAddress?: string;
  sym0: string;
  sym1: string;
  dec0: number;
  dec1: number;
  fee: number;
  r0: bigint;
  r1v: bigint;
  bal0: bigint;
  bal1: bigint;
  allow0: bigint;
  token0Address?: `0x${string}`;
  token1Address?: `0x${string}`;
};

export function SwapPanel({
  poolAddress,
  signer,
  userAddress,
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
  token0Address,
  token1Address,
}: SwapPanelProps) {
  const { fhevm, setOperatorCERC20 } = useLunarys();

  const [busy, setBusy] = useState(false);
  const [dir0to1, setDir] = useState(true);
  const [slippageBps, setSlippageBps] = useState(50);
  const [inStr, setInStr] = useState("");
  const [status, setStatus] = useState("");
  const [allowanceState, setAllowanceState] = useState<bigint>(allow0);
  const [operatorReady, setOperatorReady] = useState(false);

  useEffect(() => {
    setAllowanceState(allow0);
  }, [allow0]);

  const refreshAllowance = useCallback(async () => {
    try {
      if (!signer || !token0Address || !userAddress) return allow0;
      const erc = new ethers.Contract(token0Address, ERC20_ABI, signer);
      const current: bigint = await erc.allowance(userAddress, poolAddress);
      setAllowanceState(current);
      return current;
    } catch {
      return allow0;
    }
  }, [allow0, poolAddress, signer, token0Address, userAddress]);

  const refreshOperator = useCallback(async () => {
    if (!signer || !token1Address || !userAddress) {
      setOperatorReady(false);
      return false;
    }
    try {
      const token1 = new ethers.Contract(token1Address, CERC20ABI.abi, signer);
      const fn = token1.getFunction("isOperator");
      const isOp: boolean = await fn(userAddress, poolAddress);
      setOperatorReady(isOp);
      return isOp;
    } catch {
      setOperatorReady(false);
      return false;
    }
  }, [poolAddress, signer, token1Address, userAddress]);

  useEffect(() => {
    if (signer && token0Address && userAddress) {
      refreshAllowance();
    }
  }, [signer, token0Address, userAddress, refreshAllowance]);

  useEffect(() => {
    if (!dir0to1) refreshOperator();
  }, [dir0to1, refreshOperator]);

  const feeDen = BigInt(1_000_000);
  const feeBn = BigInt(fee ?? 0);
  const feeFactor = feeDen - feeBn;

  const quote = useMemo(() => {
    const empty = {
      outAmount: 0n,
      outFormatted: "",
      desiredOutAmount: 0n,
      requiredInAmount: 0n,
      requiredInFormatted: "",
    };
    if (!inStr.trim()) return empty;
    try {
      if (dir0to1) {
        const parsed = ethers.parseUnits(inStr, dec0);
        if (parsed <= 0n || r0 <= 0n || r1v <= 0n || feeFactor <= 0n)
          return empty;
        const inAfterFee = (parsed * feeFactor) / feeDen;
        if (inAfterFee <= 0n) return empty;
        const k = r0 * r1v;
        const r0After = r0 + inAfterFee;
        if (r0After === 0n) return empty;
        const r1After = k / r0After;
        const out = r1v - r1After;
        if (out <= 0n) return empty;
        return {
          outAmount: out,
          outFormatted: ethers.formatUnits(out, dec1),
          desiredOutAmount: 0n,
          requiredInAmount: 0n,
          requiredInFormatted: "",
        };
      }
      const desiredOut = ethers.parseUnits(inStr, dec0);
      if (
        desiredOut <= 0n ||
        desiredOut >= r0 ||
        r0 <= 0n ||
        r1v <= 0n ||
        feeFactor <= 0n
      )
        return empty;
      const k = r0 * r1v;
      const r0After = r0 - desiredOut;
      if (r0After <= 0n) return empty;
      const r1After = k / r0After;
      const inAfterFee = r1After - r1v;
      if (inAfterFee <= 0n) return empty;
      const numerator = inAfterFee * feeDen;
      const needIn = (numerator + (feeFactor - 1n)) / feeFactor;
      if (needIn <= 0n) return empty;
      return {
        outAmount: 0n,
        outFormatted: ethers.formatUnits(needIn, dec1),
        desiredOutAmount: desiredOut,
        requiredInAmount: needIn,
        requiredInFormatted: ethers.formatUnits(needIn, dec1),
      };
    } catch {
      return empty;
    }
  }, [inStr, dir0to1, dec0, dec1, r0, r1v, feeDen, feeFactor]);

  const amountIn = useMemo(() => {
    if (!dir0to1) return quote.requiredInAmount;
    try {
      return ethers.parseUnits(inStr || "0", dec0);
    } catch {
      return 0n;
    }
  }, [inStr, dir0to1, dec0, quote.requiredInAmount]);

  const desiredOutAmount = dir0to1 ? 0n : quote.desiredOutAmount;
  const needApprove = dir0to1 && amountIn > 0n && allowanceState < amountIn;
  const slippageFactor = BigInt(10_000 - slippageBps);
  const applySlippage = useCallback(
    (value: bigint) => (value * slippageFactor) / 10_000n,
    [slippageFactor]
  );

  const ensureAllowance = useCallback(
    async (required: bigint) => {
      if (!signer) throw new Error("Conectá tu wallet");
      if (!token0Address) throw new Error("Token público no resuelto");
      if (!userAddress) throw new Error("Cuenta no detectada");
      const erc = new ethers.Contract(token0Address, ERC20_ABI, signer);
      const current: bigint = await erc.allowance(userAddress, poolAddress);
      if (current >= required) {
        setAllowanceState(current);
        return current;
      }
      setStatus(`Aprobando ${sym0}…`);
      const tx = await erc.approve(poolAddress, ethers.MaxUint256);
      const receipt = await tx.wait();
      toast.success(`${sym0} aprobado`);
      await refreshAllowance();
      return receipt;
    },
    [signer, token0Address, userAddress, poolAddress, sym0, refreshAllowance]
  );

  const ensureOperator = useCallback(async () => {
    if (!signer) throw new Error("Conectá tu wallet");
    if (!token1Address) throw new Error("Token confidencial no resuelto");
    if (!userAddress) throw new Error("Cuenta no detectada");
    const already = await refreshOperator();
    if (already) return true;
    setStatus(`Habilitando operador para ${sym1}…`);
    const receipt = await setOperatorCERC20(token1Address, poolAddress, 3600);
    if (!receipt) throw new Error("No se pudo establecer el operador");
    toast.success(`Operador autorizado para ${sym1}`);
    await refreshOperator();
    return true;
  }, [
    signer,
    token1Address,
    userAddress,
    refreshOperator,
    setOperatorCERC20,
    sym1,
    poolAddress,
  ]);

  const onSwap = useCallback(async () => {
    if (!signer) {
      toast.error("Conectá tu wallet");
      return;
    }

    setBusy(true);
    setStatus("");

    try {
      const account = userAddress ?? (await signer.getAddress());
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
      const pool = new ethers.Contract(
        poolAddress,
        PrivacyPoolV2ABI.abi,
        signer
      );

      if (dir0to1) {
        if (amountIn <= 0n) throw new Error("Ingresa un monto válido");
        if (quote.outAmount <= 0n)
          throw new Error("No se pudo calcular la salida");

        await ensureAllowance(amountIn);

        const minOut = applySlippage(quote.outAmount);
        const fn = pool.getFunction("swapToken0ForToken1");

        setStatus("Simulando swap 0→1…");
        await fn.staticCall(amountIn, minOut, account, deadline);

        setStatus("Enviando swap 0→1…");
        const tx = await fn(amountIn, minOut, account, deadline);
        const rc = await tx.wait();
        toast.success(
          `Swap confirmado (${rc?.gasUsed?.toString() ?? "?"} gas)`
        );
        setStatus("✅ Swap confirmado");
        setInStr("");
      } else {
        if (!fhevm) throw new Error("FHEVM no inicializado aún");
        if (!token1Address) throw new Error("Token confidencial no resuelto");
        if (desiredOutAmount <= 0n)
          throw new Error("Ingresa la salida deseada en token público");
        if (quote.requiredInAmount <= 0n)
          throw new Error("No se pudo calcular la entrada confidencial");
        if (quote.requiredInAmount > UINT64_MAX)
          throw new Error("Monto supera el límite soportado (uint64)");

        await ensureOperator();

        const minOut = applySlippage(desiredOutAmount);
        const input = fhevm.createEncryptedInput(poolAddress, account);
        input.add64(Number(quote.requiredInAmount));

        setStatus("Cifrando cantidad…");
        const enc = await input.encrypt();

        const fn = pool.getFunction("swapToken1ForToken0ExactOut");

        setStatus("Simulando swap 1→0…");
        const preview: bigint = await fn.staticCall(
          enc.handles[0],
          minOut,
          account,
          enc.inputProof,
          deadline
        );

        setStatus(`Enviando swap 1→0 (request ${preview})…`);
        const tx = await fn(
          enc.handles[0],
          minOut,
          account,
          enc.inputProof,
          deadline,
          { gasLimit: BigInt(1_000_000) }
        );
        await tx.wait();
        toast.success(
          `Swap confidencial enviado. Request #${preview.toString()}`
        );
        setStatus(
          `⏳ Esperando desencriptado externo (request #${preview.toString()})`
        );
        setInStr("");
      }

      await refreshAllowance();
    } catch (err: any) {
      const message = err?.reason ?? err?.message ?? String(err);
      setStatus(`❌ ${message}`);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }, [
    signer,
    userAddress,
    poolAddress,
    dir0to1,
    amountIn,
    quote.outAmount,
    quote.requiredInAmount,
    desiredOutAmount,
    fhevm,
    token1Address,
    ensureAllowance,
    ensureOperator,
    applySlippage,
    refreshAllowance,
  ]);

  const toValue = dir0to1 ? quote.outFormatted : quote.requiredInFormatted;

  const canSwap = dir0to1
    ? amountIn > 0n && quote.outAmount > 0n
    : desiredOutAmount > 0n && quote.requiredInAmount > 0n;

  return (
    <Card className="border border-slate-900/70 bg-slate-950/60">
      <CardContent className="space-y-4 p-4">
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

        <div className="rounded-2xl border border-slate-900 bg-slate-950 p-3">
          <div className="mb-1 text-xs uppercase tracking-[0.2em] text-slate-500">
            {dir0to1 ? "From" : "Objetivo público"}
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={inStr}
              onChange={(e) => setInStr(e.target.value)}
              placeholder="0.0"
              inputMode="decimal"
              className="text-xl"
            />
            <div className="text-sm text-slate-200">{sym0}</div>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-cyan-300 transition hover:bg-slate-800"
            onClick={() => {
              setDir((prev) => !prev);
              setInStr("");
              setStatus("");
            }}
            aria-label="Cambiar dirección"
          >
            <ArrowDownUp className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-2xl border border-slate-900 bg-slate-950 p-3">
          <div className="mb-1 text-xs uppercase tracking-[0.2em] text-slate-500">
            {dir0to1 ? "To" : "Entrada confidencial"}
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={toValue}
              readOnly
              placeholder="0.0"
              className="text-xl"
            />
            <div className="text-sm text-slate-200">{sym1}</div>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <Info className="h-3.5 w-3.5" />
            {dir0to1
              ? "Cantidad estimada; se aplica slippage al confirmar."
              : "La entrada confidencial se cifra y transfiere automáticamente."}
          </div>
        </div>

        <Separator className="bg-slate-800" />

        <Button
          onClick={onSwap}
          disabled={busy || !signer || !canSwap}
          className="flex h-11 w-full items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-sky-600 text-white transition hover:from-cyan-500 hover:to-sky-500 disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {dir0to1 ? `Swap ${sym0} → ${sym1}` : `Swap ${sym1} → ${sym0}`}
        </Button>

        {dir0to1 && needApprove && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            Se solicitará aprobación de {sym0} antes de swapear.
          </div>
        )}

        {!dir0to1 && !operatorReady && (
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
            Se asignará al pool como operador temporal de {sym1} durante el
            swap.
          </div>
        )}

        {status && (
          <div className="rounded-xl border border-slate-900/70 bg-slate-950/60 px-3 py-2 text-xs text-slate-200">
            {status}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
