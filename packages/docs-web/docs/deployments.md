---
title: Deployments
sidebar_position: 3
---

# Deployments

The Lunarys protocol currently supports a local Hardhat environment and Sepolia testnet. Use the addresses below when wiring integrations or testing against public infrastructure.

## Sepolia (chainId 11155111)
| Contract | Address | Description |
| --- | --- | --- |
| `PrivacyPoolV2` | `0x6686134CC77b9eB6D5926D3d9bEC62b1888F0A00` | Constant-product AMM bridging public USDC and encrypted balances |
| `PositionNFT` | `0x86D8eb5153670D4917EbCDb2fFAB859050AAaE60` | ERC-721 receipts tracking encrypted liquidity positions |
| `CERC20` | `0x1Bd921F250BB97631CAD1c87c53cd981668380e9` | Confidential token paired with USDC in the pool |
| `USDC` | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` | Public asset used by the pool |

> Deploying with `npm run deploy:sepolia` regenerates these values in `packages/fhevm-hardhat-template/deployments/sepolia/*.json` and mirrors them into `packages/site/abi/*Addresses.ts`.

### Verifying Contracts on Etherscan
After deployment, verify bytecode to aid integrators:

```bash
cd packages/fhevm-hardhat-template
npx hardhat verify --network sepolia \
  0x6686134CC77b9eB6D5926D3d9bEC62b1888F0A00 \
  0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238 \
  0x1Bd921F250BB97631CAD1c87c53cd981668380e9 \
  3000 60 \
  0x86D8eb5153670D4917EbCDb2fFAB859050AAaE60 \
  0xYourDeployerAddress
```

Replace the constructor parameters as needed. Repeat for `PositionNFT` and `CERC20` using their respective arguments.

## Localhost (Hardhat, chainId 31337)
Addresses are generated on demand when you run:
```bash
npm run hardhat-node
npm run deploy:hardhat-node
npm run generate-abi
```
Find artifacts under `packages/fhevm-hardhat-template/deployments/localhost` and the corresponding TypeScript bindings in `packages/site/abi/*`.

Always reload the frontend after redeploying to ensure it picks up fresh addresses.
