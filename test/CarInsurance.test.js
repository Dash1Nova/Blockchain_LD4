import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;

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

  it("sėkminga eiga: sukūrimas, pirkimas, žalos pateikimas ir patvirtinimas", async function () {
    const { insurance, insurer, client, assessor } = await setup();

    await insurance.connect(client).buyPolicy(1, {
      value: premium,
    });

    expect((await insurance.getPolicy(1)).state).to.equal(1n);

    await insurance.connect(client).submitClaim(1, claim, "Avarija");

    expect((await insurance.getPolicy(1)).state).to.equal(2n);

    const clientBefore = await ethers.provider.getBalance(client.address);
    const insurerBefore = await ethers.provider.getBalance(insurer.address);

    await insurance.connect(assessor).approveClaim(1);

    expect((await insurance.getPolicy(1)).state).to.equal(3n);
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

  it("tik klientas gali įsigyti jam skirtą polisą", async function () {
    const { insurance, stranger } = await setup();

    await expect(
      insurance.connect(stranger).buyPolicy(1, {
        value: premium,
      }),
    ).to.be.reverted;

    expect((await insurance.getPolicy(1)).state).to.equal(0n);
  });

  it("klientas negali patvirtinti žalos prašymo", async function () {
    const { insurance, client } = await setup();

    await insurance.connect(client).buyPolicy(1, {
      value: premium,
    });
    await insurance.connect(client).submitClaim(1, claim, "Avarija");
    await expect(insurance.connect(client).approveClaim(1)).to.be.reverted;

    expect((await insurance.getPolicy(1)).state).to.equal(2n);
  });

  it("svetimas asmuo negali patvirtinti žalos prašymo", async function () {
    const { insurance, client, stranger } = await setup();

    await insurance.connect(client).buyPolicy(1, {
      value: premium,
    });
    await insurance.connect(client).submitClaim(1, claim, "Avarija");
    await expect(insurance.connect(stranger).approveClaim(1)).to.be.reverted;

    expect((await insurance.getPolicy(1)).state).to.equal(2n);
  });

  it("vertintojas negali pateikti žalos prašymo kliento vardu", async function () {
    const { insurance, client, assessor } = await setup();

    await insurance.connect(client).buyPolicy(1, {
      value: premium,
    });

    await expect(insurance.connect(assessor).submitClaim(1, claim, "Avarija"))
      .to.be.reverted;

    expect((await insurance.getPolicy(1)).state).to.equal(1n);
  });

  it("svetimas asmuo negali atšaukti draudiko vardu", async function () {
    const { insurance, stranger } = await setup();

    await expect(insurance.connect(stranger).cancelByInsurer(1)).to.be.reverted;

    expect((await insurance.getPolicy(1)).state).to.equal(0n);
  });

  it("neleidžia sukurti poliso su nuline įmoka", async function () {
    const { insurance, client, assessor } = await setup();

    await expect(
      insurance.createPolicy(client.address, assessor.address, "Toyota", 0, {
        value: reserve,
      }),
    ).to.be.reverted;
  });

  it("neleidžia sukurti poliso, kai rezervas nėra didesnis už įmoką", async function () {
    const { insurance, client, assessor } = await setup();

    await expect(
      insurance.createPolicy(
        client.address,
        assessor.address,
        "Toyota",
        premium,
        { value: premium },
      ),
    ).to.be.reverted;
  });

  it("neleidžia sukurti poliso su nuliniu kliento adresu", async function () {
    const { insurance, assessor } = await setup();

    await expect(
      insurance.createPolicy(
        ethers.ZeroAddress,
        assessor.address,
        "Toyota",
        premium,
        { value: reserve },
      ),
    ).to.be.reverted;
  });

  it("neleidžia pateikti nulinės žalos sumos", async function () {
    const { insurance, client } = await setup();

    await insurance.connect(client).buyPolicy(1, {
      value: premium,
    });

    await expect(insurance.connect(client).submitClaim(1, 0, "Avarija")).to.be
      .reverted;

    expect((await insurance.getPolicy(1)).state).to.equal(1n);
  });

  it("neleidžia pateikti didesnės žalos nei maksimalus rezervas", async function () {
    const { insurance, client } = await setup();

    await insurance.connect(client).buyPolicy(1, {
      value: premium,
    });

    await expect(
      insurance
        .connect(client)
        .submitClaim(1, ethers.parseEther("1.1"), "Avarija"),
    ).to.be.reverted;

    expect((await insurance.getPolicy(1)).state).to.equal(1n);
  });

  it("neleidžia pateikti žalos be priežasties", async function () {
    const { insurance, client } = await setup();

    await insurance.connect(client).buyPolicy(1, {
      value: premium,
    });

    await expect(insurance.connect(client).submitClaim(1, claim, "")).to.be
      .reverted;
  });

  it("neleidžia pateikti žalos, kol polisas neįsigytas", async function () {
    const { insurance, client } = await setup();

    await expect(insurance.connect(client).submitClaim(1, claim, "Avarija")).to
      .be.reverted;

    expect((await insurance.getPolicy(1)).state).to.equal(0n);
  });

  it("neleidžia įsigyti poliso antrą kartą", async function () {
    const { insurance, client } = await setup();

    await insurance.connect(client).buyPolicy(1, {
      value: premium,
    });

    await expect(
      insurance.connect(client).buyPolicy(1, {
        value: premium,
      }),
    ).to.be.reverted;

    expect((await insurance.getPolicy(1)).state).to.equal(1n);
  });

  it("neleidžia pateikti antro žalos prašymo", async function () {
    const { insurance, client } = await setup();

    await insurance.connect(client).buyPolicy(1, {
      value: premium,
    });
    await insurance.connect(client).submitClaim(1, claim, "Avarija");
    await expect(
      insurance.connect(client).submitClaim(1, claim, "Kita avarija"),
    ).to.be.reverted;

    expect((await insurance.getPolicy(1)).state).to.equal(2n);
  });

  it("neleidžia patvirtinti žalos du kartus", async function () {
    const { insurance, client, assessor } = await setup();

    await insurance.connect(client).buyPolicy(1, {
      value: premium,
    });

    await insurance.connect(client).submitClaim(1, claim, "Avarija");
    await insurance.connect(assessor).approveClaim(1);
    await expect(insurance.connect(assessor).approveClaim(1)).to.be.reverted;

    expect((await insurance.getPolicy(1)).state).to.equal(3n);
  });

  it("vertintojas gali atmesti žalos prašymą", async function () {
    const { insurance, insurer, client, assessor } = await setup();

    await insurance.connect(client).buyPolicy(1, {
      value: premium,
    });

    await insurance.connect(client).submitClaim(1, claim, "Avarija");

    const insurerBefore = await ethers.provider.getBalance(insurer.address);

    await insurance.connect(assessor).rejectClaim(1);

    expect((await insurance.getPolicy(1)).state).to.equal(4n);

    expect(
      (await ethers.provider.getBalance(insurer.address)) - insurerBefore,
    ).to.equal(ethers.parseEther("1.1"));

    expect(
      await ethers.provider.getBalance(await insurance.getAddress()),
    ).to.equal(0n);
  });

  it("draudikas gali atšaukti dar neįsigytą polisą", async function () {
    const { insurance, insurer } = await setup();

    await expect(insurance.connect(insurer).cancelByInsurer(1))
      .to.emit(insurance, "PolicyCancelledByInsurer")
      .withArgs(1n, reserve);

    expect((await insurance.getPolicy(1)).state).to.equal(5n);

    expect(
      await ethers.provider.getBalance(await insurance.getAddress()),
    ).to.equal(0n);
  });

  it("klientas gali atšaukti aktyvų polisą ir atgauti 80 procentų įmokos", async function () {
    const { insurance, insurer, client } = await setup();

    await insurance.connect(client).buyPolicy(1, {
      value: premium,
    });

    const insurerBefore = await ethers.provider.getBalance(insurer.address);

    await expect(insurance.connect(client).cancelByClient(1))
      .to.emit(insurance, "PolicyCancelledByClient")
      .withArgs(1n, ethers.parseEther("0.08"), ethers.parseEther("1.02"));

    expect((await insurance.getPolicy(1)).state).to.equal(5n);

    expect(
      (await ethers.provider.getBalance(insurer.address)) - insurerBefore,
    ).to.equal(ethers.parseEther("1.02"));

    expect(
      await ethers.provider.getBalance(await insurance.getAddress()),
    ).to.equal(0n);
  });

  it("neleidžia klientui atšaukti dar neįsigyto poliso", async function () {
    const { insurance, client } = await setup();

    await expect(insurance.connect(client).cancelByClient(1)).to.be.reverted;

    expect((await insurance.getPolicy(1)).state).to.equal(0n);
  });
});
