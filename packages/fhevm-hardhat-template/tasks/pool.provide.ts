import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

// ------------------------------
// Proveer liquidez con TOKEN0
// ------------------------------
task("task:provide0", "Provee liquidez con token0 (ERC20)")
  .addParam("amount", "Cantidad humana (ej: 1000.5)")
  .addOptionalParam("mintick", "minTick", "-120")
  .addOptionalParam("maxtick", "maxTick", "120")
  .addOptionalParam("pool", "Dirección del pool (default: deployments/PrivacyPoolV2)")
  .addOptionalParam("token0", "Dirección del token0 (default: USDC_SEPOLIA_ADDRESS)")
  .addOptionalParam("to", "Beneficiario del NFT (default: signer)")
  .addOptionalParam("ttl", "Segundos hasta el deadline (default: 3600)", "3600")
  .setAction(async (args: TaskArguments, hre) => {
    const { ethers, deployments } = hre;

    const poolAddr = args.pool ?? (await deployments.get("PrivacyPoolV2")).address;
    const TOKEN0_DEFAULT = (await import("../constants")).USDC_SEPOLIA_ADDRESS as string;
    const token0Addr = args.token0 ?? TOKEN0_DEFAULT;

    const [signer] = await ethers.getSigners();
    const to = (args.to ?? signer.address) as string;
    const ttl = Number(args.ttl ?? "3600");
    const deadline = BigInt(Math.floor(Date.now() / 1000) + ttl);

    const minTick = Number(args.mintick ?? -120);
    const maxTick = Number(args.maxtick ?? 120);

    const erc20 = await ethers.getContractAt("IERC20", token0Addr, signer);
    const pool = await ethers.getContractAt("PrivacyPoolV2", poolAddr, signer);

    const dec = 6;
    const amountWei = ethers.parseUnits(String(args.amount), dec);

    // approve
    const bal = await erc20.balanceOf(signer.address);
    if (bal < amountWei) throw new Error(`Saldo insuficiente: balance=${bal}, amount=${amountWei}`);
    console.log(`➡️  approve(${poolAddr}, ${amountWei})`);
    await (await erc20.approve(poolAddr, amountWei)).wait();

    // pre-cálculo (no gasta gas)
    const tokenIdStatic = await pool.provideLiquidityToken0.staticCall(minTick, maxTick, amountWei, to, deadline);
    console.log(`🔎 tokenId (static): ${tokenIdStatic}`);

    // ejecución
    console.log(`➡️  provideLiquidityToken0(${minTick}, ${maxTick}, ${amountWei}, ${to}, ${deadline})`);
    const tx = await pool.provideLiquidityToken0(minTick, maxTick, amountWei, to, deadline);
    console.log(`⏳ tx: ${tx.hash}`);
    const rc = await tx.wait();
    console.log(`✅ status=${rc?.status} gas=${rc?.gasUsed}`);

    try {
      const [r0, r1v] = await pool.getReserves();
      console.log(`📊 Reserves => token0: ${r0.toString()} | token1Virtual: ${r1v.toString()}`);
    } catch {}
  });

// ------------------------------
// Proveer liquidez con TOKEN1 (confidencial)
// ------------------------------
task("task:provide1", "Provee liquidez con token1 (confidencial, ERC-7984)")
  .addParam("amount", "Cantidad clara para shadow liquidity y virtual reserve (uint64, ej: 250000)")
  .addOptionalParam("mintick", "minTick", "-90")
  .addOptionalParam("maxtick", "maxTick", "90")
  .addOptionalParam("pool", "Dirección del pool (default: deployments/PrivacyPoolV2)")
  .addOptionalParam("token1", "Dirección del CERC20 (default: deployments/CERC20)")
  .addOptionalParam("to", "Beneficiario del NFT (default: signer)")
  .addOptionalParam("ttl", "Segundos hasta el deadline (default: 3600)", "3600")
  .setAction(async (args: TaskArguments, hre) => {
    const { ethers, deployments, fhevm } = hre;

    // Necesitamos cifrar, así que inicializamos la API del plugin
    await fhevm.initializeCLIApi();

    const poolAddr = args.pool ?? (await deployments.get("PrivacyPoolV2")).address;
    const token1Addr = args.token1 ?? (await deployments.get("CERC20")).address;

    const [signer] = await ethers.getSigners();
    const to = (args.to ?? signer.address) as string;
    const ttl = Number(args.ttl ?? "3600");
    const deadline = BigInt(Math.floor(Date.now() / 1000) + ttl);

    const minTick = Number(args.mintick ?? -90);
    const maxTick = Number(args.maxtick ?? 90);

    const amountClear = BigInt(args.amount);
    if (amountClear <= 0n) throw new Error("amount debe ser > 0");
    if (amountClear > BigInt("18446744073709551615")) {
      // 2^64 - 1
      throw new Error("amount excede uint64");
    }

    const pool = await ethers.getContractAt("PrivacyPoolV2", poolAddr, signer);
    const cerc20 = await ethers.getContractAt("CERC20", token1Addr, signer);

    // 1) El pool va a llamar token1.confidentialTransferFrom(msg.sender, pool, amount)
    //    Para eso, el usuario debe autorizar al pool como operador por tiempo limitado.
    const expiry = BigInt(Math.floor(Date.now() / 1000) + 2 * ttl);
    console.log(`➡️  setOperator(${poolAddr}, ${expiry}) en CERC20`);
    const txOp = await cerc20.setOperator(poolAddr, expiry);
    await txOp.wait();

    // 2) Preparamos el input encriptado para el POOL (no para el token)
    //    Debe matchear con la firma del usuario.
    const encrypted = await fhevm
      .createEncryptedInput(poolAddr, signer.address)
      .add64(Number(amountClear)) // monto confidencial uint64
      .encrypt();

    // 3) Pre-cálculo: staticCall para obtener el tokenId antes de ejecutar
    const tokenIdStatic = await pool.provideLiquidityToken1.staticCall(
      minTick,
      maxTick,
      encrypted.handles[0],
      Number(amountClear), // amount1Clear (mismo valor claro)
      to,
      encrypted.inputProof,
      deadline,
    );
    console.log(`🔎 tokenId (static): ${tokenIdStatic}`);

    // 4) Ejecutar provideLiquidityToken1
    console.log(
      `➡️  provideLiquidityToken1(${minTick}, ${maxTick}, <handle>, ${amountClear}, ${to}, <proof>, ${deadline})`,
    );
    const tx = await pool.provideLiquidityToken1(
      minTick,
      maxTick,
      encrypted.handles[0],
      Number(amountClear),
      to,
      encrypted.inputProof,
      deadline,
    );
    console.log(`⏳ tx: ${tx.hash}`);
    const rc = await tx.wait();
    console.log(`✅ status=${rc?.status} gas=${rc?.gasUsed}`);

    try {
      const [r0, r1v] = await pool.getReserves();
      console.log(`📊 Reserves => token0: ${r0.toString()} | token1Virtual: ${r1v.toString()}`);
    } catch {}
  });
