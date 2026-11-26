const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [insurer, client, assessor] = await hre.ethers.getSigners();

  const insurance = await hre.ethers.deployContract("CarInsurance");
  await insurance.waitForDeployment();
  const contractAddress = await insurance.getAddress();
  console.log("CarInsurance įdiegta:", contractAddress);

  const premium = hre.ethers.parseEther("0.1");
  const reserve = hre.ethers.parseEther("1");
  await (
    await insurance.createPolicy(
      client.address,
      assessor.address,
      "Toyota Corolla, 2020, DEMO-001",
      premium,
      { value: reserve },
    )
  ).wait();
  console.log("Sukurtas pradinis demo polisas");

  const file = path.join(__dirname, "..", "deployments", "localhost.json");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    JSON.stringify(
      {
        contractAddress,
        chainId: 31337,
        insurer: insurer.address,
        client: client.address,
        assessor: assessor.address,
      },
      null,
      2,
    ),
  );
  console.log("Įrašyta į deployments/localhost.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
