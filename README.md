<p align="center">
  <img src="packages/site/public/iso-logo.svg" width="120" alt="Lunarys logo" />
</p>

# Lunarys Protocol Monorepo

Lunarys delivers a privacy-first automated market maker that blends public USDC liquidity with fully homomorphic encrypted balances. This monorepo packages every layer—smart contracts, relayer workflow, frontend UX, and test automation—so teams can stand up a confidential swap environment end to end.

---
## Full docs page [here](https://privacy-pool-monorepo-docs.vercel.app/docs/intro)

## Table of Contents
- [Project Overview](#project-overview)
- [Quick Start Tutorial](#quick-start-tutorial)
- [Documentation Suite](#documentation-suite)
- [Architecture Snapshot](#architecture-snapshot)
- [Workspace Command Index](#workspace-command-index)
- [Operational Checklist](#operational-checklist)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Project Overview
- `packages/fhevm-hardhat-template` — Hardhat project with `PrivacyPoolV2`, `PositionNFT`, deployment scripts, and a full regression test suite
- `packages/site` — Next.js application showcasing the Lunarys UX, wallet onboarding, encrypted swaps, and position management
- `packages/fhevm-react` — Helper bindings around `@fhevm/react` for decryption signatures and storage
- `packages/postdeploy` — Tooling that converts Hardhat deployments into TypeScript ABI/address bundles for the UI
- `scripts/` — Root orchestration (ABI generation, Hardhat node health checks, deployment helpers)

Minimum requirements: Node.js 20+, npm 9+, Git, and a wallet supported by Reown/AppKit or MetaMask. Sepolia deployments additionally require funded accounts, `MNEMONIC`, and `INFURA_API_KEY`.

## Quick Start Tutorial
1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Launch the FHE-enabled Hardhat node**
   ```bash
   npm run hardhat-node
   ```
   Verifies `http://127.0.0.1:8545` is free, then spawns Hardhat with the FHE plugin.
3. **Deploy and seed the protocol**
   ```bash
   npm run deploy:hardhat-node
   ```
   Runs all deploy scripts, seeds demo liquidity, and writes ABIs to `packages/site/abi/`.
4. **Start the Lunarys frontend**
   ```bash
   npm run dev:mock
   ```
   Visit `http://localhost:3000`, connect your wallet to chain ID `31337`, and explore swaps, liquidity, and position decryption.
5. **Regenerate ABIs after restarts**
   ```bash
   npm run generate-abi
   ```
   Use whenever you wipe deployments or switch networks.

Sepolia deployment:
```bash
export MNEMONIC="your twelve words"
export INFURA_API_KEY="your-infura-project-id"
npm run deploy:sepolia
```
Restart the frontend pointing to Sepolia once addresses refresh.

## Documentation Suite
Deep dives live under `docs/`. Each topic links back to this overview.

| Guide | Description |
| --- | --- |
| [End-to-End Tutorial](docs/end-to-end-tutorial.md) | Step-by-step walkthrough covering deployments, contract functions, frontend actions, and relayer finalization |
| [Smart Contracts Guide](docs/contracts.md) | Architecture, deployment workflows, Hardhat tasks, and extensibility notes |
| [Frontend Implementation Guide](docs/frontend.md) | Provider stack, UX flows, configuration touchpoints, and component structure |
| [Relayer & Decryption Playbook](docs/relayer-and-decryption.md) | Encryption pipeline, relayer integration, and troubleshooting matrix |
| [Testing & CI Guide](docs/testing-and-ci.md) | Test suites, coverage commands, and recommended CI guardrails |

## Architecture Snapshot
- **PrivacyPoolV2** (`packages/fhevm-hardhat-template/contracts/PrivacyPool.sol`)
  - Constant-product AMM supporting public→confidential swaps immediately and confidential→public swaps via async decryption
  - Maintains `PendingSwap` records, virtual reserves, and hourly volume analytics
  - Grants encrypted liquidity shares through `PositionNFT`
- **Relayer Loop** (documented in `SwapPanel.tsx`)
  - Encrypts confidential inputs client-side, requests off-chain decryption, polls `POST /v1/public-decrypt`, and finalizes swaps on-chain once signatures meet threshold
- **Frontend UX** (`packages/site/app/pool/[address]/page.tsx`)
  - Presents swap, public liquidity, and confidential liquidity panes side-by-side
  - Surfaces encrypted balance handles with decrypt-on-demand controls in `ProvideConfidentialPanel`
  - Lists NFT positions and decrypts them via `LunarysProvider.decryptHandles`

## Workspace Command Index
### Root-level scripts
- `npm run hardhat-node` — Start the local FHE Hardhat network
- `npm run deploy:hardhat-node` — Deploy contracts to localhost and regenerate ABIs
- `npm run deploy:sepolia` — Deploy to Sepolia (requires `MNEMONIC` + `INFURA_API_KEY`)
- `npm run generate-abi` — Rebuild `packages/site/abi/*` from the latest Hardhat deployments

### Contracts (`packages/fhevm-hardhat-template`)
```bash
cd packages/fhevm-hardhat-template
npm test            # Hardhat test suite
npm run coverage    # Solidity coverage report
npx hardhat task:init-pool-manager --network <network>
npx hardhat task:deposit0 --amount 250 --network <network>
npx hardhat task:deposit1 --amount 750000 --network <network>
npx hardhat task:provide0 --amount 1000 --network <network>
npx hardhat task:provide1 --amount 250000 --network <network>
```

### Frontend (`packages/site`)
```bash
cd packages/site
npm run dev:mock    # Next.js dev server (verifies Hardhat node)
npm run dev         # Standard Next.js dev server
npm run lint        # ESLint checks
npm run build       # Production build
npm run start       # Serve built assets
```

## Operational Checklist
1. Update contracts → run tests → deploy locally → confirm UI → document changes.
2. After each network deployment, run `npm run generate-abi` and commit regenerated files.
3. Monitor relayer health and adjust `RELAYER_MAX_ATTEMPTS` or endpoints in `SwapPanel.tsx` as infrastructure evolves.
4. Incorporate new pools into `DEFAULT_REGISTRY` (`packages/site/context/Lunarys.tsx`) so the UI exposes them immediately.
5. Keep wallet caches clean when restarting local nodes; see Troubleshooting.

## Troubleshooting
- **Nonce or cache mismatches (MetaMask / Reown)** — Restart the browser or clear wallet activity after resetting Hardhat; detailed steps live in the [Smart Contracts Guide](docs/contracts.md#local-development-workflow).
- **Confidential swap stuck pending** — Consult the [Relayer & Decryption Playbook](docs/relayer-and-decryption.md#troubleshooting-matrix) for polling tips and signature verification.
- **ABI mismatch** — Re-run `npm run generate-abi`; confirm `packages/fhevm-hardhat-template/deployments/*` contains the latest artifacts.
- **Missing positions** — Ensure `PositionNFTAddresses.ts` matches the active chain and decrypt handles through `PositionList` to verify connectivity.

## License
BSD-3-Clause-Clear. See `LICENSE` for full text.
