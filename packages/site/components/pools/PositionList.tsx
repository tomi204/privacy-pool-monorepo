"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ethers } from "ethers";
import { useReownEthersSigner } from "@/hooks/useReownEthersSigner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, Unlock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { PositionNFTABI } from "@/abi/PositionNFTABI";
import { PositionNFTAddresses } from "@/abi/PositionNFTAddresses";

import { useLunarys } from "@/context/Lunarys";

type PositionRaw = {
  token0: `0x${string}`;
  token1: `0x${string}`;
  tickLower: number;
  tickUpper: number;
  liquidity: string; // handle bytes32 (euint64)
  token0Amount: string; // handle
  token1Amount: string; // handle
  isConfidential: boolean;
  createdAt: bigint;
  lastUpdated: bigint;
};

type PositionView = PositionRaw & {
  tokenId: bigint;
  clear?: {
    liquidity?: string | bigint;
    token0?: string | bigint;
    token1?: string | bigint;
  };
};

function getPositionNFTByChainId(chainId?: number) {
  if (!chainId) return { abi: PositionNFTABI.abi } as const;
  const entry =
    PositionNFTAddresses?.[
      chainId.toString() as keyof typeof PositionNFTAddresses
    ];
  if (!entry || !("address" in entry) || entry.address === ethers.ZeroAddress) {
    return { abi: PositionNFTABI.abi, chainId } as const;
  }
  return {
    abi: PositionNFTABI.abi,
    address: entry.address as `0x${string}`,
    chainId: entry.chainId,
    chainName: entry.chainName,
  } as const;
}

