import * as fs from "fs";
import * as path from "path";

type DeploymentInfo =
  | {
      abiJson: undefined;
      address: "0x0000000000000000000000000000000000000000";
      chainId: number;
      chainName: string;
    }
  | {
      abiJson: string;
      address: `0x{string}`;
      chainId: number;
      chainName: string;
    };

// --- Helpers ---------------------------------------------------------------

function deploymentFilePath(
  deploymentsDir: string,
  chainName: string,
  contractName: string
) {
  const dir = path.join(deploymentsDir, chainName);
  const file = path.join(dir, `${contractName}.json`);
  return { dir, file };
}

/// Lee deployments/<chain>/<contract>.json si existe; si no, devuelve “vacío”
function readDeployment(
  chainName: string,
  chainId: number,
  contractName: string,
  deploymentsDir: string
): DeploymentInfo {
  const { dir, file } = deploymentFilePath(
    deploymentsDir,
    chainName,
    contractName
  );

  if (!fs.existsSync(dir) || !fs.existsSync(file)) {
    return {
      abiJson: undefined,
      address: "0x0000000000000000000000000000000000000000",
      chainId,
      chainName,
    };
  }

  const obj = JSON.parse(fs.readFileSync(file, "utf-8"));
  return {
    abiJson: JSON.stringify({ abi: obj.abi }, null, 2),
    address: obj.address as `0x{string}`,
    chainId,
    chainName,
  };
}

function saveDeployments(
  abiJson: string,
  contractName: string,
  outputDir: string,
  sepoliaDeployment: DeploymentInfo,
  localhostDeployment: DeploymentInfo
) {
  const tsCode = `
/*
  This file is auto-generated.
  By commands: 'npx hardhat deploy' or 'npx hardhat node'
*/
export const ${contractName}ABI = ${abiJson} as const;
`.trimStart();

  const tsAddresses = `
/*
  This file is auto-generated.
  By commands: 'npx hardhat deploy' or 'npx hardhat node'
*/
export const ${contractName}Addresses = { 
  "${sepoliaDeployment.chainId}": { address: "${sepoliaDeployment.address}", chainId: ${sepoliaDeployment.chainId}, chainName: "sepolia" },
  "${localhostDeployment.chainId}": { address: "${localhostDeployment.address}", chainId: ${localhostDeployment.chainId}, chainName: "hardhat" }
};
`.trimStart();

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, `${contractName}ABI.ts`),
    tsCode,
    "utf-8"
  );
  fs.writeFileSync(
    path.join(outputDir, `${contractName}Addresses.ts`),
    tsAddresses,
    "utf-8"
  );

  console.log(`✅ Generated ${path.join(outputDir, `${contractName}ABI.ts`)}`);
  console.log(
    `✅ Generated ${path.join(outputDir, `${contractName}Addresses.ts`)}`
  );
  console.log(`✅ Localhost address: ${localhostDeployment.address}`);
  console.log(`✅ Sepolia address: ${sepoliaDeployment.address}`);
}

function resetIfNeeded(
  dep: DeploymentInfo,
  referenceABIJson: string | undefined
): DeploymentInfo {
  if ((dep.abiJson && dep.abiJson !== referenceABIJson) || !referenceABIJson) {
    console.log(`Reset ${dep.chainName}=${dep.chainId} ABI!`);
    return {
      ...dep,
      abiJson: undefined,
      address: "0x0000000000000000000000000000000000000000",
    };
  }
  return dep;
}

// --- Entry point -----------------------------------------------------------

export function postDeploy(chainName: string, contractName: string) {
  // Soportadas por tu flujo actual
  if (
    chainName !== "sepolia" &&
    chainName !== "localhost" &&
    chainName !== "hardhat"
  )
    return;

  const deploymentsDir = path.resolve("./deployments");

  let localhostDeployment = readDeployment(
    "localhost",
    31337,
    contractName,
    deploymentsDir
  );
  let sepoliaDeployment = readDeployment(
    "sepolia",
    11155111,
    contractName,
    deploymentsDir
  );

  // ABI de referencia: preferí la red objetivo; si no hay, fallback a la otra
  const targetIsLocal = chainName === "localhost" || chainName === "hardhat";
  let referenceABIJson = targetIsLocal
    ? localhostDeployment.abiJson
    : sepoliaDeployment.abiJson;
  if (!referenceABIJson)
    referenceABIJson = targetIsLocal
      ? sepoliaDeployment.abiJson
      : localhostDeployment.abiJson;

  if (!referenceABIJson) {
    throw new Error(
      `No ABI found for ${contractName}. Looked in sepolia and localhost. Did you deploy it?`
    );
  }

  // Normalizá si alguna side-network trae ABI distinto
  sepoliaDeployment = resetIfNeeded(sepoliaDeployment, referenceABIJson);
  localhostDeployment = resetIfNeeded(localhostDeployment, referenceABIJson);

  // Salida al front
  const outputDir = path.resolve("../site/abi");
  saveDeployments(
    referenceABIJson,
    contractName,
    outputDir,
    sepoliaDeployment,
    localhostDeployment
  );
}
