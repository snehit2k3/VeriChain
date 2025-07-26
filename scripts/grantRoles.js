const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const contractAddress = "0x98B0F48349Cac8f610C67F37B8219D0b4eA08080";

  const producerAddress = "0x34756e1E1B8BE8bc67D0bFD31BD5Be7E62d19860";
  const refineryAddress = "0x66B8AA2e7E3fa7b539e8be97E5b540123Bb95378";
  
  const [admin] = await ethers.getSigners();
  console.log(`Using Admin account: ${admin.address} to grant roles.`);

  const verichain = await ethers.getContractAt("VeriChain", contractAddress);

  const PRODUCER_ROLE = await verichain.PRODUCER_ROLE();
  const REFINERY_ROLE = await verichain.REFINERY_ROLE();
  
  console.log(`\nGranting PRODUCER_ROLE to ${producerAddress}...`);
  const tx1 = await verichain.grantRole(PRODUCER_ROLE, producerAddress);
  await tx1.wait(); // Wait for the transaction to be mined
  console.log(`...Role granted. Transaction hash: ${tx1.hash}`);

  console.log(`\nGranting REFINERY_ROLE to ${refineryAddress}...`);
  const tx2 = await verichain.grantRole(REFINERY_ROLE, refineryAddress);
  await tx2.wait();
  console.log(`...Role granted. Transaction hash: ${tx2.hash}`);
  
  console.log("\n✅ Role assignment complete on Sepolia.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});