export function PositionList() {
  const {
    ethersReadonlyProvider,
    ethersSigner,
    isConnected,
    accounts,
    chainId,
  } = useReownEthersSigner();
  const user = accounts?.[0];

  const nftMeta = useMemo(() => getPositionNFTByChainId(chainId), [chainId]);
  const [loading, setLoading] = useState(false);
  const [positions, setPositions] = useState<PositionView[]>([]);
  const [status, setStatus] = useState("");

  // lunarys provider (FHEVM instance + decryption helper centralizado)
  const { fhevm, decryptHandles } = useLunarys?.() ?? {};

  useEffect(() => {
    (async () => {
      try {
        setStatus("");
        setPositions([]);
        if (
          !isConnected ||
          !user ||
          !nftMeta.address ||
          !ethersReadonlyProvider
        )
          return;

        setLoading(true);
        const nft = new ethers.Contract(
          nftMeta.address,
          nftMeta.abi,
          ethersReadonlyProvider
        );

        const tokenIds: bigint[] = await nft.getUserPositions(user);
        if (!tokenIds.length) {
          setPositions([]);
          setLoading(false);
          return;
        }

        const raws = await Promise.all(
          tokenIds.map(async (id) => {
            const p = await nft.getPosition(id);
            const pv: PositionView = {
              tokenId: BigInt(id),
              token0: p.token0,
              token1: p.token1,
              tickLower: Number(p.tickLower),
              tickUpper: Number(p.tickUpper),
              liquidity: p.liquidity as string,
              token0Amount: p.token0Amount as string,
              token1Amount: p.token1Amount as string,
              isConfidential: Boolean(p.isConfidential),
              createdAt: BigInt(p.createdAt),
              lastUpdated: BigInt(p.lastUpdated),
            };
            return pv;
          })
        );

        setPositions(raws);
      } catch (e: any) {
        setStatus(`Load error: ${e?.message ?? e}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [isConnected, user, nftMeta.address, ethersReadonlyProvider]);

  const handleDecrypt = async (pos: PositionView) => {
    try {
      if (!fhevm || !ethersSigner) {
        setStatus("FHEVM or signer not ready");
        toast.error("FHEVM or signer not ready");
        return;
      }
      setStatus(`Decrypting position #${pos.tokenId.toString()}...`);

      const items = [
        {
          handle: pos.liquidity,
          contractAddress: nftMeta.address! as `0x${string}`,
        },
        {
          handle: pos.token0Amount,
          contractAddress: nftMeta.address! as `0x${string}`,
        },
        {
          handle: pos.token1Amount,
          contractAddress: nftMeta.address! as `0x${string}`,
        },
      ];

      const res = (await decryptHandles?.(items)) ?? {};

      const updated = positions.map((p) => {
        if (p.tokenId !== pos.tokenId) return p;
        return {
          ...p,
          clear: {
            liquidity: res[pos.liquidity],
            token0: res[pos.token0Amount],
            token1: res[pos.token1Amount],
          },
        };
      });
      setPositions(updated as PositionView[]);
      setStatus("Decrypted ✓");
      toast.success(
        `Position #${pos.tokenId.toString()} decrypted successfully`
      );
    } catch (e: any) {
      const errorMessage = `Decrypt error: ${e?.message ?? e}`;
      setStatus(errorMessage);
      toast.error(errorMessage);
    }
  };

  return (
    <div className="space-y-6">
      {!isConnected ? (
        <Card className="border border-dashed border-slate-900/70 bg-slate-950/40 text-slate-300">
          <CardContent className="p-6">
            Connect your wallet to view your positions.
          </CardContent>
        </Card>
      ) : !nftMeta.address ? (
        <Card className="border border-dashed border-slate-900/70 bg-slate-950/40 text-slate-300">
          <CardContent className="p-6">
            PositionNFT is not deployed on this network.
          </CardContent>
        </Card>
      ) : loading ? (
        <Card className="border border-slate-900/70 bg-slate-950/60">
          <CardContent className="flex items-center gap-3 p-6 text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
            Loading positions...
          </CardContent>
        </Card>
      ) : positions.length === 0 ? (
        <Card className="border border-slate-900/70 bg-slate-950/60">
          <CardContent className="p-6 text-slate-300">
            No positions found.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {positions.map((p) => (
            <Card
              key={p.tokenId.toString()}
              className="group border border-slate-900/70 bg-slate-950/60 transition hover:border-cyan-500/50 hover:bg-slate-950"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">
                    Position #{p.tokenId.toString()}
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className="border-cyan-500/50 bg-cyan-500/10 text-cyan-200"
                  >
                    {p.isConfidential ? (
                      <span className="inline-flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4" /> Confidential
                      </span>
                    ) : (
                      "Public"
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-300">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-slate-400 text-xs">Range (ticks)</div>
                    <div className="font-mono">
                      [{p.tickLower}, {p.tickUpper}]
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-xs">Created</div>
                    <div className="font-mono">
                      {new Date(Number(p.createdAt) * 1000).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-xs">Updated</div>
                    <div className="font-mono">
                      {new Date(Number(p.lastUpdated) * 1000).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-xs">Tokens</div>
                    <div className="font-mono text-xs break-all">
                      {p.token0} <br /> {p.token1}
                    </div>
                  </div>
                </div>

                <Separator className="bg-slate-800" />

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-slate-400 text-xs">Liquidity</div>
                    <div className="font-mono">
                      {p.clear?.liquidity ?? (
                        <span className="text-slate-500">encrypted</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-xs">Token0</div>
                    <div className="font-mono">
                      {p.clear?.token0 ?? (
                        <span className="text-slate-500">encrypted</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-xs">Token1</div>
                    <div className="font-mono">
                      {p.clear?.token1 ?? (
                        <span className="text-slate-500">encrypted</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <Button
                    size="sm"
                    className="bg-cyan-600 text-white transition hover:bg-cyan-500"
                    onClick={() => handleDecrypt(p)}
                  >
                    <Unlock className="w-4 h-4 mr-2" />
                    Decrypt amounts
                  </Button>

                  {/* Link to go to pool (e.g. /pool?tokenId=...) if you want to manage actions there */}
                  <Button
                    size="sm"
                    variant="secondary"
                    className="border border-slate-800 bg-transparent text-slate-200 hover:bg-slate-900"
                    asChild
                  >
                    <Link href={`/pool?position=${p.tokenId.toString()}`}>
                      Manage
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {status && (
        <Card className="border border-slate-900/70 bg-slate-950/60">
          <CardContent className="p-4 text-xs font-mono text-slate-200">
            {status}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
