import { PrivacyPoolV2Addresses } from "@/abi/PrivacyPoolV2Addresses";

export type PoolMeta = {
  address: `0x${string}`;
  chainId: number;
  chainName: string;
};

export function getPoolsForChain(chainId?: number): PoolMeta[] {
  if (!chainId) return [];
  const entry =
    PrivacyPoolV2Addresses?.[
      String(chainId) as keyof typeof PrivacyPoolV2Addresses
    ];
  if (!entry || entry.address === "0x0000000000000000000000000000000000000000")
    return [];
  return [
    {
      address: entry.address as `0x${string}`,
      chainId: entry.chainId,
      chainName: entry.chainName,
    },
  ];
}
