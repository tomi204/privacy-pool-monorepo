"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ethers } from "ethers";
import type { FhevmInstance, GenericStringStorage } from "@fhevm/react";
import {
  useFhevm,
  FhevmDecryptionSignature,
  GenericStringInMemoryStorage,
} from "@fhevm/react";

// 👉 Ajusta estos imports a tus hooks reales
import { useReownEthersSigner } from "@/hooks/useReownEthersSigner";

// 👉 Tus ABIs generadas por postdeploy
import { PrivacyPoolV2ABI } from "@/abi/PrivacyPoolV2ABI";
import { CERC20ABI } from "@/abi/CERC20ABI";

// Opcional: un registro de pools estáticos por chain (puedes reemplazar por fetch on-chain o config)
export type PoolInfo = {
  address: `0x${string}`;
  token0: `0x${string}`;
  token1: `0x${string}`;
  name?: string;
};

type PoolRegistry = Record<string, PoolInfo[]>; // key: chainId string
const DEFAULT_REGISTRY: PoolRegistry = {
  "11155111": [
    {
      address: "0x6686134CC77b9eB6D5926D3d9bEC62b1888F0A00",
      token0: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
      token1: "0x0F8902A83c9b20f2183dBc0d6672Ee0905B2Ca7d",
      name: "USDC / CTKN (Sepolia)",
    },
  ],
};

export type TokenMeta = {
  address: `0x${string}`;
  symbol?: string;
  decimals?: number;
};

type LunarysContextType = {
  // web3
  provider?: ethers.Eip1193Provider;
  ethersProvider?: ethers.BrowserProvider;
  signer?: ethers.Signer | null;
  chainId?: number;
  account?: string;

  // fhevm
  fhevm?: FhevmInstance;
  decStorage: GenericStringStorage;

  // registry
  pools: PoolInfo[];
  getPoolByAddress: (addr: `0x${string}`) => PoolInfo | undefined;

  // contracts
  getPoolContract: (
    pool: `0x${string}`,
    runner?: ethers.ContractRunner
  ) => ethers.Contract;
  getERC20: (
    token: `0x${string}`,
    runner?: ethers.ContractRunner
  ) => ethers.Contract;

  // token meta cache
  getTokenMeta: (token: `0x${string}`) => Promise<TokenMeta>;

  // approvals / operators
  approveERC20: (
    token: `0x${string}`,
    spender: `0x${string}`,
    amount: bigint
  ) => Promise<ethers.TransactionReceipt | null>;
  setOperatorCERC20: (
    token1: `0x${string}`,
    operator: `0x${string}`,
    expirySec: number
  ) => Promise<ethers.TransactionReceipt | null>;

  // decryption helpers
  ensureDecryptionSignature: (
    contracts: `0x${string}`[]
  ) => Promise<FhevmDecryptionSignature | null>;
  decryptHandles: (
    items: { handle: string; contractAddress: `0x${string}` }[]
  ) => Promise<Record<string, string | bigint | boolean>>;
};

const LunarysContext = createContext<LunarysContextType | undefined>(undefined);

