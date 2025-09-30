---
title: Frontend Architecture
sidebar_position: 2
---

# Frontend Architecture

The `packages/site` workspace is a Next.js app that exposes the Lunarys UX. It bundles wallet onboarding, encrypted swap orchestration, and position management.

## Directory Highlights
- `app/` — App Router entrypoints (`page.tsx`, pool routes, providers)
- `components/` — UI primitives (SwapPanel, Provide panels, PositionList, Pool cards)
- `context/Lunarys.tsx` — Central FHEVM context exposing encryption helpers, pool registry, and decryption utilities
- `hooks/` — React hooks for signer management (`useReownEthersSigner`), pool data (`usePoolBasics`), liquidity approvals, and storage
- `abi/` — Auto-generated ABI and address bundles (created by Hardhat deploy scripts)

### Notable Pages
| Route | Component | Purpose |
| --- | --- | --- |
| `/` | `app/page.tsx` | Landing hero with pool summary cards and CTA buttons |
| `/pools` | `app/pools` | Directory of available pools based on generated addresses |
| `/pool/[address]` | `app/pool/[address]/page.tsx` | Main trading surface with swap and liquidity panels |
| `/pool/positions` | `app/pool/positions/page.tsx` | Confidential position dashboard |

## Provider Stack
Defined in `app/providers.tsx`:
1. `<AppKit>` — Reown/AppKit wallet modal
2. `<ReownEthersSignerProvider>` — Wraps wallet state and provides Ethers signers & readonly providers (mock RPC support for Hardhat)
3. `<InMemoryStorageProvider>` — Deterministic storage for FHE decryption signatures
4. `<LunarysProvider>` — Initializes `@fhevm/react`, exposes pool metadata, operator helpers, and `decryptHandles`

`LunarysProvider` value includes:
- `fhevm`: ready-to-use FHE instance
- `pools`: registry of known pools (per chain)
- `getPoolContract`, `getERC20`: contract factories with correct ABIs
- `approveERC20`, `setOperatorCERC20`: helper functions used across components
- `decryptHandles`: batches ciphertext handles and returns plaintext via relayer signatures

## Core Experiences
### Swap Panel (`components/pool/SwapPanel.tsx`)
- Public → Confidential: handles USDC approvals, runs invariant math, calls `swapToken0ForToken1`
- Confidential → Public: ensures pool operator permissions, encrypts input, submits `swapToken1ForToken0ExactOut`, polls the relayer, and finalizes swaps on success
- Shares status updates and toast notifications, with configurable slippage tolerance

### Liquidity Provisioning
- `ProvidePanel` — Approve and deposit USDC-only liquidity
- `ProvideConfidentialPanel` — Display encrypted balance handles, decrypt on demand, set operators, encrypt deposits, and call `provideLiquidityToken1`

### Position Management
- `components/pools/PositionList.tsx` — Fetch user NFTs, decrypt liquidity/token amounts via `decryptHandles`, and deep-link back into pool management
- `/pool/positions` — Dedicated dashboard for encrypted positions with hero copy aligned to Lunarys branding

### Supporting Hooks
| Hook | Location | Description |
| --- | --- | --- |
| `useReownEthersSigner` | `hooks/useReownEthersSigner.tsx` | Bridges AppKit account data to Ethers providers and signers |
| `usePoolBasics` | `hooks/usePoolBasics.tsx` | Reads token metadata, reserves, balances, and allowances for a given pool |
| `useProvide0` | `hooks/useProvide0.ts` | Encapsulates ERC-20 approvals and contract calls for public liquidity |
| `useInMemoryStorage` | `hooks/useInMemoryStorage.tsx` | Lightweight key-value store used by FHE signature caching |

## Configuration Touchpoints
- `context/Lunarys.tsx` — Update `DEFAULT_REGISTRY` for new pools per chain
- `components/pool/SwapPanel.tsx` — `getFheNetworkConfig` defines relayer endpoints, KMS verifier contract, and ACL address per chain
- `lib/pools.ts` — Reads `PrivacyPoolV2Addresses` exported from the contracts deployment

## Styling
- Tailwind CSS with project-specific theme tokens (dark background, cyan accents)
- Reusable primitives under `components/ui/`
- Lucide icons communicate encrypted states (Lock, Shield, Eye)

Continue with [Relayer & Decryption](relayer.md) to understand the off-chain hand-off that closes confidential swaps.
