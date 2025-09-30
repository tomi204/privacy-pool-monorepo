"use client";
import { ethers } from "ethers";
import { toast } from "sonner";

const ERC20 = [
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
] as const;

export function useProvide0(
  poolAddress: `0x${string}` | undefined,
  token0Address: `0x${string}` | undefined,
  abi: any,
  signer: ethers.Signer | null | undefined
) {
  async function ensureApprove(amount: bigint) {
    if (!poolAddress || !token0Address || !signer)
      throw new Error("Missing deps");
    const t0 = new ethers.Contract(token0Address, ERC20, signer);
    const owner = await signer.getAddress();
    const current: bigint = await t0.allowance(owner, poolAddress);
    if (current >= amount) return;
    const tx = await t0.approve(poolAddress, amount);
    const receipt = await tx.wait();
    toast.success("Token approval granted");
    return receipt;
  }

  async function provide0(
    ticks: { min: number; max: number },
    amount: bigint,
    recipient: string,
    deadlineSec: number
  ) {
    if (!poolAddress || !signer) throw new Error("No signer or pool");
    const pool = new ethers.Contract(poolAddress, abi, signer);
    const fn = pool.getFunction("provideLiquidityToken0");

    // preview (opcional)
    await fn.staticCall(
      ticks.min,
      ticks.max,
      amount,
      recipient,
      BigInt(Math.floor(Date.now() / 1000) + deadlineSec)
    );

    // tx real
    const tx = await fn(
      ticks.min,
      ticks.max,
      amount,
      recipient,
      BigInt(Math.floor(Date.now() / 1000) + deadlineSec)
    );
    return tx.wait();
  }

  return { ensureApprove, provide0 };
}
