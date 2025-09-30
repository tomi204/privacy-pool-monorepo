---
title: Quickstart
sidebar_position: 2
---

# Quickstart

This guide walks you through a full Lunarys environment, from installing dependencies to exercising encrypted swaps in the frontend. Complete each section before moving to the next.

## 1. Prerequisites
- Node.js 20+
- npm 9+
- Git
- Wallet compatible with Reown/AppKit or MetaMask
- Optional (Sepolia): funded account mnemonic, `INFURA_API_KEY`, and `ETHERSCAN_API_KEY`

Clone and install at the repository root:
```bash
npm install
```

### Environment Variables
Set these in your shell (or `.envrc`/`.env`) before deploying beyond localhost:

| Variable | Purpose | Default |
| --- | --- | --- |
| `MNEMONIC` | Twelve-word seed used by Hardhat deploy scripts | Hardhat test mnemonic when unset |
| `INFURA_API_KEY` | RPC endpoint for Sepolia deployments | _Required for Sepolia_ |
| `ETHERSCAN_API_KEY` | Enables contract verification | Optional |
| `REPORT_GAS` | When `1`, prints gas usage during Hardhat tests | `undefined` |

> Tip: keep a `.env.example` file checked into the repo and source the real values locally to avoid leaking credentials.

## 2. Local Development Loop
1. **Start the FHE-enabled Hardhat node**
   ```bash
   npm run hardhat-node
   ```
2. **Deploy and seed the protocol**
   ```bash
   npm run deploy:hardhat-node
   ```
   This script deploys `CERC20`, `PositionNFT`, and `PrivacyPoolV2`, seeds demo liquidity, and regenerates `packages/site/abi/*`.
3. **Launch the frontend**
   ```bash
   npm run dev:mock
   ```
   Open `http://localhost:3000`, connect your wallet to chain ID `31337`, and explore swaps, liquidity provisioning, and NFT positions.
4. **Regenerate ABIs after resets**
   ```bash
   npm run generate-abi
   ```
   Run whenever you restart the Hardhat node or redeploy contracts.

## 3. Sepolia Deployment Checklist
1. Export credentials:
   ```bash
   export MNEMONIC="twelve words here"
   export INFURA_API_KEY="your-infura-project-id"
   export ETHERSCAN_API_KEY="optional-for-verify"
   ```
2. Deploy:
   ```bash
   npm run deploy:sepolia
   ```
3. Regenerate ABIs (`npm run generate-abi`) so the frontend picks up fresh addresses.
4. Restart the frontend with `npm run dev` and connect your wallet to Sepolia (chain ID `11155111`).

## 4. Workspace Commands Reference
### Root
- `npm run hardhat-node` — Launch local FHE Hardhat network
- `npm run deploy:hardhat-node` — Deploy stack to localhost
- `npm run deploy:sepolia` — Deploy to Sepolia using Hardhat Deploy
- `npm run generate-abi` — Rebuild `packages/site/abi/*`

### Contracts (`packages/fhevm-hardhat-template`)
```bash
cd packages/fhevm-hardhat-template
npm test
npm run coverage
npx hardhat task:init-pool-manager --network <network>
npx hardhat task:deposit0 --amount 250 --network <network>
npx hardhat task:deposit1 --amount 750000 --network <network>
npx hardhat task:provide0 --amount 1000 --network <network>
npx hardhat task:provide1 --amount 250000 --network <network>
```

### Frontend (`packages/site`)
```bash
cd packages/site
npm run dev:mock
npm run dev
npm run lint
npm run build
npm run start
```

### Hardhat Accounts (Local Node)
When you run `npm run hardhat-node`, Hardhat prints a deterministic list of funded accounts. The first ten addresses map to the standard test mnemonic:

| Index | Address | Private Key |
| --- | --- | --- |
| 0 | `0xf39F...92266` | `0xac09...f80` |
| 1 | `0x7099...5fFD` | `0x59c6...a15` |
| 2 | `0x3C44...9dEa` | `0x5de5...d63` |
| ... | ... | ... |

Import one of these keys into your wallet when testing locally.

## 5. Next Steps
- Review [Deployments](deployments.md) for current contract addresses
- Dive into [Architecture → Smart Contracts](architecture/contracts.md) to understand `PrivacyPoolV2`
- Follow the [End-to-End Tutorial](tutorial.md) for a narrative walkthrough of Lunarys in action
