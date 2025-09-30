# Lunarys Frontend Implementation Guide

[← Back to the main README](../README.md)

This document explains the Next.js application that powers Lunarys, detailing how encrypted interactions surface in the UI, how wallet connectivity is orchestrated, and how to extend the interface safely.

## Application Structure
- `packages/site/app/`: App-router pages (`page.tsx`, pool views, providers)
- `packages/site/components/`: UI building blocks for pools, positions, and wallet interactions
- `packages/site/context/Lunarys.tsx`: Central context exposing FHEVM helpers, pool registry, and decryption utilities
- `packages/site/hooks/`: Abstractions for Ethers signers, pool data, approvals, and storage
- `packages/site/abi/`: Auto-generated ABIs and address maps produced by the Hardhat deploy scripts

## Bootstrapping the UI
1. Ensure contracts are deployed and ABIs generated (see the [Smart Contracts Guide](./contracts.md)).
2. Start the mock development server:
   ```bash
   npm run dev:mock
   ```
   - Verifies a Hardhat node is running
   - Serves at `http://localhost:3000`
   - Uses Turbopack for faster iteration
3. Alternative script without mock wiring:
   ```bash
   npm run dev
   ```
   Use when working against Sepolia or another pre-configured network with valid entries in `packages/site/abi/`.
4. Production build and preview:
   ```bash
   npm run build
   npm run start
   ```

## Provider Stack
Defined in `packages/site/app/providers.tsx`:
1. `<AppKit>` supplies the Reown wallet modal and network switching UX.
2. `<ReownEthersSignerProvider>` wraps wallet state, exposes Ethers providers, and optionally routes read calls through mock chains (`initialMockChains={{ 31337: "http://localhost:8545" }}`).
3. `<InMemoryStorageProvider>` gives deterministic storage for the FHEVM signatures.
4. `<LunarysProvider>` bootstraps `@fhevm/react`, loads pool registries, manages operator approvals, and exposes `decryptHandles` for confidential balances.

## Core User Journeys
### Swap Experience (`SwapPanel.tsx`)
- Detects wallet state and allowances via `usePoolBasics`
- Handles both swap directions with a single input:
  - **Public → Confidential**: calculates invariant outputs, requests USDC approval, and triggers `swapToken0ForToken1`
  - **Confidential → Public**: ensures operator status, encrypts the desired input, submits `swapToken1ForToken0ExactOut`, then polls the relayer and finalizes the swap on-chain
- Exposes status messaging (`setStatus`) and toast feedback for every step
- Includes slippage controls (basis points) and read-only output previews

### Liquidity Management
- `ProvidePanel.tsx` covers USDC-only deposits, previewing NFT IDs via `staticCall` before execution
- `ProvideConfidentialPanel.tsx` exposes encrypted balance handles, manual decryption, operator assignment, and confidential liquidity provisioning
- `PositionList.tsx` enumerates NFT positions, fetches handles, and decrypts them on demand with `decryptHandles`

### Navigation & Branding
- `/` provides the hero overview, active pool cards (`PoolList`), and quick access to positions
- `/pools` and `/pool/[address]` concentrate the trading experience with consistent copy and layout
- `/pool/positions` is a dedicated management hub for encrypted liquidity

## Configuration Touchpoints
- `packages/site/context/Lunarys.tsx`
  - Update `DEFAULT_REGISTRY` with new pools per chain
  - Override `relayerUrl`, `kmsContractAddress`, and ACL addresses as networks evolve
- `packages/site/lib/pools.ts`
  - Reads generated addresses; ensure `postDeploy` outputs align after each smart contract deployment
- Environment variables (Next.js) can be introduced via `.env.local` for additional runtime config if necessary

## Styling & Components
- Tailwind CSS classes define layout and theming; the design leans on high-contrast, privacy-focused visuals
- Reusable UI primitives live under `packages/site/components/ui/`
- Lucide icons communicate encrypted states (Lock, Shield, Eye) — prefer consistent iconography when adding flows

## Operational Commands
Run from `packages/site` when focusing on the frontend:
```bash
cd packages/site
npm run dev:mock     # Dev server with Hardhat verification
npm run lint         # ESLint (Next.js config)
npm run build        # Production bundle
test coming soon     # Add Vitest when UI logic grows
```

> Remember to run `npm run generate-abi` at the repository root whenever contract addresses change; the UI imports generated TypeScript constants directly.

## Extending the Interface
1. **Add components** under `packages/site/components/` and wire them into the relevant page in `app/`
2. **Expose data** via new hooks or context entries to keep logic reusable
3. **Maintain encryption integrity** by routing all `@fhevm/react` operations through `LunarysProvider`
4. **Document the change** in this guide and the main README so future contributors understand the UX expectation

For decryption internals, proceed to the [Relayer & Decryption Playbook](./relayer-and-decryption.md). Testing guidance is available in the [Testing & CI Guide](./testing-and-ci.md).
