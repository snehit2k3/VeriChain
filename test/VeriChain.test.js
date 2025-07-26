const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VeriChain Contract", function () {
    let VeriChain;
    let veriChain;
    let owner, producer, refinery, otherAccount;
    let PRODUCER_ROLE, REFINERY_ROLE, DEFAULT_ADMIN_ROLE;

    // Before each test, deploy a new instance of the contract
    // and set up the accounts and roles for a clean testing environment.
    beforeEach(async function () {
        // Get different signer accounts to represent different roles
        [owner, producer, refinery, otherAccount] = await ethers.getSigners();

        // Deploy the VeriChain contract
        VeriChain = await ethers.getContractFactory("VeriChain");
        veriChain = await VeriChain.deploy(owner.address);
        await veriChain.waitForDeployment();

        // Get the role hashes from the contract
        PRODUCER_ROLE = await veriChain.PRODUCER_ROLE();
        REFINERY_ROLE = await veriChain.REFINERY_ROLE();
        DEFAULT_ADMIN_ROLE = await veriChain.DEFAULT_ADMIN_ROLE();

        // Grant roles to our test accounts
        await veriChain.connect(owner).grantRole(PRODUCER_ROLE, producer.address);
        await veriChain.connect(owner).grantRole(REFINERY_ROLE, refinery.address);
    });

    describe("Deployment and Role Management", function () {
        it("Should set the right admin role for the owner", async function () {
            expect(await veriChain.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
        });

        it("Should correctly grant roles to producer and refinery", async function () {
            expect(await veriChain.hasRole(PRODUCER_ROLE, producer.address)).to.be.true;
            expect(await veriChain.hasRole(REFINERY_ROLE, refinery.address)).to.be.true;
        });

        it("Admin can grant and revoke roles", async function () {
            await veriChain.connect(owner).grantRole(PRODUCER_ROLE, otherAccount.address);
            expect(await veriChain.hasRole(PRODUCER_ROLE, otherAccount.address)).to.be.true;

            await veriChain.connect(owner).revokeRole(PRODUCER_ROLE, otherAccount.address);
            expect(await veriChain.hasRole(PRODUCER_ROLE, otherAccount.address)).to.be.false;
        });
    });

    describe("Raw Material Creation (Producer)", function () {
        it("Should allow a producer to create a raw material batch", async function () {
            const tokenURI = "ipfs://raw_material_1";
            // The transaction should emit a 'RawMaterialCreated' event with the correct arguments
            await expect(veriChain.connect(producer).createRawMaterial(tokenURI))
                .to.emit(veriChain, "RawMaterialCreated")
                .withArgs(producer.address, 0, tokenURI);

            // The producer should now own the new token (ID 0)
            expect(await veriChain.ownerOf(0)).to.equal(producer.address);
            // The token URI should be set correctly
            expect(await veriChain.tokenURI(0)).to.equal(tokenURI);
        });

        it("Should NOT allow a non-producer to create a raw material batch", async function () {
            const tokenURI = "ipfs://should_fail";
            // FIXED: Check for the specific custom error instead of a reason string.
            await expect(
                veriChain.connect(otherAccount).createRawMaterial(tokenURI)
            ).to.be.revertedWithCustomError(veriChain, "AccessControlUnauthorizedAccount");
        });
    });

    describe("Batch Refining (Refinery)", function () {
        const rawMaterialURI = "ipfs://crude_oil_batch_101";
        const petrolURI = "ipfs://petrol_from_101";
        const dieselURI = "ipfs://diesel_from_101";

        beforeEach(async function () {
            // Pre-test setup: A producer creates a raw material token
            await veriChain.connect(producer).createRawMaterial(rawMaterialURI); // Token ID 0
            // The producer transfers this token to the refinery
            await veriChain.connect(producer).transferFrom(producer.address, refinery.address, 0);
        });

        it("Should allow a refinery to refine a batch it owns", async function () {
            const newURIs = [petrolURI, dieselURI];
            // The refinery calls refineBatch on token 0
            const tx = await veriChain.connect(refinery).refineBatch(0, newURIs);

            // Check for the BatchRefined event
            await expect(tx)
                .to.emit(veriChain, "BatchRefined")
                .withArgs(refinery.address, 0, [1, 2]); // originTokenId 0, new token IDs 1 and 2

            // FIXED: Check for the specific custom error for a non-existent token.
            await expect(veriChain.ownerOf(0)).to.be.revertedWithCustomError(veriChain, "ERC721NonexistentToken");

            // The refinery should own the two new tokens (IDs 1 and 2)
            expect(await veriChain.ownerOf(1)).to.equal(refinery.address);
            expect(await veriChain.ownerOf(2)).to.equal(refinery.address);

            // The new tokens should have the correct URIs
            expect(await veriChain.tokenURI(1)).to.equal(petrolURI);
            expect(await veriChain.tokenURI(2)).to.equal(dieselURI);

            // Crucially, check the on-chain lineage
            expect(await veriChain.originOf(1)).to.equal(0);
            expect(await veriChain.originOf(2)).to.equal(0);
        });

        it("Should NOT allow refining if the caller does not have the REFINERY_ROLE", async function () {
            // FIXED: Check for the specific custom error.
            await expect(
                veriChain.connect(producer).refineBatch(0, [petrolURI])
            ).to.be.revertedWithCustomError(veriChain, "AccessControlUnauthorizedAccount");
        });

        it("Should NOT allow refining if the caller does not own the token", async function () {
            // A different refinery (who has the role but not the token) tries to call refineBatch
            const anotherRefinery = otherAccount;
            await veriChain.connect(owner).grantRole(REFINERY_ROLE, anotherRefinery.address);

            await expect(
                veriChain.connect(anotherRefinery).refineBatch(0, [petrolURI])
            ).to.be.revertedWith("VeriChain: Caller must own the token");
        });
    });
});
