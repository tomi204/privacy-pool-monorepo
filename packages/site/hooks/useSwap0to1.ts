"use client";
import { ethers } from "ethers";

export function useSwap0to1(
  poolAddress: `0x${string}` | undefined,
  abi: any,
  signer: ethers.Signer | null | undefined
) {
  async function swap0to1(
    amountIn: bigint,
    minOut: bigint,
    recipient: string,
    deadlineSec: number
  ) {
    if (!poolAddress || !signer) throw new Error("No signer or pool");
    const pool = new ethers.Contract(poolAddress, abi, signer);
    const fn = pool.getFunction("swapToken0ForToken1");
    const tx = await fn(
      amountIn,
      minOut,
      recipient,
      BigInt(Math.floor(Date.now() / 1000) + deadlineSec)
    );
    return tx.wait();
  }
  return { swap0to1 };
}
