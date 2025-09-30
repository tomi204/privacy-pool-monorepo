import { ethers } from "ethers";
export const fmt = (v: bigint, dec: number, max = 6) =>
  Number(ethers.formatUnits(v, dec)).toLocaleString("en-US", {
    maximumFractionDigits: max,
  });
