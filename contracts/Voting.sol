pragma solidity ^0.8.0;

import "./VotingPermissions.sol";

contract Voting {
    // Struct to represent a candidate
    struct Candidate {
        string name;
        uint256 voteCount;
    }

    // Array of candidates
    Candidate[] public candidates;

     // Address of the voting permissions contract
    address public votingPermissionsAddress;

    // Mapping to track if an address has voted
    mapping(address => bool) public hasVoted;

    // Event emitted when a voter casts a vote
    event Voted(address indexed _voter, uint256 _candidateIndex);

    // Event emitted when a new candidate is added
    event CandidateAdded(string _name);

    // Owner of the contract
    address public owner;

    // Modifier to restrict access to the owner
    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function");
        _;
    }

    // Modifier to check eligibility based on age requirement
    modifier eligibleToVote() {
        require(VotingPermissions(votingPermissionsAddress).meetsAgeRequirement(msg.sender, 18), "You are not eligible to vote");
        _;
    }

    // Constructor to initialize candidates and set owner
    constructor(string[] memory _candidateNames, address _votingPermissionsAddress) {
        owner = msg.sender;
        for (uint256 i = 0; i < _candidateNames.length; i++) {
            candidates.push(Candidate({
                name: _candidateNames[i],
                voteCount: 0
            }));
            emit CandidateAdded(_candidateNames[i]);
        }
        votingPermissionsAddress = _votingPermissionsAddress;
    }

    // Function to get the owner of the contract

    function getOwner() external view returns (address) {
        return owner;
    }


    // Function to vote for candidate

    function vote(uint256 _candidateIndex) external eligibleToVote  {
    require(_candidateIndex < candidates.length, "Invalid candidate index");

    // Check if the sender has already voted
    require(!hasVoted[msg.sender], "You have already voted");

    // Increment the vote count for the selected candidate
    candidates[_candidateIndex].voteCount++;
    hasVoted[msg.sender] = true;

    emit Voted(msg.sender, _candidateIndex);
    }

    // Function to get the total votes for a candidate
    function totalVotesFor(uint256 _candidateIndex) external view returns (uint256) {
        require(_candidateIndex < candidates.length, "Invalid candidate index");
        return candidates[_candidateIndex].voteCount;
    }

    // Function to get the total number of candidates

    function getCandidateCount() external view returns (uint256) {
        return candidates.length;
    }

    // Function to calculate the winner of the election

     function calculateWinner(Candidate[] memory _candidates) external pure returns (string memory) {
        require(_candidates.length > 0, "No candidates provided");
        
        uint256 winningVoteCount = 0;
        string memory winnerName;
        
        for (uint256 i = 0; i < _candidates.length; i++) {
            if (_candidates[i].voteCount > winningVoteCount) {
                winningVoteCount = _candidates[i].voteCount;
                winnerName = _candidates[i].name;
            }
        }
        
        require(bytes(winnerName).length > 0, "No winner found");
        
        return winnerName;
    }

    // Function to transfer eth from the current account to another

    function transferEther(address payable _recipient, uint256 _amount) external payable {
        require(address(this).balance >= _amount, "Insufficient balance in contract");
        // Transfer Ether to the recipient
        _recipient.transfer(_amount);
    }

}
