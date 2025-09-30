# Testing & CI Guide

[← Back to the main README](../README.md)

Quality for Lunarys hinges on deterministic cryptography, so testing spans Solidity, TypeScript, and end-to-end UI flows. Use this playbook to keep regressions out of production.

## Test Suites Overview
- **Hardhat (Solidity + TypeScript)** — primary validation of AMM math, pending swap lifecycle, and NFT management (`packages/fhevm-hardhat-template/test/`)
- **Frontend Unit Tests** — Vitest is configured (`packages/site/vitest.config.ts`) and ready for component logic, though no tests ship by default yet
- **Manual Scenario Scripts** — Hardhat tasks in `packages/fhevm-hardhat-template/tasks/` replicate critical flows for staging or production smoke tests

## Running Contract Tests
```bash
cd packages/fhevm-hardhat-template
npm test
```
- Uses Hardhat Network with the FHE plugin.
- `test/PrivacyPool.ts` seeds pools, performs both swap directions, exercises liquidity provisioning, and asserts revert paths.
- `test/PositionNFT.ts` covers ERC-721 mechanics and permission propagation.
- `test/CERC20.ts` validates confidential token operations.

### Coverage
```bash
npm run coverage
```
Generates Solidity coverage with `solidity-coverage`, outputting reports under `packages/fhevm-hardhat-template/coverage/`.

## Frontend Testing (Optional Today)
Set up once you add component logic or hooks that benefit from isolated testing.
```bash
cd packages/site
npm install            # if you have not already
npm run test           # configure "test" script to call vitest
```
Recommended workflow:
1. Co-locate test files with components (`Component.test.tsx`).
2. Mock `useLunarys` to avoid real encryption requests.
3. Capture swap status state transitions to guarantee user feedback remains consistent.

## Continuous Integration Recommendations
- **Lint**: run `npm run lint` inside `packages/site` and `npm run lint` inside `packages/fhevm-hardhat-template` (Solhint + ESLint) during CI.
- **Build**: compile the frontend (`npm run build`) and TypeScript contracts (`npm run build:ts`) to catch type issues.
- **Tests**: execute `npm test` (contracts) on every pull request. Add Vitest once frontend coverage exists.
- **ABI Drift**: after deployments, run `npm run generate-abi` and commit the generated files to keep the UI synced.

## Reproducing Decryption in Tests
The Hardhat FHE plugin exposes helper utilities to simulate relayer behavior:
```ts
await fhevm.awaitDecryptionOracle();
```
Use this after triggering confidential swaps in tests to fast-forward pending decryptions.

## Debugging Failures
- `console.log` statements in tests surface swap math intermediates.
- `hardhat-gas-reporter` is enabled when `REPORT_GAS=1`; use it to monitor regression budgets.
- Stuck pending swaps usually signal a misconfigured relayer—check the Relayer guide for manual polling commands.

Return to the [Smart Contracts Guide](./contracts.md) or the [Frontend Implementation Guide](./frontend.md) if you need architectural context while debugging.
