"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import { Eip1193Provider } from "ethers";
import {
  Wallet,
  Coins,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";

import { useReownEthersSigner } from "@/hooks/useReownEthersSigner";
import { ConnectButton } from "@/components/wallet-connect/ConnectButton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

// Archivos generados por tu postdeploy (igual que FHECounter*)
import { PrivacyPoolV2ABI } from "@/abi/PrivacyPoolV2ABI";
import { PrivacyPoolV2Addresses } from "@/abi/PrivacyPoolV2Addresses";

// ─────────────────────────────────────────────────────────────────────────────
// Minimal ABI para ERC20 en el front (no dependemos de artifacts del repo)
const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Resolver pool por chainId, igual que en tu ejemplo de FHECounter
function getPoolByChainId(chainId?: number) {
  if (!chainId) return { abi: PrivacyPoolV2ABI.abi } as const;

  const entry =
    PrivacyPoolV2Addresses?.[
      chainId.toString() as keyof typeof PrivacyPoolV2Addresses
    ];

  if (!entry || !("address" in entry) || entry.address === ethers.ZeroAddress) {
    return { abi: PrivacyPoolV2ABI.abi, chainId } as const;
  }

  return {
    abi: PrivacyPoolV2ABI.abi,
    address: entry.address as `0x${string}`,
    chainId: entry.chainId,
    chainName: entry.chainName,
  } as const;
}

// ─────────────────────────────────────────────────────────────────────────────
// UI
export default function ProvideToken0Card() {
  const {
    ethersSigner,
    ethersReadonlyProvider,
    provider,
    isConnected,
    chainId,
    accounts,
  } = useReownEthersSigner();

  const user = accounts?.[0];

  const poolMeta = useMemo(() => getPoolByChainId(chainId), [chainId]);
  const [status, setStatus] = useState<string>("");
  const [amount, setAmount] = useState<string>(""); // humano (ej: "4.2")
  const [minTick, setMinTick] = useState<string>("-120");
  const [maxTick, setMaxTick] = useState<string>("120");
  const [isBusy, setIsBusy] = useState(false);

  const token0 = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
  const [token0Decimals, setToken0Decimals] = useState<number>(6); // default 6 (USDC)
  const [balance, setBalance] = useState<bigint>(BigInt(0));
  const [allowance, setAllowance] = useState<bigint>(BigInt(0));
  const pool = new ethers.Contract(
    poolMeta.address!,
    poolMeta.abi,
    ethersReadonlyProvider!
  );
  const poolRef = useRef<ethers.Contract>(pool);
  const token0Ref = useRef<ethers.Contract | null>(
    new ethers.Contract(token0!, ERC20_ABI, ethersReadonlyProvider!)
  );

  // helpers
  const canWork = !!(
    isConnected &&
    ethersSigner &&
    ethersReadonlyProvider &&
    poolMeta.address
  );

  const deadline = useMemo(
    () => BigInt(Math.floor(Date.now() / 1000) + 60 * 60),
    []
  );

  // ───────────────────────────────────────────────────────────────────────────
  // Cargar pool + token0
  useEffect(() => {
    (async () => {
      try {
        setStatus("");

        if (!canWork) return;

        const pool = new ethers.Contract(
          poolMeta.address!,
          poolMeta.abi,
          ethersReadonlyProvider!
        );
        poolRef.current = pool;

        // leer token0 desde el pool
        const token0Address = (await pool.token0()) as `0x${string}`;

        const erc = new ethers.Contract(
          token0Address,
          ERC20_ABI,
          ethersReadonlyProvider!
        );
        token0Ref.current = erc;

        const dec = Number(await erc.decimals());
        setToken0Decimals(dec);

        if (user) {
          const [bal, allo] = await Promise.all([
            erc.balanceOf(user),
            erc.allowance(user, poolMeta.address),
          ]);
          setBalance(bal as bigint);
          setAllowance(allo as bigint);
        }
      } catch (e: any) {
        setStatus(`Error init: ${e?.message ?? e}`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canWork, poolMeta.address, ethersReadonlyProvider, user]);

  // refrescar balance/allowance al cambiar amount
  useEffect(() => {
    (async () => {
      try {
        if (!token0Ref.current || !user || !poolMeta.address) return;
        const [bal, allo] = await Promise.all([
          token0Ref.current.balanceOf(user),
          token0Ref.current.allowance(user, poolMeta.address),
        ]);
        setBalance(bal as bigint);
        setAllowance(allo as bigint);
      } catch {
        /* ignore */
      }
    })();
  }, [amount, user, poolMeta.address]);

  const parseAmountWei = () => {
    if (!amount || isNaN(Number(amount))) return null;
    try {
      return ethers.parseUnits(amount, token0Decimals);
    } catch {
      return null;
    }
  };

  const needsApprove = () => {
    const wei = parseAmountWei();
    if (wei === null) return false;
    return allowance < wei;
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Approve
  const onApprove = async () => {
    try {
      if (!ethersSigner || !token0Ref.current || !poolMeta.address) return;
      const wei = parseAmountWei();
      if (wei === null) {
        setStatus("Invalid amount");
        return;
      }
      setIsBusy(true);
      setStatus("Signing approve...");

      const tokenAddr = token0Ref.current.target as `0x${string}`; // ethers v6
      const tokenWithSigner = new ethers.Contract(
        tokenAddr,
        ERC20_ABI,
        ethersSigner
      );
      const tx = await tokenWithSigner.approve(poolMeta.address, wei);
      setStatus(`approve tx: ${tx.hash} (waiting for confirmation)`);
      await tx.wait();

      // refrescar allowance
      const allo = await token0Ref.current!.allowance(user, poolMeta.address);
      setAllowance(allo as bigint);
      setStatus("Approve OK ✅");
    } catch (e: any) {
      setStatus(`Approve failed: ${e?.message ?? e}`);
    } finally {
      setIsBusy(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Provide Liquidity (token0)
  const onProvide = async () => {
    try {
      if (!ethersSigner || !poolRef.current || !poolMeta.address) return;

      const wei = parseAmountWei();
      if (wei === null || wei === BigInt(0)) {
        setStatus("Invalid amount");
        return;
      }
      const min = Number(minTick);
      const max = Number(maxTick);
      if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
        setStatus("Invalid range (minTick < maxTick)");
        return;
      }
      if (balance < wei) {
        setStatus("Insufficient balance");
        return;
      }
      if (allowance < wei) {
        setStatus("Missing approve (allowance < amount)");
        return;
      }

      setIsBusy(true);
      setStatus("Pre-calculating tokenId (staticCall with signer)...");
      // pool con signer
      const poolWithSigner = new ethers.Contract(
        poolMeta.address!,
        poolMeta.abi,
        ethersSigner!
      );

      // 1) token0()
      const token0Fn = poolWithSigner.getFunction("token0");
      const token0Address = await token0Fn(); // typed y prolijo

      // 2) provideLiquidityToken0 (preview + tx real)
      const provide0 = poolWithSigner.getFunction("provideLiquidityToken0");

      // PREVIEW (static)
      const tokenIdStatic = await provide0.staticCall(
        min,
        max,
        wei,
        user,
        deadline
      );
      setStatus(
        `Mint tokenId (static): ${tokenIdStatic}. Sending transaction...`
      );

      // TX REAL
      const tx = await provide0(min, max, wei, user, deadline);
      await tx.wait();

      setStatus(
        `provideLiquidityToken0 tx: ${tx.hash} (waiting for confirmation)`
      );
      const rc = await tx.wait();
      setStatus(
        `Liquidity provided ✅ (gas=${rc?.gasUsed?.toString() ?? "?"})`
      );

      // refrescar balances/allowance
      const [bal, allo] = await Promise.all([
        token0Ref.current!.balanceOf(user),
        token0Ref.current!.allowance(user, poolMeta.address),
      ]);
      setBalance(bal as bigint);
      setAllowance(allo as bigint);
    } catch (e: any) {
      setStatus(`Provide failed: ${e?.message ?? e}`);
    } finally {
      setIsBusy(false);
    }
  };
  // ───────────────────────────────────────────────────────────────────────────
  // Render
  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md border-0 shadow-lg bg-gradient-to-br from-slate-50 to-white">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Wallet className="w-12 h-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Connect Your Wallet
            </h3>
            <p className="text-sm text-slate-600 text-center mb-6">
              Connect your wallet to start providing liquidity to the Privacy
              Pool
            </p>
            <ConnectButton />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!poolMeta.address) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md border-0 shadow-lg bg-gradient-to-br from-red-50 to-white">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">
              Pool Not Available
            </h3>
            <p className="text-sm text-red-700 text-center">
              PrivacyPoolV2 is not deployed on this network. Please switch to a
              supported network.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pretty = (x: unknown) =>
    typeof x === "bigint" ? x.toString() : x === undefined ? "—" : String(x);

  const amountWei = parseAmountWei();
  const showApprove = needsApprove();

  const formatBalance = (balance: bigint, decimals: number) => {
    const formatted = ethers.formatUnits(balance, decimals);
    return parseFloat(formatted).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 p-4">
      {/* Header */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-700/50">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">
                Provide Liquidity
              </CardTitle>
              <CardDescription className="text-slate-300">
                Add token0 liquidity to PrivacyPoolV2
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pool Information */}
        <Card className="lg:col-span-1 border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-slate-900">
              Pool Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-600">
                  Network
                </span>
                <Badge variant="outline" className="font-mono">
                  {pretty(chainId)}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-600">
                  Token
                </span>
                <Badge variant="secondary" className="font-mono text-xs">
                  {token0Decimals} decimals
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-600">
                  Balance
                </span>
                <Badge
                  variant="outline"
                  className="font-mono bg-green-50 text-green-700 border-green-200"
                >
                  {formatBalance(balance, token0Decimals)}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-600">
                  Allowance
                </span>
                <Badge
                  variant="outline"
                  className="font-mono bg-blue-50 text-blue-700 border-blue-200"
                >
                  {formatBalance(allowance, token0Decimals)}
                </Badge>
              </div>
            </div>
            <Separator />
            <div className="text-xs font-mono text-slate-500 bg-slate-100 p-3 rounded-lg break-all">
              {poolMeta.address}
            </div>
          </CardContent>
        </Card>

        {/* Main Form */}
        <Card className="lg:col-span-2 border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-slate-900">
              Liquidity Parameters
            </CardTitle>
            <CardDescription>
              Configure your liquidity provision
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Amount Input */}
            <div className="space-y-2">
              <Label
                htmlFor="amount"
                className="text-sm font-semibold text-slate-700"
              >
                Amount (token0)
              </Label>
              <div className="relative">
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-4 pr-4 py-3 text-lg font-mono border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                  inputMode="decimal"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-slate-500 font-medium">
                  TOKEN0
                </div>
              </div>
            </div>

            {/* Tick Range */}
            <div className="space-y-4">
              <Label className="text-sm font-semibold text-slate-700">
                Price Range (Ticks)
              </Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minTick" className="text-xs text-slate-600">
                    Min Tick
                  </Label>
                  <Input
                    id="minTick"
                    type="number"
                    value={minTick}
                    onChange={(e) => setMinTick(e.target.value)}
                    className="font-mono border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                    inputMode="numeric"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxTick" className="text-xs text-slate-600">
                    Max Tick
                  </Label>
                  <Input
                    id="maxTick"
                    type="number"
                    value={maxTick}
                    onChange={(e) => setMaxTick(e.target.value)}
                    className="font-mono border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                    inputMode="numeric"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Action Buttons */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                {showApprove ? (
                  <Button
                    onClick={onApprove}
                    disabled={
                      !canWork ||
                      isBusy ||
                      !amountWei ||
                      amountWei === BigInt(0)
                    }
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                    size="lg"
                  >
                    {isBusy ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Approving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Approve Token
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={onProvide}
                    disabled={
                      !canWork ||
                      isBusy ||
                      !amountWei ||
                      amountWei === BigInt(0)
                    }
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                    size="lg"
                  >
                    {isBusy ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Providing...
                      </>
                    ) : (
                      <>
                        <TrendingUp className="w-5 h-5 mr-2" />
                        Provide Liquidity
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Deadline Info */}
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100 p-3 rounded-lg">
                <Clock className="w-4 h-4" />
                <span className="font-mono">
                  Deadline: {new Date(Number(deadline) * 1000).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Status */}
            {status && (
              <div className="bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-sm border border-slate-700">
                <div className="flex items-start gap-2">
                  {isBusy ? (
                    <Loader2 className="w-4 h-4 mt-0.5 animate-spin text-blue-400" />
                  ) : status.includes("failed") || status.includes("Error") ? (
                    <AlertCircle className="w-4 h-4 mt-0.5 text-red-400" />
                  ) : status.includes("OK") || status.includes("✅") ? (
                    <CheckCircle className="w-4 h-4 mt-0.5 text-green-400" />
                  ) : (
                    <Clock className="w-4 h-4 mt-0.5 text-slate-400" />
                  )}
                  <span>{status}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
