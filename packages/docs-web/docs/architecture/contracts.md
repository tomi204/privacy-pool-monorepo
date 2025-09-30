---
title: Smart Contracts
sidebar_position: 1
---

# Smart Contracts

The `packages/fhevm-hardhat-template` workspace contains everything required to deploy and maintain Lunarys on-chain. This section highlights the core contracts, scripts, and operational tooling.

## Project Layout
- `contracts/PrivacyPool.sol` — constant-product AMM implementing public→confidential and confidential→public swaps
- `contracts/PositionNFT.sol` — ERC-721 positions with encrypted liquidity handles
- `contracts/tokens/CERC20.sol` — confidential token paired with USDC (compiled during deploy)
- `deploy/PrivacyPool.ts` — Hardhat Deploy script that seeds liquidity and regenerates ABIs
- `tasks/` — CLI helpers (`task:deposit0`, `task:provide1`, etc.) for operational workflows

## Storage Summary
| Contract | Key State Variables | Notes |
| --- | --- | --- |
| `PrivacyPoolV2` | `token0`, `token1`, `fee`, `reserve0Last`, `reserve1VirtualLast`, `volumeEpoch`, `positionLiquidity`, `_pending` | Tracks public and virtual reserves, hourly volume, shadow liquidity, and pending decryptions |
| `PositionNFT` | `_positions`, `_userPositions`, `_tokenIdCounter`, `poolManager` | Persists encrypted position handles and owner lookups |
| `CERC20` | Inherited ERC-20 storage plus ciphertext allowances (via `setOperator`) | Handles encrypted balances and authorized operators |

Understanding storage is critical when reasoning about invariants, gas costs, and cross-contract data flow.

## `PrivacyPoolV2` Function Reference

### Administrative
| Function | Parameters | Description |
| --- | --- | --- |
| `constructor(address _token0, address _token1, uint24 _fee, int24 _tickSpacing, address _positionNFT, address initialOwner)` | Token addresses, fee (in ppm), tick spacing, NFT contract, owner | Initializes immutable configuration and domain separator |
| `seedVirtualReserves(uint112 r1Virtual)` | `r1Virtual` — initial virtual confidential reserve | Must run once after seeding actual balances; syncs invariant math |
| `mintLiquidity(...)` / `burnLiquidity(...)` | Owner-only helpers | Allow governance to pre-seed or retire positions |

### Swap Path (Public → Confidential)
| Function | Parameters | Notes |
| --- | --- | --- |
| `swapToken0ForToken1(uint256 amountIn, uint256 amountOutMin, address recipient, uint256 deadline)` | `amountIn` USDC, slippage floor, recipient, expiry | Transfers USDC in, computes output via x*y=k, emits encrypted transfer using `token1.confidentialTransfer` |

### Swap Path (Confidential → Public)
| Function | Parameters | Notes |
| --- | --- | --- |
| `swapToken1ForToken0ExactOut(externalEuint64 encryptedAmountIn, uint256 amountOutMin, address recipient, bytes inputProof, uint256 deadline)` | Ciphertext handle + proof, slippage floor, recipient, deadline | Stores `PendingSwap`, triggers `FHE.requestDecryption`, expects `finalizeSwap` later |
| `finalizeSwap(uint256 requestId, bytes cleartexts, bytes proof)` | Relayer request ID, decrypted payload, aggregated proof | Verifies signatures with `FHE.checkSignatures`, recomputes invariant, releases USDC |

### Liquidity Management
| Function | Parameters | Description |
| --- | --- | --- |
| `provideLiquidityToken0(int24 tickLower, int24 tickUpper, uint256 amount0, address recipient, uint256 deadline)` | Range bounds, USDC amount, NFT owner, expiry | Accepts USDC, wraps into encrypted handles, mints `PositionNFT` |
| `provideLiquidityToken1(int24 tickLower, int24 tickUpper, externalEuint64 encryptedAmountIn, uint256 amount1Clear, address recipient, bytes proof, uint256 deadline)` | Range, ciphertext, clear shadow amount, owner, proof, deadline | Transfers encrypted token1, mints NFT with encrypted token1 amount |
| `burnPosition(uint256 tokenId, uint256 deadline)` | NFT id, expiry | Returns public or confidential liquidity to owner and burns NFT |

### Analytics & Rewards
| Function | Description |
| --- | --- |
| `getReserves()` | Returns `(reserve0, reserve1Virtual, lastUpdated)` |
| `getEpochData()` | Returns hourly volume + epoch start timestamp |
| `claimRewards()` | Pays demo rewards in token0 based on `positionLiquidity` |

### Events & Errors
| Event | Meaning |
| --- | --- |
| `SwapConfidential(address sender, address recipient, bool zeroForOne)` | Emitted for both swap paths (direction indicated by `zeroForOne`) |
| `MintConfidential`, `BurnConfidential`, `RewardsClaimed` | Liquidity lifecycle notifications |

| Error | Trigger |
| --- | --- |
| `Expired` | Deadline surpassed |
| `Slippage` | Output fell below `minOut` |
| `AmountTooSmall` | Net amount collapsed to zero after fees |
| `NoPending(id)` | `finalizeSwap` called with unknown request |
| `AlreadySeeded` | `seedVirtualReserves` executed twice |

Leverage these errors when writing tests to validate failure scenarios.

## `PositionNFT` Highlights
- **FHE Permissions:** `_update` overrides ERC-721 transfers to call `FHE.allow` so new owners can decrypt stored handles.
- **Struct Schema:** `Position` stores token addresses, tick range, encrypted liquidity and token balances, confidentiality flag, and timestamps.
- **User Indexing:** `_userPositions` maintains owner → tokenIds mapping used by the frontend (`getUserPositions`).
- **Events:** `PositionCreated(tokenId, owner, token0, token1, tickLower, tickUpper, isConfidential)` and `PositionUpdated(tokenId, liquidity)` describe lifecycle changes relied upon by off-chain indexers.

## `CERC20` Integration Notes
- Implements the ERC-7984 confidential token interface expected by the FHE tooling.
- `setOperator(pool, expiry)` must be invoked before the pool can move user ciphertexts (handled automatically in UI and Hardhat tasks).
- `confidentialBalanceOf` returns a bytes32 handle; clients use `@fhevm/react` to decrypt.

## Deployment Scripts
Deploy locally or to Sepolia from the repository root:
```bash
npm run deploy:hardhat-node   # localhost
npm run deploy:sepolia        # sepolia
```
Each deploy script calls `postDeploy` to regenerate `packages/site/abi/*ABI.ts` and `*Addresses.ts` files consumed by the frontend.

## Hardhat Tasks
Run from `packages/fhevm-hardhat-template` to simulate user flows or perform maintenance:
```bash
npx hardhat task:init-pool-manager --network sepolia
npx hardhat task:deposit0 --amount 250 --network sepolia
npx hardhat task:deposit1 --amount 750000 --network sepolia
npx hardhat task:provide0 --amount 1000 --network sepolia
npx hardhat task:provide1 --amount 250000 --network sepolia
```

## Testing
Execute the full suite before shipping contract changes:
```bash
cd packages/fhevm-hardhat-template
npm test
npm run coverage
```
`test/PrivacyPool.ts` covers swaps, pending swaps, liquidity provisioning, and rewards. `test/PositionNFT.ts` focuses on permissions and state transitions.

Continue with [Frontend Architecture](frontend.md) to see how these contracts surface in the UI.
