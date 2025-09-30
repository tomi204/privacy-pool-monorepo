# Relayer & Decryption Playbook

[← Back to the main README](../README.md)

Lunarys relies on fully homomorphic encryption (FHE) to preserve privacy during swaps. This guide documents the cryptographic handshake, the relayer integration, and operational best practices for keeping confidentiality intact.

## End-to-End Flow
1. **Client encryption**
   - `SwapPanel` (frontend) creates an encrypted input via `fhevm.createEncryptedInput(poolAddress, userAddress)`
   - The user-provided amount is added with `.add64(Number(value))`
   - `encrypt()` returns a tuple of `handles` (ciphertext references) and an `inputProof`
2. **On-chain escrow**
   - `PrivacyPoolV2.swapToken1ForToken0ExactOut` stores a `PendingSwap` snapshot (recipient, `minOut`, reserve state)
   - The encrypted amount is transferred using `CERC20.confidentialTransferFrom`, ensuring the pool contract receives the ciphertext
   - `FHE.requestDecryption` is invoked with the ciphertext handle and a callback selector pointing to `finalizeSwap`
3. **Relayer polling**
   - The frontend calls `fetch(`${relayerUrl}/v1/public-decrypt`)` with the ciphertext handle
   - Expected response payload:
     ```json
     {
       "response": [
         {
           "decrypted_value": "0x0000000000000000000000000000000000000000000000000000000000061a8",
           "signatures": ["0x…", "0x…"],
           "extra_data": "0x00"
         }
       ]
     }
     ```
   - HTTP 404/425/429/5xx responses are treated as transient and retried (`RELAYER_MAX_ATTEMPTS`, `RELAYER_POLL_INTERVAL_MS`)
4. **Proof construction**
   - `buildDecryptionProof` normalizes the signatures (65-byte binary), prefixes the count, and appends relayer `extra_data`
   - KMS signers and thresholds are fetched from the configured verifier contract (`KMS_VERIFIER_ABI`)
5. **Finalization**
   - The UI issues a `staticCall` to `finalizeSwap` with `(requestId, cleartextsBytes, proofBytes)` to verify slippage before sending a transaction
   - On-chain, `FHE.checkSignatures` validates signatures and extra data, then AMM math determines the USDC output
   - Reserves are updated, pending state is removed, and the recipient receives public tokens

## Configuration Reference
- `SwapPanel.tsx` → `getFheNetworkConfig(chainId)`
  - `relayerUrl`: default `https://relayer.testnet.zama.cloud`
  - `kmsContractAddress`: contract returning authorized signers
  - `aclContractAddress`: optional access-control list (available for future use)
  - `verifyingContractAddressDecryption`: EIP-712 domain verifying decryptions
- KMS thresholds and signers are read via `kmsContract.getThreshold()` and `kmsContract.getKmsSigners()`

## Operational Commands
- **Awaiting oracle results in tests**:
  ```bash
  cd packages/fhevm-hardhat-template
  npm test
  ```
  `test/PrivacyPool.ts` demonstrates `await fhevm.awaitDecryptionOracle()` for local verification.
- **Manual relayer checks** with `curl`:
  ```bash
  curl -X POST https://relayer.testnet.zama.cloud/v1/public-decrypt \
    -H 'Content-Type: application/json' \
    -d '{"ciphertextHandles":["0xhandle"],"extraData":"0x00"}'
  ```
- **Custom polling** (Node REPL example):
  ```bash
  node -e "(async () => {
    const fetch = (await import('node-fetch')).default;
    const res = await fetch('https://relayer.testnet.zama.cloud/v1/public-decrypt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ciphertextHandles: ['0xhandle'], extraData: '0x00' })
    });
    console.log(await res.text());
  })();"
  ```

## Troubleshooting Matrix
| Symptom | Likely Cause | Resolution |
| --- | --- | --- |
| `RelayerPendingError: Relayer not ready` | Signatures not yet aggregated | Wait for retries; confirm relayer availability |
| `Error: Relayer returned fewer signatures than required` | Threshold not met | Verify signer quorum via KMS contract; ensure relayer cluster is healthy |
| On-chain `Slippage()` revert during finalization | Market moved or decrypted amount below expectation | Increase slippage tolerance, re-run swap, ensure `PendingSwap` snapshot is current |
| `AmountTooSmall()` after decryption | Fees consumed entire encrypted input | Adjust minimum amount or reduce fee when configuring pool |
| Finalization never triggered | Frontend stopped polling or transaction failed | Inspect browser console for `finalizeSwap` errors; submit transaction manually via Hardhat if necessary |

## Extending the Relayer Layer
1. Update `getFheNetworkConfig` with new endpoints and verifying contracts.
2. Adjust `RELAYER_MAX_ATTEMPTS` and interval constants to align with infrastructure SLAs.
3. Consider persisting pending requests in IndexedDB (instead of in-memory state) if you expect users to navigate away while swaps settle.
4. For custom relayers, implement the same REST contract (`/v1/public-decrypt`) so existing frontend logic continues to work.

Continue with the [Testing & CI Guide](./testing-and-ci.md) to learn how we assert relayer behavior in automated suites.
