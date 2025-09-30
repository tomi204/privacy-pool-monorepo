import { useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, Shield, Eye } from "lucide-react";
import { useLunarys } from "@/context/Lunarys";
import { toast } from "sonner";

export function ProvideConfidentialPanel({
  poolAddress,
}: {
  poolAddress: `0x${string}`;
}) {
  const {
    signer,
    fhevm,
    account,
    getPoolContract,
    getERC20,
    setOperatorCERC20,
    decryptHandles,
  } = useLunarys();

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [minTick, setMinTick] = useState("-90");
  const [maxTick, setMaxTick] = useState("90");
  const [amount1ClearStr, setAmount1ClearStr] = useState("");
  const [deadlineSec, setDeadlineSec] = useState(3600);

  const [token1, setToken1] = useState<`0x${string}` | undefined>();
  const [encBalanceHandle, setEncBalanceHandle] = useState<
    string | undefined
  >();
  const [decBalance, setDecBalance] = useState<string | bigint | undefined>();
  const [decBusy, setDecBusy] = useState(false);

  const poolRef = useRef<ethers.Contract | null>(null);
  const token1Ref = useRef<ethers.Contract | null>(null);

  // init
  useEffect(() => {
    (async () => {
      try {
        if (!poolAddress || !signer) return;
        const pool = getPoolContract(poolAddress, signer);
        poolRef.current = pool;
        const t1: `0x${string}` = await pool.getFunction("token1")();
        setToken1(t1);
        token1Ref.current = getERC20(t1, signer);
      } catch (e: any) {
        setStatus(`Init error: ${e?.message ?? e}`);
      }
    })();
  }, [poolAddress, signer, getPoolContract, getERC20]);

  // encrypted balance handle
  useEffect(() => {
    (async () => {
      try {
        if (!account || !token1Ref.current) {
          setEncBalanceHandle(undefined);
          setDecBalance(undefined);
          return;
        }
        const fn = token1Ref.current.getFunction("confidentialBalanceOf");
        const handle: string = await fn(account);
        setEncBalanceHandle(handle);
      } catch {
        setEncBalanceHandle(undefined);
      }
    })();
  }, [account, token1Ref.current]);

  const amount1Clear = useMemo(() => {
    if (!amount1ClearStr) return BigInt(0);
    if (!/^\d+$/.test(amount1ClearStr.trim())) return BigInt(0);
    try {
      return BigInt(amount1ClearStr.trim());
    } catch {
      return BigInt(0);
    }
  }, [amount1ClearStr]);

  const canSend = Boolean(
    signer &&
      fhevm &&
      account &&
      token1Ref.current &&
      amount1Clear > BigInt(0) &&
      Number(minTick) < Number(maxTick)
  );

  const onDecryptBalance = async () => {
    try {
      if (!account || !token1 || !encBalanceHandle) return;
      if (!fhevm || !signer) return;

      setDecBusy(true);
      toast.info("Decrypting…");
      const result = await decryptHandles([
        { handle: encBalanceHandle, contractAddress: token1 },
      ]);
      setDecBalance(result[encBalanceHandle] as bigint);
      toast.success("Decrypted.");
    } catch (e: any) {
      toast.error(`Decrypt failed: ${e?.message ?? e}`);
    } finally {
      setDecBusy(false);
    }
  };

  const onProvide1 = async () => {
    try {
      if (!canSend || !poolRef.current || !token1) return;
      setBusy(true);
      setStatus("Setting operator…");
      await setOperatorCERC20(token1, poolAddress, 3600);

      setStatus("Encrypting amount…");
      const me = await signer!.getAddress();
      const input = fhevm!.createEncryptedInput(poolAddress, me);
      input.add64(Number(amount1Clear));
      const enc = await input.encrypt();

      setStatus("Simulating provideLiquidityToken1…");
      const fn = poolRef.current.getFunction("provideLiquidityToken1");
      const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineSec);
      const tokenIdStatic = await fn.staticCall(
        Number(minTick),
        Number(maxTick),
        enc.handles[0],
        amount1Clear,
        me,
        enc.inputProof,
        deadline
      );

      setStatus(`Sending tx (tokenId=${tokenIdStatic})…`);
      const tx = await fn(
        Number(minTick),
        Number(maxTick),
        enc.handles[0],
        amount1Clear,
        me,
        enc.inputProof,
        deadline,
        { gasLimit: BigInt(1_000_000) }
      );
      const rc = await tx.wait();
      setStatus(`✅ Provided (gas=${rc?.gasUsed?.toString() ?? "?"})`);
      setAmount1ClearStr("");

      // refresh balance handle
      const freshHandle: string = await token1Ref.current!.getFunction(
        "confidentialBalanceOf"
      )(account);
      setEncBalanceHandle(freshHandle);
      setDecBalance(undefined);
    } catch (e: any) {
      setStatus(`❌ Failed: ${e?.reason ?? e?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-slate-800 bg-slate-900/60">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2 text-slate-300">
          <Shield className="h-4 w-4 text-cyan-300" />
          <span className="text-sm">Provide confidential liquidity</span>
        </div>

        <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
          <div>
            <div className="text-xs text-slate-500 mb-1">
              Encrypted balance handle
            </div>
            <div className="text-[11px] font-mono text-slate-200 bg-slate-900/70 border border-slate-800 rounded p-2 break-all">
              {encBalanceHandle ?? "—"}
            </div>
            {decBalance !== undefined && (
              <div className="mt-2 text-xs text-slate-400">
                Decrypted:{" "}
                <span className="font-mono text-slate-100">
                  {String(decBalance)}
                </span>
              </div>
            )}
          </div>
          <Button
            variant="secondary"
            onClick={onDecryptBalance}
            disabled={!encBalanceHandle || decBusy}
            className="h-10 bg-slate-800 hover:bg-slate-700 text-slate-100"
          >
            {decBusy ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            Decrypt balance
          </Button>
        </div>

        <Separator className="bg-slate-800" />

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <div className="text-xs text-slate-500 mb-1">Amount (uint64)</div>
            <Input
              value={amount1ClearStr}
              onChange={(e) => setAmount1ClearStr(e.target.value)}
              placeholder="e.g. 250000"
              inputMode="numeric"
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
              min={60}
              value={deadlineSec}
              onChange={(e) => setDeadlineSec(Number(e.target.value || 3600))}
            />
          </div>
        </div>

        <Separator className="bg-slate-800" />

        <Button
          disabled={!canSend || busy}
          onClick={onProvide1}
          className="w-full h-11 bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500"
        >
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Provide confidential
        </Button>

        {status && (
          <div className="text-xs font-mono text-slate-200 bg-slate-900/70 border border-slate-800 rounded-lg p-3">
            {status}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
