---
title: Testing & Operations
sidebar_position: 1
---

# Testing & Operations

Confidence in Lunarys comes from automated coverage and operational runbooks. Use this page as your checklist before shipping changes.

## Contract Testing
```bash
cd packages/fhevm-hardhat-template
npm test          # Hardhat test suite
npm run coverage  # Solidity coverage
```
Key suites:
- `test/PrivacyPool.ts` — Swap math, pending swap lifecycle, liquidity provisioning, rewards
- `test/PositionNFT.ts` — NFT permissions, encrypted handle ownership
- `test/CERC20.ts` — Confidential token behaviour

Optional test flags:
- `REPORT_GAS=1 npm test` — capture gas usage
- `FORK_URL=<rpc> npm test --grep "Sepolia"` — run Sepolia fork tests when added

## Frontend Testing
Vitest is configured (see `packages/site/vitest.config.ts`). Add tests as UI logic grows:
```bash
cd packages/site
npm run test      # configure script to call vitest
```
Recommended patterns:
- Mock `useLunarys` to avoid real encryption
- Assert swap status transitions and error messaging
- Use `@testing-library/react` to simulate user flows around SwapPanel and PositionList

## CI Recommendations
- Lint: `npm run lint` (frontend) and `npm run lint` in `packages/fhevm-hardhat-template`
- Build: `npm run build` (frontend) and `npm run build:ts` (contracts)
- Tests: run contract suite on every pull request; add Vitest once coverage exists
- ABI drift: after deployments, execute `npm run generate-abi` and commit regenerated files

### Suggested GitHub Actions Matrix
| Job | Commands | Notes |
| --- | --- | --- |
| `contracts-test` | `npm install` → `cd packages/fhevm-hardhat-template` → `npm test` | Use Node.js 20 runner |
| `contracts-lint` | `npm run lint` (contracts) | Enables Solhint & ESLint |
| `frontend-ci` | `npm install` → `npm run lint` → `npm run build` | Ensures Next.js build passes |
| `docs` | `cd packages/docs-web` → `npm install` → `npm run build` | Catch doc regressions |

## Operational Playbook
1. Update contracts → run tests → deploy locally → validate in the frontend → document changes
2. Monitor relayer health; adjust polling constants in `SwapPanel.tsx` if latency or thresholds change
3. After redeployments, clear wallet caches (MetaMask/Reown) to avoid nonce and view-cache issues
4. Refresh `DEFAULT_REGISTRY` in `LunarysProvider` when adding new pools per chain

### Debugging Tips
- **Hardhat Console:** `npx hardhat console --network localhost` lets you inspect `_pending` swaps or reserves in real time.
- **Relayer Payloads:** enable `console.log` inside `fetchPublicDecryption` to capture raw responses when troubleshooting.
- **Next.js DevTools:** check the Network panel for `public-decrypt` calls and ensure they return HTTP 200 before finalizing swaps.

### Release Checklist
1. Bump package versions if publishing artifacts (contracts or SDK).
2. Run full CI matrix.
3. Deploy to localhost and Sepolia; record new addresses.
4. Regenerate ABIs (`npm run generate-abi`) and commit.
5. Update docs (deployments + tutorial) with new addresses.
6. Announce relayer maintenance windows if infrastructure changes.

Need an end-to-end walkthrough? Return to the [Quickstart](../quickstart.md) or follow the [End-to-End Tutorial](../tutorial.md).