export function LunarysProvider({ children }: { children: React.ReactNode }) {
  const {
    provider,
    ethersSigner,
    ethersReadonlyProvider,
    chainId,
    accounts,
    initialMockChains,
  } = useReownEthersSigner();

  const account = accounts?.[0];
  const [ethersProvider, setEthersProvider] = useState<
    ethers.BrowserProvider | undefined
  >(undefined);

  const { instance: fhevm } = useFhevm({
    provider: provider as ethers.Eip1193Provider,
    chainId: chainId as number,
    initialMockChains,
    enabled: Boolean(provider && chainId),
  });

  const decStorageRef = useRef<GenericStringStorage>(
    new GenericStringInMemoryStorage()
  );

  useEffect(() => {
    if (provider) {
      const bp = new ethers.BrowserProvider(provider, "any");
      setEthersProvider(bp);
    } else {
      setEthersProvider(undefined);
    }
  }, [provider]);

  const pools = useMemo<PoolInfo[]>(() => {
    if (!chainId) return [];
    const key = String(chainId);
    return DEFAULT_REGISTRY[key] ?? [];
  }, [chainId]);

  const getPoolByAddress = (addr: `0x${string}`) =>
    pools.find((p) => p.address.toLowerCase() === addr.toLowerCase());

  const getPoolContract = (
    poolAddr: `0x${string}`,
    runner?: ethers.ContractRunner
  ) =>
    new ethers.Contract(
      poolAddr,
      PrivacyPoolV2ABI.abi,
      runner ?? (ethersSigner || ethersReadonlyProvider)!
    );

  const getERC20 = (token: `0x${string}`, runner?: ethers.ContractRunner) =>
    new ethers.Contract(
      token,
      CERC20ABI.abi,
      runner ?? (ethersSigner || ethersReadonlyProvider)!
    );

  const tokenMetaCache = useRef<Map<string, TokenMeta>>(new Map());

  const getTokenMeta = async (token: `0x${string}`): Promise<TokenMeta> => {
    const key = token.toLowerCase();
    const hit = tokenMetaCache.current.get(key);
    if (hit?.symbol && typeof hit.decimals === "number") return hit;

    const erc = getERC20(token, ethersReadonlyProvider);
    let symbol: string | undefined;
    let decimals: number | undefined;
    try {
      symbol = await erc.symbol();
    } catch {}
    try {
      decimals = Number(await erc.decimals());
    } catch {}

    const meta: TokenMeta = { address: token, symbol, decimals };
    tokenMetaCache.current.set(key, meta);
    return meta;
  };

  const approveERC20 = async (
    token: `0x${string}`,
    spender: `0x${string}`,
    amount: bigint
  ) => {
    if (!ethersSigner) return null;
    const erc = getERC20(token, ethersSigner);
    const tx = await erc.approve(spender, amount);
    return await tx.wait();
  };

  const setOperatorCERC20 = async (
    token1: `0x${string}`,
    operator: `0x${string}`,
    expirySec: number
  ) => {
    if (!ethersSigner) return null;
    const c = getERC20(token1, ethersSigner);
    const fn = c.getFunction("setOperator");
    const expiry = BigInt(
      Math.floor(Date.now() / 1000) + Math.max(60, expirySec)
    );
    const tx = await fn(operator, expiry, { gasLimit: BigInt(500_000) });
    return await tx.wait();
  };

  const ensureDecryptionSignature = async (contracts: `0x${string}`[]) => {
    if (!fhevm || !ethersSigner) return null;
    return await FhevmDecryptionSignature.loadOrSign(
      fhevm,
      contracts,
      ethersSigner as ethers.Signer,
      decStorageRef.current
    );
  };

  const decryptHandles = async (
    items: { handle: string; contractAddress: `0x${string}` }[]
  ) => {
    if (!fhevm || !ethersSigner) return {};
    const uniqContracts = Array.from(
      new Set(items.map((i) => i.contractAddress))
    );
    const sig = await ensureDecryptionSignature(uniqContracts);
    if (!sig) return {};
    return await fhevm.userDecrypt(
      items,
      sig.privateKey,
      sig.publicKey,
      sig.signature,
      sig.contractAddresses,
      sig.userAddress,
      sig.startTimestamp,
      sig.durationDays
    );
  };

  const value: LunarysContextType = {
    provider,
    ethersProvider,
    signer: ethersSigner || null,
    chainId,
    account,
    fhevm,
    decStorage: decStorageRef.current,
    pools,
    getPoolByAddress,
    getPoolContract,
    getERC20,
    getTokenMeta,
    approveERC20,
    setOperatorCERC20,
    ensureDecryptionSignature,
    decryptHandles,
  };

  return (
    <LunarysContext.Provider value={value}>{children}</LunarysContext.Provider>
  );
}

export function useLunarys() {
  const ctx = useContext(LunarysContext);
  if (!ctx) throw new Error("useLunarys must be used within <LunarysProvider>");
  return ctx;
}
