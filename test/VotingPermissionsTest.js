const VotingPermissions = artifacts.require("VotingPermissions");
const Voting = artifacts.require("Voting");

contract("VotingPermissions", (accounts) => {
  let votingPermissionsInstance;
  let votingInstance;
  const owner = accounts[0];
  const nonOwner = accounts[1];

  beforeEach(async () => {
    votingPermissionsInstance = await VotingPermissions.new();
    votingInstance = await Voting.new(["Alice", "Bob"], votingPermissionsInstance.address);
    // Note: Do not set the voting contract address here to test the restriction properly
  });

  it("should deploy the VotingPermissions contract properly", async () => {
    assert.ok(votingPermissionsInstance.address);
  });

  it("should set age for a voter correctly", async () => {
    await votingPermissionsInstance.setAge(nonOwner, 25);
    const age = await votingPermissionsInstance.addressToAge(nonOwner);
    assert.equal(age.toNumber(), 25, "Age was not set correctly");
  });

  it("should check age requirement correctly", async () => {
    await votingPermissionsInstance.setAge(nonOwner, 25);
    const isEligible = await votingPermissionsInstance.meetsAgeRequirement(nonOwner, 18);
    assert.equal(isEligible, true, "Voter should meet the age requirement");
  });

  it("should prevent setting age more than once", async () => {
    await votingPermissionsInstance.setAge(nonOwner, 25);

    try {
      await votingPermissionsInstance.setAge(nonOwner, 30);
    } catch (error) {
      assert.include(error.message, "You have already set an age", "Voter was able to set age more than once");
    }
  });

  it("should allow only the owner of the voting contract to call restricted functions", async () => {
    try {
      await votingPermissionsInstance.setVotingContractAddress(votingInstance.address, { from: nonOwner });
    } catch (error) {
      assert.include(error.message, "Caller is not the owner of the specified contract", "Non-owner was able to set the voting contract address");
    }
  });
});