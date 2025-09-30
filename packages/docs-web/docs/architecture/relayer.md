---
title: Relayer & Decryption
sidebar_position: 3
---

# Relayer & Decryption

Confidential → public swaps rely on an async decryption loop that combines on-chain state, the Lunarys relayer, and the `@fhevm/react` client. This page documents the full pipeline.

## Flow Overview
1. **Client encryption** — `SwapPanel` builds an encrypted input with `fhevm.createEncryptedInput(poolAddress, userAddress)` and calls `encrypt()` to obtain ciphertext handles plus proofs.
2. **Pending swap** — `PrivacyPoolV2.swapToken1ForToken0ExactOut` transfers the ciphertext, snapshots reserves, stores a `PendingSwap`, and triggers `FHE.requestDecryption` with `finalizeSwap` as the callback selector.
3. **Relayer polling** — The frontend posts the ciphertext handle to `https://relayer.testnet.zama.cloud/v1/public-decrypt` (configurable per chain). Retries occur for HTTP 404/425/429/5xx responses.
4. **Signature threshold** — The relayer returns decrypted plaintext, KMS signatures, and optional extra data. Threshold and signer set come from the configured KMS verifier contract.
5. **Proof assembly** — `buildDecryptionProof` concatenates signatures (65-byte format) and merges `extra_data`. The UI dry-runs `finalizeSwap` via `staticCall` before broadcasting the transaction.
6. **Finalization** — On-chain `FHE.checkSignatures` verifies signatures, invariant math computes USDC output, reserves update, and the recipient receives funds. The frontend surfaces success via toast notifications.

## Configuration
Defined in `SwapPanel.tsx`:
```ts
const config = {
  relayerUrl: "https://relayer.testnet.zama.cloud",
  kmsContractAddress: "0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC",
  aclContractAddress: "0x687820221192C5B662b25367F70076A37bc79b6c",
  verifyingContractAddressDecryption: "0xb6E160B1ff80D67Bfe90A85eE06Ce0A2613607D1",
};
```
Adjust per network by editing `getFheNetworkConfig`.

## API Reference
### `POST /v1/public-decrypt`
| Field | Type | Description |
| --- | --- | --- |
| `ciphertextHandles` | `string[]` | Hex handles (prefixed with `0x`) returned by `encrypt()` |
| `extraData` | `string` | Optional contextual data; defaults to `0x00` in Lunarys |

**Response**
```json
{
  "response": [
    {
      "decrypted_value": "0x0000000000000000000000000000000000000000000000000000000000061a8",
      "signatures": ["0x...", "0x..."],
      "extra_data": "0x00"
    }
  ]
}
```

When the relayer is not ready, it may return HTTP 404/425/429/5xx. Treat these codes as transient and retry with backoff. Non-JSON responses should raise errors surfaced in the UI status log.

## Troubleshooting
| Symptom | Resolution |
| --- | --- |
| `RelayerPendingError` keeps retrying | Confirm relayer availability, monitor HTTP codes in the browser console |
| `Slippage()` during finalization | Increase slippage tolerance or re-quote; reserves changed while pending |
| `AmountTooSmall()` | Fees consumed the decrypted amount—swap a larger amount |
| `NoPending(id)` | The request expired or was already finalized; resubmit the swap |

## Testing the Loop
`packages/fhevm-hardhat-template/test/PrivacyPool.ts` demonstrates how to simulate relayer behaviour locally:
```ts
await fhevm.awaitDecryptionOracle();
```
Use this helper after submitting confidential swaps in tests to complete pending decryptions automatically.

## Logging & Monitoring
- **Frontend:** watch the `status` string in `SwapPanel` for live updates. Integrate with browser devtools to confirm relayer payloads.
- **Contracts:** monitor `SwapConfidential` and `PendingSwap` storage (via `hardhat console`) to ensure request IDs match relayer responses.
- **Relayer:** instrument HTTP metrics (latency, error rate) and alert when retries exceed `RELAYER_MAX_ATTEMPTS`.

For operational scripts and CI guidance, head to [Testing & Operations](../operations/testing.md).
