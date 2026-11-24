import { network } from "hardhat";
import { mkdir, writeFile } from "node:fs/promises";

const { ethers } = await network.connect();
const [insurer, client, assessor] = await ethers.getSigners();
const insurance = await ethers.deployContract("CarInsurance", [], insurer);
await insurance.waitForDeployment();

const premium = ethers.parseEther("0.1");
const reserve = ethers.parseEther("1");
await (
  await insurance
    .connect(insurer)
    .createPolicy(
      client.address,
      assessor.address,
      "Toyota Corolla, 2020, DEMO-001",
      premium,
      { value: reserve },
    )
).wait();

const info = {
  contractAddress: await insurance.getAddress(),
  chainId: (await ethers.provider.getNetwork()).chainId.toString(),
  insurer: insurer.address,
  client: client.address,
  assessor: assessor.address,
  policyId: 1,
  premiumWei: premium.toString(),
  maxCoverageWei: reserve.toString(),
};
await mkdir("deployments", { recursive: true });
await writeFile("deployments/localhost.json", JSON.stringify(info, null, 2));
console.log(info);
