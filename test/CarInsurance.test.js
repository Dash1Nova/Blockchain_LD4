import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("CarInsurance", function () {
  const premium = ethers.parseEther("0.1");
  const reserve = ethers.parseEther("1");
  const claim = ethers.parseEther("0.4");

  async function setup() {
    const [insurer, client, assessor, stranger] = await ethers.getSigners();
    const insurance = await ethers.deployContract("CarInsurance", [], insurer);
    await insurance.createPolicy(
      client.address,
      assessor.address,
      "Toyota Corolla, 2020, DEMO-001",
      premium,
      { value: reserve },
    );
    return { insurance, insurer, client, assessor, stranger };
  }

  it("sekminga eiga: pirkimas, pretenzija, patvirtinimas", async function () {
    const { insurance, insurer, client, assessor } = await setup();
    await insurance.connect(client).buyPolicy(1, { value: premium });
    await insurance.connect(client).submitClaim(1, claim, "Avarija");

    const clientBefore = await ethers.provider.getBalance(client.address);
    const insurerBefore = await ethers.provider.getBalance(insurer.address);
    await insurance.connect(assessor).approveClaim(1);

    expect((await insurance.getPolicy(1)).state).to.equal(3n); // PaidOut
    expect(
      (await ethers.provider.getBalance(client.address)) - clientBefore,
    ).to.equal(claim);
    expect(
      (await ethers.provider.getBalance(insurer.address)) - insurerBefore,
    ).to.equal(ethers.parseEther("0.7"));
    expect(
      await ethers.provider.getBalance(await insurance.getAddress()),
    ).to.equal(0n);
  });

  it("neleistinas veiksmas: ne ekspertas negali patvirtinti", async function () {
    const { insurance, client, stranger } = await setup();
    await insurance.connect(client).buyPolicy(1, { value: premium });
    await insurance.connect(client).submitClaim(1, claim, "Avarija");
    await expect(
      insurance.connect(stranger).approveClaim(1),
    ).to.be.revertedWith("Only assessor");
    expect((await insurance.getPolicy(1)).state).to.equal(2n); // liko ClaimSubmitted
  });

  it("neleistinas veiksmas: bloga imokos suma", async function () {
    const { insurance, client } = await setup();
    await expect(
      insurance.connect(client).buyPolicy(1, { value: 1n }),
    ).to.be.revertedWith("Wrong premium amount");
  });

  it("kliento atsaukimas grazina 80 % imokos", async function () {
    const { insurance, client } = await setup();
    await insurance.connect(client).buyPolicy(1, { value: premium });
    await expect(insurance.connect(client).cancelByClient(1))
      .to.emit(insurance, "PolicyCancelledByClient")
      .withArgs(1n, ethers.parseEther("0.08"), ethers.parseEther("1.02"));
    expect((await insurance.getPolicy(1)).state).to.equal(5n); // Cancelled
  });
});
