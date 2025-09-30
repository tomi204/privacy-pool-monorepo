export type Address = `0x${string}`;
export type Hash = `0x${string}`;

export function getErrorMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const anyErr = err as {
      message?: unknown;
      reason?: unknown;
      code?: unknown;
    };
    if (typeof anyErr?.reason === "string") return anyErr.reason;
    if (typeof anyErr?.message === "string") return anyErr.message;
    if (typeof anyErr?.code === "string") return anyErr.code;
  }
  return "Unknown error";
}

export interface PositionStruct {
  token0: Address;
  token1: Address;
  tickLower: number;
  tickUpper: number;
  liquidity: string; // euint64 handle -> hex/string
  token0Amount: string;
  token1Amount: string;
  isConfidential: boolean;
  createdAt: bigint;
  lastUpdated: bigint;
}

export interface UserPositionView {
  tokenId: bigint;
  position: PositionStruct;
}
