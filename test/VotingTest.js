const Voting = artifacts.require("Voting");
const VotingPermissions = artifacts.require("VotingPermissions");

contract("Voting", (accounts) => {
  let votingInstance;
  let votingPermissionsInstance;
  const owner = accounts[0];
  const voter = accounts[1];
  const candidates = ["Alice", "Bob", "Charlie"];

  beforeEach(async () => {
    votingPermissionsInstance = await VotingPermissions.new();
    votingInstance = await Voting.new(candidates, votingPermissionsInstance.address);
    await votingPermissionsInstance.setVotingContractAddress(votingInstance.address);
  });

  it("should deploy the Voting contract properly", async () => {
    assert.ok(votingInstance.address);
  });

  it("should add candidates correctly", async () => {
    const candidateCount = await votingInstance.getCandidateCount();
    assert.equal(candidateCount.toNumber(), candidates.length, "Candidate count does not match");
  });

  it("should allow eligible voter to vote", async () => {
    await votingPermissionsInstance.setAge(voter, 20);
    await votingInstance.vote(1, { from: voter });

    const voteCount = await votingInstance.totalVotesFor(1);
    assert.equal(voteCount.toNumber(), 1, "Vote count should be 1");

    const hasVoted = await votingInstance.hasVoted(voter);
    assert.equal(hasVoted, true, "Voter should be marked as having voted");
  });

  it("should not allow non-eligible voter to vote", async () => {
    try {
      await votingInstance.vote(1, { from: accounts[2] });
    } catch (error) {
      assert.include(error.message, "You are not eligible to vote", "Non-eligible voter was able to vote");
    }
  });

  it("should not allow double voting", async () => {
    await votingPermissionsInstance.setAge(voter, 20);
    await votingInstance.vote(1, { from: voter });

    try {
      await votingInstance.vote(1, { from: voter });
    } catch (error) {
      assert.include(error.message, "You have already voted", "Voter was able to vote more than once");
    }
  });

  it("should correctly calculate the winner", async () => {
    await votingPermissionsInstance.setAge(voter, 20);
    await votingInstance.vote(1, { from: voter });

    const allCandidates = await Promise.all(candidates.map(async (name, index) => {
      const candidate = await votingInstance.candidates(index);
      return { name: candidate.name, voteCount: candidate.voteCount.toNumber() };
    }));

    const winner = await votingInstance.calculateWinner(allCandidates);
    assert.equal(winner, "Bob", "Winner should be Bob");
  });
});