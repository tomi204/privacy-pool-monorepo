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
const KMS_VERIFIER_ABI = [
  "function getKmsSigners() view returns (address[])",
  "function getThreshold() view returns (uint256)",
] as const;

const RELAYER_POLL_INTERVAL_MS = 5_000;
const RELAYER_MAX_ATTEMPTS = 24;
const RELAYER_EXTRA_DATA = "0x00";

class RelayerPendingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RelayerPendingError";
  }
}

type FheNetworkConfig = {
  relayerUrl: string;
  kmsContractAddress: `0x${string}`;
  aclContractAddress: `0x${string}`;
  verifyingContractAddressDecryption: `0x${string}`;
  network?: string;
};

function getFheNetworkConfig(chainId?: number): FheNetworkConfig | undefined {
  if (!chainId) return undefined;
  switch (chainId) {
    case 11155111:
      return {
        relayerUrl: "https://relayer.testnet.zama.cloud",
        kmsContractAddress: "0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC",
        aclContractAddress: "0x687820221192C5B662b25367F70076A37bc79b6c",
        verifyingContractAddressDecryption:
          "0xb6E160B1ff80D67Bfe90A85eE06Ce0A2613607D1",
        network: "https://eth-sepolia.public.blastapi.io",
      };
    default:
      return undefined;
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchPublicDecryption(relayerUrl: string, handles: string[]) {
  const payload = {
    ciphertextHandles: handles,
    extraData: RELAYER_EXTRA_DATA,
  };

  let response: Response;
  try {
    response = await fetch(`${relayerUrl}/v1/public-decrypt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw new RelayerPendingError(`Relayer unreachable: ${String(error)}`);
  }

  if (!response.ok) {
    if ([404, 425, 429, 500, 502, 503, 504].includes(response.status)) {
      throw new RelayerPendingError(
        `Relayer not ready (status ${response.status})`
      );
    }
    const text = await response.text().catch(() => "");
    throw new Error(
      `Relayer error ${response.status}${text ? `: ${text}` : ""}`
    );
  }

  let json: any;
  try {
    json = await response.json();
  } catch (error) {
    throw new RelayerPendingError(`Invalid relayer JSON: ${String(error)}`);
  }

  if (!json || typeof json !== "object" || !Array.isArray(json.response)) {
    throw new RelayerPendingError("Relayer response not ready yet");
  }

  if (!json.response.length) {
    throw new RelayerPendingError("Relayer returned empty response list");
  }

  return json.response[0] as {
    decrypted_value: string;
    signatures?: string[];
    extra_data?: string;
  };
}

function buildDecryptionProof(
  signatures: string[] = [],
  extraDataHex = RELAYER_EXTRA_DATA
) {
  const normalizedSignatures = signatures.map((signature) =>
    signature.startsWith("0x") ? signature : `0x${signature}`
  );
  const normalizedExtra = extraDataHex?.startsWith("0x")
    ? extraDataHex
    : `0x${extraDataHex ?? ""}`;
  const extraData =
    normalizedExtra === "0x" ? RELAYER_EXTRA_DATA : normalizedExtra;

  const extraBytes = ethers.getBytes(extraData);
  const proof = new Uint8Array(
    1 + normalizedSignatures.length * 65 + extraBytes.length
  );
  proof[0] = normalizedSignatures.length;

  normalizedSignatures.forEach((signature, index) => {
    const sigBytes = ethers.getBytes(signature);
    proof.set(sigBytes, 1 + index * 65);
  });

  if (extraBytes.length) {
    proof.set(extraBytes, 1 + normalizedSignatures.length * 65);
  }

  return proof;
}

type SwapPanelProps = {
  poolAddress: `0x${string}`;
  signer: ethers.Signer | null | undefined;
  userAddress?: string;
  chainId?: number;
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
  chainId,
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
  const relayerConfig = useMemo(() => getFheNetworkConfig(chainId), [chainId]);

  const pool = useMemo(() => {
    if (!signer) return null;
    return new ethers.Contract(poolAddress, PrivacyPoolV2ABI.abi, signer);
  }, [poolAddress, signer]);

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
      outAmount: BigInt(0),
      outFormatted: "",
      desiredOutAmount: BigInt(0),
      requiredInAmount: BigInt(0),
      requiredInFormatted: "",
    };
    if (!inStr.trim()) return empty;
    try {
      if (dir0to1) {
        const parsed = ethers.parseUnits(inStr, dec0);
        if (
          parsed <= BigInt(0) ||
          r0 <= BigInt(0) ||
          r1v <= BigInt(0) ||
          feeFactor <= BigInt(0)
        )
          return empty;
        const inAfterFee = (parsed * feeFactor) / feeDen;
        if (inAfterFee <= BigInt(0)) return empty;
        const k = r0 * r1v;
        const r0After = r0 + inAfterFee;
        if (r0After === BigInt(0)) return empty;
        const r1After = k / r0After;
        const out = r1v - r1After;
        if (out <= BigInt(0)) return empty;
        return {
          outAmount: out,
          outFormatted: ethers.formatUnits(out, dec1),
          desiredOutAmount: BigInt(0),
          requiredInAmount: BigInt(0),
          requiredInFormatted: "",
        };
      }
      const desiredOut = ethers.parseUnits(inStr, dec0);
      if (
        desiredOut <= BigInt(0) ||
        desiredOut >= r0 ||
        r0 <= BigInt(0) ||
        r1v <= BigInt(0) ||
        feeFactor <= BigInt(0)
      )
        return empty;
      const k = r0 * r1v;
      const r0After = r0 - desiredOut;
      if (r0After <= BigInt(0)) return empty;
      const r1After = k / r0After;
      const inAfterFee = r1After - r1v;
      if (inAfterFee <= BigInt(0)) return empty;
      const numerator = inAfterFee * feeDen;
      const needIn = (numerator + (feeFactor - BigInt(1))) / feeFactor;
      if (needIn <= BigInt(0)) return empty;
      return {
        outAmount: BigInt(0),
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
      return BigInt(0);
    }
  }, [inStr, dir0to1, dec0, quote.requiredInAmount]);

  const desiredOutAmount = dir0to1 ? BigInt(0) : quote.desiredOutAmount;
  const needApprove =
    dir0to1 && amountIn > BigInt(0) && allowanceState < amountIn;
  const slippageFactor = BigInt(10_000 - slippageBps);
  const applySlippage = useCallback(
    (value: bigint) => (value * slippageFactor) / BigInt(10_000),
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

  const finalizeConfidentialSwap = useCallback(
    async (requestId: bigint, encryptedHandle: Uint8Array) => {
      if (!pool) throw new Error("Contrato del pool no listo");
      const config = relayerConfig;
      if (!config) {
        throw new Error(
          "Configuración del relayer no disponible para esta red"
        );
      }

      const provider =
        signer?.provider ??
        (config.network
          ? new ethers.JsonRpcProvider(config.network)
          : undefined);
      if (!provider) {
        throw new Error("Proveedor RPC no disponible para operaciones FHE");
      }

      const kmsContract = new ethers.Contract(
        config.kmsContractAddress,
        KMS_VERIFIER_ABI,
        provider
      );
      const [thresholdRaw, kmsSigners] = await Promise.all([
        kmsContract.getThreshold(),
        kmsContract.getKmsSigners(),
      ]);
      const threshold = Number(thresholdRaw);

      if (!kmsSigners || kmsSigners.length === 0) {
        throw new Error("No hay firmantes de KMS configurados");
      }

      const handleHex = ethers.hexlify(encryptedHandle);
      let attempt = 0;

      while (attempt < RELAYER_MAX_ATTEMPTS) {
        try {
          setStatus(
            `⏳ Esperando desencriptado externo (request #${requestId})…`
          );
          const result = await fetchPublicDecryption(config.relayerUrl, [
            handleHex,
          ]);
          const decryptedHex = result.decrypted_value.startsWith("0x")
            ? result.decrypted_value
            : `0x${result.decrypted_value}`;

          if ((result.signatures?.length ?? 0) < threshold) {
            throw new Error("Relayer devolvió menos firmas de las necesarias");
          }

          const extraForProof =
            !result.extra_data || result.extra_data === "0x"
              ? RELAYER_EXTRA_DATA
              : result.extra_data;
          const proofBytes = buildDecryptionProof(
            result.signatures,
            extraForProof
          );
          const cleartextsBytes = ethers.getBytes(decryptedHex);

          setStatus("Confirmando swap confidencial…");
          await pool
            .getFunction("finalizeSwap")
            .staticCall(requestId, cleartextsBytes, proofBytes);

          const finalizeTx = await pool.getFunction("finalizeSwap")(
            requestId,
            cleartextsBytes,
            proofBytes,
            { gasLimit: BigInt(600000) }
          );
          await finalizeTx.wait();

          toast.success(
            `Swap confidencial finalizado (request #${requestId.toString()})`
          );
          setStatus("✅ Swap confidencial finalizado");
          return;
        } catch (error) {
          if (error instanceof RelayerPendingError) {
            attempt += 1;
            await sleep(RELAYER_POLL_INTERVAL_MS);
            continue;
          }
          throw error;
        }
      }

      throw new Error("Timeout esperando desencriptado externo");
    },
    [pool, relayerConfig, signer]
  );
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
      if (!pool) {
        toast.error("Contrato del pool no disponible");
        return;
      }

      if (dir0to1) {
        if (amountIn <= BigInt(0)) throw new Error("Ingresa un monto válido");
        if (quote.outAmount <= BigInt(0))
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
        if (desiredOutAmount <= BigInt(0))
          throw new Error("Ingresa la salida deseada en token público");
        if (quote.requiredInAmount <= BigInt(0))
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
        await finalizeConfidentialSwap(preview, enc.handles[0]);
        setOperatorReady(true);
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
    pool,
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
    finalizeConfidentialSwap,
  ]);

  const toValue = dir0to1 ? quote.outFormatted : quote.requiredInFormatted;

  const canSwap = dir0to1
    ? amountIn > BigInt(0) && quote.outAmount > BigInt(0)
    : desiredOutAmount > BigInt(0) && quote.requiredInAmount > BigInt(0);

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
