const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EscrowContract", function () {
  let escrowContract;
  let owner, oracle, buyer, seller;

  const DESTINATION_GPS = "-6.2088,106.8456";
  const MIN_TEMP = 0;
  const MAX_TEMP = 3000;
  const ESCROW_AMOUNT = ethers.parseEther("1.0");

  beforeEach(async function () {
    [owner, oracle, buyer, seller] = await ethers.getSigners();

    const EscrowContract = await ethers.getContractFactory("EscrowContract");
    escrowContract = await EscrowContract.deploy(oracle.address);
    await escrowContract.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await escrowContract.owner()).to.equal(owner.address);
    });

    it("Should set the right oracle", async function () {
      expect(await escrowContract.oracle()).to.equal(oracle.address);
    });

    it("Should start with 0 escrows", async function () {
      expect(await escrowContract.escrowCounter()).to.equal(0);
    });
  });

  describe("Create Escrow", function () {
    it("Should create escrow with correct parameters", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      const tx = await escrowContract.connect(buyer).createEscrow(
        seller.address,
        DESTINATION_GPS,
        MIN_TEMP,
        MAX_TEMP,
        deadline,
        { value: ESCROW_AMOUNT }
      );

      await expect(tx)
        .to.emit(escrowContract, "EscrowCreated")
        .withArgs(1, buyer.address, seller.address, ESCROW_AMOUNT, DESTINATION_GPS, deadline);

      const escrow = await escrowContract.getEscrow(1);
      expect(escrow.buyer).to.equal(buyer.address);
      expect(escrow.seller).to.equal(seller.address);
      expect(escrow.amount).to.equal(ESCROW_AMOUNT);
      expect(escrow.destinationGPS).to.equal(DESTINATION_GPS);
      expect(escrow.status).to.equal(1);
    });

    it("Should fail if seller is zero address", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      await expect(
        escrowContract.connect(buyer).createEscrow(
          ethers.ZeroAddress,
          DESTINATION_GPS,
          MIN_TEMP,
          MAX_TEMP,
          deadline,
          { value: ESCROW_AMOUNT }
        )
      ).to.be.revertedWith("Seller address cannot be zero");
    });

    it("Should fail if amount is zero", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      await expect(
        escrowContract.connect(buyer).createEscrow(
          seller.address,
          DESTINATION_GPS,
          MIN_TEMP,
          MAX_TEMP,
          deadline,
          { value: 0 }
        )
      ).to.be.revertedWith("Escrow amount must be greater than 0");
    });
  });

  describe("Delivery Flow", function () {
    let escrowId;
    let deadline;

    beforeEach(async function () {
      deadline = Math.floor(Date.now() / 1000) + 86400;

      await escrowContract.connect(buyer).createEscrow(
        seller.address,
        DESTINATION_GPS,
        MIN_TEMP,
        MAX_TEMP,
        deadline,
        { value: ESCROW_AMOUNT }
      );
      escrowId = 1;
    });

    it("Should allow seller to start delivery", async function () {
      await expect(escrowContract.connect(seller).startDelivery(escrowId))
        .to.emit(escrowContract, "DeliveryStarted");

      const escrow = await escrowContract.getEscrow(escrowId);
      expect(escrow.status).to.equal(2);
    });

    it("Should not allow buyer to start delivery", async function () {
      await expect(
        escrowContract.connect(buyer).startDelivery(escrowId)
      ).to.be.revertedWith("Only seller can call this function");
    });

    it("Should allow seller to mark as delivered", async function () {
      await escrowContract.connect(seller).startDelivery(escrowId);

      await expect(escrowContract.connect(seller).markDelivered(escrowId))
        .to.emit(escrowContract, "VerificationRequested");

      const escrow = await escrowContract.getEscrow(escrowId);
      expect(escrow.status).to.equal(3);
    });
  });

  describe("Oracle Verification", function () {
    let escrowId;
    let deadline;

    beforeEach(async function () {
      deadline = Math.floor(Date.now() / 1000) + 86400;

      await escrowContract.connect(buyer).createEscrow(
        seller.address,
        DESTINATION_GPS,
        MIN_TEMP,
        MAX_TEMP,
        deadline,
        { value: ESCROW_AMOUNT }
      );
      escrowId = 1;

      await escrowContract.connect(seller).startDelivery(escrowId);
    });

    it("Should allow oracle to verify delivery", async function () {
      const currentGPS = "-6.2088,106.8456";
      const temperature = 2500;

      const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);

      await expect(
        escrowContract.connect(oracle).verifyDelivery(
          escrowId,
          currentGPS,
          temperature,
          true,
          true
        )
      ).to.emit(escrowContract, "DeliveryVerified")
        .withArgs(escrowId, true, true, true);

      const escrow = await escrowContract.getEscrow(escrowId);
      expect(escrow.status).to.equal(5);
      expect(escrow.verified).to.equal(true);

      const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
      expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(ESCROW_AMOUNT);
    });

    it("Should not release funds if verification fails", async function () {
      const currentGPS = "-6.3000,106.9000";
      const temperature = 2500;

      await escrowContract.connect(oracle).verifyDelivery(
        escrowId,
        currentGPS,
        temperature,
        false,
        true
      );

      const escrow = await escrowContract.getEscrow(escrowId);
      expect(escrow.status).to.equal(2);
      expect(escrow.verified).to.equal(false);
    });

    it("Should not allow non-oracle to verify", async function () {
      await expect(
        escrowContract.connect(buyer).verifyDelivery(
          escrowId,
          "-6.2088,106.8456",
          2500,
          true,
          true
        )
      ).to.be.revertedWith("Only oracle can call this function");
    });
  });

  describe("Refund", function () {
    it("Should allow buyer to refund after deadline", async function () {
      const block = await ethers.provider.getBlock("latest");
      const deadline = block.timestamp + 60;

      await escrowContract.connect(buyer).createEscrow(
        seller.address,
        DESTINATION_GPS,
        MIN_TEMP,
        MAX_TEMP,
        deadline,
        { value: ESCROW_AMOUNT }
      );

      await ethers.provider.send("evm_increaseTime", [120]);
      await ethers.provider.send("evm_mine");

      const buyerBalanceBefore = await ethers.provider.getBalance(buyer.address);

      const tx = await escrowContract.connect(buyer).refund(1);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const buyerBalanceAfter = await ethers.provider.getBalance(buyer.address);

      expect(buyerBalanceAfter + gasUsed - buyerBalanceBefore).to.equal(ESCROW_AMOUNT);

      const escrow = await escrowContract.getEscrow(1);
      expect(escrow.status).to.equal(6);
    });

    it("Should not allow refund before deadline", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      await escrowContract.connect(buyer).createEscrow(
        seller.address,
        DESTINATION_GPS,
        MIN_TEMP,
        MAX_TEMP,
        deadline,
        { value: ESCROW_AMOUNT }
      );

      await expect(
        escrowContract.connect(buyer).refund(1)
      ).to.be.revertedWith("Deadline not yet passed");
    });
  });

  describe("View Functions", function () {
    it("Should return user escrows", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      await escrowContract.connect(buyer).createEscrow(
        seller.address,
        DESTINATION_GPS,
        MIN_TEMP,
        MAX_TEMP,
        deadline,
        { value: ESCROW_AMOUNT }
      );

      const buyerEscrows = await escrowContract.getUserEscrows(buyer.address);
      const sellerEscrows = await escrowContract.getUserEscrows(seller.address);

      expect(buyerEscrows.length).to.equal(1);
      expect(sellerEscrows.length).to.equal(1);
      expect(buyerEscrows[0]).to.equal(1n);
    });
  });
});

