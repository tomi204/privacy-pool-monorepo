import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

/**
 * Deposita token1 (CERC20) en el pool usando confidentialTransfer.
 *
 * Ejemplos:
 *   - npx hardhat --network sepolia task:deposit1 --amount 750000
 *   - npx hardhat --network sepolia task:deposit1 --amount 250000 --pool 0xPool --token1 0xCERC20
 *
 * Nota:
 *   Usa FHEVM para generar (handle, proof) y luego llama:
 *   CERC20.confidentialTransfer(address to, bytes32 handle, bytes proof)
 */
task("task:deposit1", "Transfiere token1 (CERC20, cifrado) al contrato del pool")
  .addParam("amount", "Cantidad uint64 (ej: 750000)")
  .addOptionalParam("pool", "Dirección del pool (default: deployments/PrivacyPoolV2)")
  .addOptionalParam("token1", "Dirección del CERC20 (default: deployments/CERC20)")
  .setAction(async function (args: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    // 1) Inicializar API CLI de FHE para poder cifrar inputs
    await fhevm.initializeCLIApi();

    // 2) Resolver direcciones
    const poolDeployment = args.pool ? { address: args.pool } : await deployments.get("PrivacyPoolV2");

    const token1Deployment = args.token1 ? { address: args.token1 } : await deployments.get("CERC20");

    console.log(`Pool :  ${poolDeployment.address}`);
    console.log(`Token1: ${token1Deployment.address}`);
    console.log(`Amount: ${args.amount} (uint64)`);

    // 3) Firmante y contrato
    const [signer] = await ethers.getSigners();
    const cerc20 = await ethers.getContractAt("CERC20", token1Deployment.address, signer);

    // 4) Generar input encriptado (uint64) para el CERC20
    const enc = await fhevm
      .createEncryptedInput(token1Deployment.address, signer.address)
      .add64(Number(args.amount))
      .encrypt();

    // 5) confidentialTransfer al pool
    console.log(`➡️  confidentialTransfer -> ${poolDeployment.address}`);
    const tx = await cerc20["confidentialTransfer(address,bytes32,bytes)"](
      poolDeployment.address,
      enc.handles[0],
      enc.inputProof,
    );
    console.log(`⏳ tx: ${tx.hash}`);
    const rc = await tx.wait();
    console.log(`✅ status=${rc?.status} gasUsed=${rc?.gasUsed?.toString()}`);

    // 6) (Opcional) mostrar reservas si el pool expone getReserves()
    try {
      const pool = await ethers.getContractAt("PrivacyPoolV2", poolDeployment.address, signer);
      const [r0, r1v] = await pool.getReserves();
      console.log(`📊 Reserves => token0: ${r0.toString()} | token1Virtual: ${r1v.toString()}`);
    } catch {
      // silencio si no existe getReserves o cambia
    }
  });
