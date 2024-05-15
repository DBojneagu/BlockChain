pragma solidity ^0.8.0;

import "./Voting.sol";

contract VotingPermissions {

    // Owner of the contract
    address public owner;

    // Address of the voting contract
    address payable public votingContractAddress;

    // Mapping to track if an address has set an age before
    mapping(address => bool) public hasSet;


    // Mapping to store the age of each address
    mapping(address => uint256) public addressToAge;

    // Event emitted when an address's age is set
    event AgeSet(address indexed _address, uint256 _age);

    modifier onlyOwnerOfOtherContract() {
        require(Voting(votingContractAddress).getOwner() == msg.sender, "Caller is not the owner of the specified contract");
        _;
    }


     constructor() {
        owner = msg.sender;
    }


    // Function to set the voting contract address
    function setVotingContractAddress(address payable _votingContractAddress) external {
        require(votingContractAddress == address(0), "Voting contract address already set");
        votingContractAddress = _votingContractAddress;
    }

    // Function to set the age for an address
    function setAge(address _address, uint256 _age) external {
    // Check if the sender has already set an age
    require(!hasSet[msg.sender], "You have already set an age");

    hasSet[msg.sender] = true;

    addressToAge[_address] = _age;
    emit AgeSet(_address, _age);
    }

    // Function to check if an address meets the minimum age requirement
    function meetsAgeRequirement(address _address, uint256 _minAge) external view returns (bool) {
        return addressToAge[_address] >= _minAge;
    }
}
