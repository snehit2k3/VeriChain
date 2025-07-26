const hre = require("hardhat");

async function main() {
 
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const VeriChain = await hre.ethers.getContractFactory("VeriChain");
  const veriChain = await VeriChain.deploy(deployer.address);

  await veriChain.waitForDeployment();

  const contractAddress = await veriChain.getAddress();
  console.log(`VeriChain contract deployed to: ${contractAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
