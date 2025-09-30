---
title: End-to-End Tutorial
sidebar_position: 4
---

# End-to-End Tutorial

This walkthrough combines contract deployments, frontend usage, and the relayer loop so you can experience Lunarys as a user and as an integrator.

## 1. Deployments at a Glance
| Contract | Sepolia Address | Role |
| --- | --- | --- |
| `PrivacyPoolV2` | `0x6686134CC77b9eB6D5926D3d9bEC62b1888F0A00` | Constant-product AMM bridging public USDC and encrypted balances |
| `PositionNFT` | `0x86D8eb5153670D4917EbCDb2fFAB859050AAaE60` | ERC-721 receipts for encrypted liquidity |
| `CERC20` | `0x1Bd921F250BB97631CAD1c87c53cd981668380e9` | Confidential token paired with USDC |
| `USDC` | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` | Public asset used by the pool |

Local deployments follow the same flow; addresses are regenerated each time you run the Hardhat scripts.

## 2. Local Setup
1. Install dependencies: `npm install`
2. Start the Hardhat node: `npm run hardhat-node`
3. Deploy and seed contracts: `npm run deploy:hardhat-node`
4. Launch the frontend: `npm run dev:mock`
5. Connect a wallet to chain ID `31337` and explore swaps, liquidity, and positions
6. Reset by rerunning the deploy script and `npm run generate-abi`

## 3. Sepolia Deployment
1. Export credentials (`MNEMONIC`, `INFURA_API_KEY`, optional `ETHERSCAN_API_KEY`)
2. Deploy with `npm run deploy:sepolia`
3. Regenerate ABIs and restart the frontend with `npm run dev`
4. Connect your wallet to Sepolia and interact with the deployed contracts listed above

## 4. Frontend Journeys
### Swap USDC → ctKN
1. On `/pool/<address>`, keep the default direction (USDC → ctKN)
2. Enter an amount and approve USDC if prompted
3. Submit the swap and observe immediate encrypted transfer
4. Inspect the browser console: you should see a toast confirming the transaction hash and gas usage

### Swap ctKN → USDC (Relayer Finalized)
1. Toggle direction to ctKN → USDC
2. Enter desired USDC output and authorize the pool as a temporary operator
3. Submit the swap, wait for relayer confirmation, and watch `finalizeSwap` deliver USDC
4. Monitor `Status` card messages: it will cycle through _Encrypting → Sending swap → Waiting for external decryption → Confirming_. Final state should read `✅ Confidential swap finalized`.
5. Optional: open Hardhat console (`npx hardhat console --network localhost`) and query `_pending(<requestId>)` to observe entries disappearing once finalized.

### Provide Liquidity
- `ProvidePanel` handles USDC-only deposits
- `ProvideConfidentialPanel` shows encrypted balances, decrypts on demand, encrypts deposits, and tracks status

### Manage Positions
1. Visit `/pool/positions`
2. Fetch your NFTs and click **Decrypt amounts** to view encrypted liquidity
3. Jump back to pools via the **Manage** shortcut or burn positions on-chain when finished
4. Under the hood, `decryptHandles` requests signatures from the FHE service. Capture the returned map in devtools to verify decrypted bigints.

## 5. Relayer Loop Summary
1. Frontend encrypts the confidential amount
2. `swapToken1ForToken0ExactOut` stores a `PendingSwap` and triggers `FHE.requestDecryption`
3. Frontend polls `https://relayer.testnet.zama.cloud/v1/public-decrypt`
4. Once a signature threshold is met, the UI assembles proofs and finalizes the swap
5. USDC is released and reserves are updated

### Manual Verification
- **Contract Logs:** Use `npx hardhat console --network localhost` and call `await ethers.getContractAt('PrivacyPoolV2', '<pool>').then(p => p.getReserves())` to verify reserve changes before and after swaps.
- **Relayer Request:** Manually call the relayer with `curl` (see Relayer doc) to ensure decrypted payload matches expectations.
- **Event Stream:** Listen for `SwapConfidential` via `ethers.js` to confirm both swap directions emit events.

## 6. Troubleshooting
| Issue | Action |
| --- | --- |
| Swap stuck pending | Check relayer status, retry, or resubmit |
| `Slippage()` revert | Increase tolerance or re-quote |
| Wallet showing zero balances after reset | Redeploy, regenerate ABIs, and clear wallet cache |
| `NoPending` during finalization | Request expired—resubmit the swap |

Continue exploring specific components via the architecture documentation or revisit the [Quickstart](quickstart.md) for setup commands.
