# Lunarys End-to-End Tutorial

[← Back to the main README](../README.md)

This tutorial walks through the deployed Lunarys stack, explains the role of every contract, and shows how to exercise the encrypted swap flow from the frontend. Follow the chapters in order for a complete understanding of the system.

---

## 1. Know Your Deployments
The latest public deployment lives on Sepolia. Use these addresses whenever you interact with the testnet environment.

| Contract | Address (Sepolia) | Purpose |
| --- | --- | --- |
| `PrivacyPoolV2` | `0x6686134CC77b9eB6D5926D3d9bEC62b1888F0A00` | Constant-product AMM that bridges public USDC and encrypted balances |
| `PositionNFT` | `0x86D8eb5153670D4917EbCDb2fFAB859050AAaE60` | ERC-721 wrapper holding encrypted liquidity positions |
| `CERC20` | `0x1Bd921F250BB97631CAD1c87c53cd981668380e9` | Confidential token minted for Lunarys (ERC-7984 implementation) |
| `USDC (testnet)` | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` | Public side of the pool (imported constant) |

> The same scripts can deploy to a local Hardhat node. After each run, regenerate bindings with `npm run generate-abi`; local addresses are stored under `packages/fhevm-hardhat-template/deployments/localhost` and mirrored in `packages/site/abi/*Addresses.ts`.

### 1.1 Core Contract Functions
**PrivacyPoolV2**
- `seedVirtualReserves(uint112 r1Virtual)` — bootstrap virtual reserves once per deployment
- `swapToken0ForToken1(uint256 amountIn, uint256 amountOutMin, address recipient, uint256 deadline)` — swap public USDC into encrypted liquidity
- `swapToken1ForToken0ExactOut(externalEuint64 encryptedAmountIn, uint256 amountOutMin, address recipient, bytes proof, uint256 deadline)` — initiate encrypted → public swap (async)
- `finalizeSwap(uint256 requestId, bytes cleartexts, bytes proof)` — finalize pending swaps using relayer signatures
- `provideLiquidityToken0(...)` / `provideLiquidityToken1(...)` — mint liquidity NFTs for public or confidential deposits
- `burnPosition(uint256 tokenId, uint256 deadline)` — burn a position and withdraw tokens
- `claimRewards()` — sample rewards faucet tied to shadow liquidity accounting

**PositionNFT**
- `setPoolManager(address pool)` — authorize the pool to mint and burn NFTs
- `mint(...)` / `mintEmpty(...)` — create liquidity NFTs with encrypted handles
- `burn(uint256 tokenId)` — destroy positions once liquidity is removed
- `getPosition(uint256 tokenId)` / `getUserPositions(address)` — frontend-read functions for listing positions

**CERC20** (subset)
- `confidentialTransfer(address to, bytes32 handle, bytes proof)` — send encrypted amounts
- `confidentialTransferFrom(address from, address to, bytes32 handle, bytes proof)` — spend encrypted amounts on behalf of a user
- `setOperator(address operator, uint256 expiry)` — grant swap contracts permission to move ciphertexts
- `confidentialBalanceOf(address owner)` — return balance handle (ciphertext reference)

Keep these signatures handy when building call scripts or verifying ABI integrations.

---

## 2. Local Environment Walkthrough
1. **Clone and install dependencies**
   ```bash
   npm install
   ```
2. **Open Terminal A**: start the Hardhat node with FHE support
   ```bash
   npm run hardhat-node
   ```
   The helper script confirms no other JSON-RPC client is running at `http://127.0.0.1:8545` before launching.
3. **Open Terminal B**: deploy and seed the protocol
   ```bash
   npm run deploy:hardhat-node
   ```
   What happens under the hood:
   - Deploy `CERC20`, `PositionNFT`, and `PrivacyPoolV2`
   - Set the pool as `PositionNFT` manager and seed both reserves
   - Call `postDeploy` to regenerate `packages/site/abi/*`
4. **Start the frontend**
   ```bash
   npm run dev:mock
   ```
   Navigate to `http://localhost:3000`, connect to chain ID `31337`, and explore.
5. **Resetting**
   - Stop Hardhat → start again → redeploy → `npm run generate-abi`
   - Clear wallet caches (MetaMask/Reown) when chain state resets to avoid nonce and view-cache drift.

---

## 3. Sepolia Deployment Checklist
1. Fund the mnemonic account with Sepolia ETH.
2. Export credentials:
   ```bash
   export MNEMONIC="your twelve words"
   export INFURA_API_KEY="your-infura-project-id"
   ```
3. Deploy:
   ```bash
   npm run deploy:sepolia
   ```
4. Verify addresses inside `packages/fhevm-hardhat-template/deployments/sepolia/*.json` and regenerate front-end bindings (`npm run generate-abi`) if needed.
5. Switch your wallet to Sepolia, open the frontend with `npm run dev`, and interact using the deployed contracts listed in Section 1.

---

## 4. Frontend Tutorial
### 4.1 Connection & Pool Overview
1. Launch the app (`npm run dev:mock` or `npm run dev`).
2. Click **Connect Wallet** and approve the Reown/AppKit modal.
3. Ensure the chain matches your target (Hardhat `31337` or Sepolia `11155111`).
4. The home page displays current pools from `DEFAULT_REGISTRY` (see `packages/site/context/Lunarys.tsx`). Click through to `/pool/<address>` to access detailed controls.

### 4.2 Public → Confidential Swap
1. In the **Swap** panel, keep the default direction (USDC → ctKN).
2. Enter an input amount; the UI quotes the encrypted output after fees.
3. If prompted, approve USDC spending (handled by `ensureAllowance`).
4. Click **Swap USDC → ctKN**. The pool transfers encrypted liquidity to your wallet immediately; no relayer needed.

### 4.3 Confidential → Public Swap (Finalized via Relayer)
1. Toggle the swap direction (ctKN → USDC).
2. Enter the desired public output amount; the UI computes the required encrypted input.
3. When requested, authorize the pool as operator for ctKN (`setOperatorCERC20`).
4. Submit the swap. The UI encrypts the amount, sends `swapToken1ForToken0ExactOut`, and polls the relayer.
5. Watch the status log: once thresholds are met, the app finalizes the swap and transfers USDC to your wallet.

### 4.4 Providing Liquidity
- **USDC only** (`ProvidePanel`)
  1. Enter amount, tick range, and optional deadline.
  2. Approve USDC if required.
  3. Submit to mint a `PositionNFT` representing your deposit.

- **Confidential liquidity** (`ProvideConfidentialPanel`)
  1. Inspect your encrypted balance handle (decrypt if desired).
  2. Set tick range and clear amount (uint64).
  3. The UI encrypts, assigns operator rights, submits `provideLiquidityToken1`, and logs status updates.

### 4.5 Managing Positions
1. Open `/pool/positions`.
2. Fetch your NFTs via `PositionList`.
3. Click **Decrypt amounts** on any position to reveal encrypted liquidity, token0, and token1 values using `decryptHandles`.
4. Use the **Manage** link to jump back into pool tooling or call `burnPosition` when ready to exit.

---

## 5. Relayer & Decryption Flow
1. **Ciphertext capture** — swap panel encrypts user intent with `@fhevm/react`.
2. **Pending swap** — `PrivacyPoolV2` records `PendingSwap` (recipient, `minOut`, reserve snapshot) and triggers `FHE.requestDecryption`.
3. **Relayer polling** — frontend posts the ciphertext handle to `https://relayer.testnet.zama.cloud/v1/public-decrypt` (configurable per chain).
4. **Signature threshold** — results include decrypted plaintext plus signatures from KMS nodes. Threshold metadata is fetched via `KMS_VERIFIER_ABI`.
5. **Proof building** — `buildDecryptionProof` assembles the payload; the frontend dry-runs `finalizeSwap` using `staticCall` for safety.
6. **Finalization** — the actual transaction executes `finalizeSwap`, releases USDC, updates reserves, and resolves the toast notifications.

Refer to [Relayer & Decryption Playbook](./relayer-and-decryption.md) for deeper troubleshooting tips.

---

## 6. Troubleshooting Cheatsheet
| Issue | Resolution |
| --- | --- |
| Swap stuck on "waiting for external decryption" | Confirm relayer availability, check browser console for HTTP codes, ensure signatures meet threshold |
| `Slippage()` revert while finalizing | Increase slippage tolerance or re-quote the swap; reserves may have changed |
| Wallet shows zero balances after restart | Reset Hardhat, redeploy, regenerate ABIs, and reload the frontend; clear wallet cache if necessary |
| `NoPending(id)` revert | Do not reuse stale request IDs; resend the confidential swap if the prior transaction reverted |

---

## 7. Additional References
- [Smart Contracts Guide](./contracts.md)
- [Frontend Implementation Guide](./frontend.md)
- [Testing & CI Guide](./testing-and-ci.md)

You now have the full Lunarys workflow—from contract addresses to encrypted finalization—in your toolkit. Iterate, customize, and extend with confidence.
