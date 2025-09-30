# Lunarys Smart Contracts Guide

[← Back to the main README](../README.md)

This guide covers every on-chain component within the Lunarys protocol, the tooling that surrounds it, and the workflows you need to deploy, maintain, and extend the privacy-preserving AMM.

## Project Layout
- `packages/fhevm-hardhat-template/contracts/PrivacyPool.sol`: core AMM handling confidential swaps and liquidity
- `packages/fhevm-hardhat-template/contracts/PositionNFT.sol`: ERC-721 wrapper for encrypted liquidity positions
- `packages/fhevm-hardhat-template/contracts/tokens/CERC20.sol`: confidential token implementation (compiled via deployment scripts)
- `packages/fhevm-hardhat-template/deploy/`: Hardhat Deploy scripts (`deploy.ts`, `PrivacyPool.ts`) that seed local/testnet environments and emit ABI exports
- `packages/fhevm-hardhat-template/tasks/`: purpose-built operational scripts (`task:deposit0`, `task:provide1`, etc.)

## Environment Setup
1. Install repository dependencies from the monorepo root:
   ```bash
   npm install
   ```
2. Ensure Node.js 20+ and npm 9+ are present (Hardhat uses native fetch and FHE plugins that rely on them).
3. Export or configure the following variables before deploying beyond localhost:
   ```bash
   export MNEMONIC="your twelve words here"
   export INFURA_API_KEY="your-infura-project-id"
   export ETHERSCAN_API_KEY="optional-but-required-for-verify"
   ```
4. Confirm the FHE CLI binaries packaged with `@fhevm/hardhat-plugin` are accessible (the plugin bootstraps them automatically when you run Hardhat commands).

## Local Development Workflow
1. Launch the FHE-enabled Hardhat node from the repository root:
   ```bash
   npm run hardhat-node
   ```
   This proxies to `npx -w packages/fhevm-hardhat-template hardhat node --verbose` and emits the standard set of funded accounts.
2. Deploy and seed the Lunarys contracts:
   ```bash
   npm run deploy:hardhat-node
   ```
   The `deploy/PrivacyPool.ts` script performs these steps automatically:
   - Deploys `CERC20`, `PositionNFT`, and `PrivacyPoolV2`
   - Calls `postDeploy` to generate frontend ABI/address bindings
   - Transfers demo USDC liquidity and confidential balances to the pool
   - Runs `seedVirtualReserves` so invariant math lines up with the demo deposits
3. Inspect deployments under `packages/fhevm-hardhat-template/deployments/localhost` for addresses if you intend to call contracts manually, or open the Next.js frontend (`npm run dev:mock`) to test swaps instantly.

## Deployment Targets
### Localhost
Use when iterating on Solidity logic, verifying tests, or performing UI integration.
```bash
npm run deploy:hardhat-node
```
Outputs appear under `packages/fhevm-hardhat-template/deployments/localhost` and mirrored inside `packages/site/abi/`.

### Sepolia Testnet
1. Provide funded accounts in `MNEMONIC` and set `INFURA_API_KEY`.
2. Deploy with:
   ```bash
   npm run deploy:sepolia
   ```
3. Verify addresses under `packages/fhevm-hardhat-template/deployments/sepolia` and sync them to downstream services if necessary.
4. Optional: run `npx -w packages/fhevm-hardhat-template hardhat verify --network sepolia <address> <constructor args>` to publish source on Etherscan once environment variables are populated.

## Hardhat Task Catalog
Run tasks from the contracts package directory unless otherwise specified.

```bash
cd packages/fhevm-hardhat-template
```

- `npx hardhat task:init-pool-manager --network <network>`
  - Sets the deployed pool address as manager of `PositionNFT`
- `npx hardhat task:deposit0 --amount 250 --network <network>`
  - Transfers the public ERC-20 (`token0`) into the pool
- `npx hardhat task:deposit1 --amount 750000 --network <network>`
  - Encrypts the amount using the FHE CLI and executes `confidentialTransfer` to the pool
- `npx hardhat task:provide0 --amount 1000 --network <network>`
  - Provides liquidity on the USDC side and mints an NFT position
- `npx hardhat task:provide1 --amount 250000 --network <network>`
  - Same as above but using the confidential token and encrypted transfer handles

> Each task assumes ABI files are present. If you switch networks or redeploy, re-run `npm run generate-abi` from the repository root to regenerate TypeScript bindings.

## Contract Extensibility Checklist
1. **Modify Solidity source** in `contracts/`
2. **Run tests** to confirm behavior:
   ```bash
   npm test
   ```
3. **Deploy locally** (`npm run deploy:hardhat-node`) and validate via the UI
4. **Update documentation** here and in the main README with any new public interfaces
5. **Redeploy** to Sepolia and refresh the frontend `packages/site/abi` outputs

## Key Files and References
- `packages/fhevm-hardhat-template/contracts/PrivacyPool.sol` — constant-product AMM with pending decryption support
- `packages/fhevm-hardhat-template/contracts/PositionNFT.sol` — encrypted position receipts
- `packages/fhevm-hardhat-template/test/PrivacyPool.ts` — primary swap and liquidity test cases
- `packages/fhevm-hardhat-template/deploy/PrivacyPool.ts` — scripted seed logic mirroring test fixtures
- `packages/postdeploy/index.ts` — ABI/address generation used by deployment scripts

## Security and Operational Notes
- Re-run `seedVirtualReserves` only once; the contract guards against repeat calls but plan migrations accordingly.
- Confidential swap finalization depends on the relayer signatures; monitor `PendingSwap` entries if you extend the contract.
- All arithmetic uses uint64/uint112 casts—keep reserve values within bounds or adjust types before scaling liquidity.
- `PositionNFT` assigns FHE permissions during transfers; if you introduce shared custody, extend `_update` to handle multi-signer scenarios.

For frontend integration, continue with the [Frontend Implementation Guide](./frontend.md). For encryption specifics, read the [Relayer & Decryption Playbook](./relayer-and-decryption.md).
