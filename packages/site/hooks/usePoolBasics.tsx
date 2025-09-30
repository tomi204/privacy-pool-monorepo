"use client";
import { useEffect, useRef, useState } from "react";
import { ethers } from "ethers";
import { PrivacyPoolV2ABI } from "@/abi/PrivacyPoolV2ABI";

const ERC20 = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
] as const;

const ERC7984_MIN = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function setOperator(address,uint256)",
] as const;

export function usePoolBasics(
  poolAddress: `0x${string}` | undefined,
  providerRead: ethers.ContractRunner | undefined,
  user?: string
) {
  const [loading, setLoading] = useState(false);
  const [sym0, setSym0] = useState("TOKEN0");
  const [sym1, setSym1] = useState("TOKEN1");
  const [dec0, setDec0] = useState(6);
  const [dec1, setDec1] = useState(6);
  const [fee, setFee] = useState<number>(3000);
  const [r0, setR0] = useState<bigint>(BigInt(0));
  const [r1v, setR1v] = useState<bigint>(BigInt(0));
  const [bal0, setBal0] = useState<bigint>(BigInt(0));
  const [bal1, setBal1] = useState<bigint>(BigInt(0));
  const [allow0, setAllow0] = useState<bigint>(BigInt(0));

  const poolRef = useRef<ethers.Contract | null>(null);
  const token0Ref = useRef<ethers.Contract | null>(null);
  const token1Ref = useRef<ethers.Contract | null>(null);

  useEffect(() => {
    (async () => {
      if (!poolAddress || !providerRead) return;
      setLoading(true);
      try {
        const pool = new ethers.Contract(
          poolAddress,
          PrivacyPoolV2ABI.abi,
          providerRead
        );
        poolRef.current = pool;

        const token0 = await pool.getFunction("token0")();
        const token1 = await pool.getFunction("token1")();

        const t0 = new ethers.Contract(token0, ERC20, providerRead);
        const t1 = new ethers.Contract(token1, ERC7984_MIN, providerRead);
        token0Ref.current = t0;
        token1Ref.current = t1;

        const [s0, s1] = await Promise.all([t0.symbol(), t1.symbol()]);
        setSym0(s0);
        setSym1(s1);
        const [d0, d1] = await Promise.all([
          t0.decimals(),
          t1.decimals().catch(() => 6),
        ]);
        setDec0(Number(d0));
        setDec1(Number(d1) || 6);

        const feeVal: number = await pool.getFunction("fee")();
        setFee(Number(feeVal));

        const [R0, R1v] = await pool.getFunction("getReserves")();
        setR0(BigInt(R0));
        setR1v(BigInt(R1v));

        if (user) {
          const [b0, b1, a0] = await Promise.all([
            t0.balanceOf(user),
            (async () => {
              try {
                return await t0.balanceOf(user);
              } catch {
                return BigInt(0);
              }
            })(),
            t0.allowance(user, poolAddress),
          ]);
          setBal0(b0 as bigint);
          setBal1(b1 as bigint);
          setAllow0(a0 as bigint);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [poolAddress, providerRead, user]);

  return {
    loading,
    poolRef,
    token0Ref,
    token1Ref,
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
  };
}
