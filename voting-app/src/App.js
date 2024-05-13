import React, { useState, useEffect } from 'react';
import './App.css';
import Web3 from 'web3';
import VotingContract from './contracts/Voting.json';
import VotingPermissionsContract from './contracts/VotingPermissions.json';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const [web3, setWeb3] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [contract, setContract] = useState(null);
  const [votingPermissionsContract, setPermissionContract] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [hasSet, setHasSet] = useState(false);
  const [isEligible, setIsEligible] = useState(false);
  const [age, setAge] = useState('');
  const [winner, setWinner] = useState("");

  useEffect(() => {
    const init = async () => {
      try {
        // Connect to MetaMask
        if (window.ethereum) {
          const web3Instance = new Web3(window.ethereum);
          setWeb3(web3Instance);

          // Request account access if needed
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          
          // Get the currently selected account
          const accounts = await web3Instance.eth.getAccounts();
          setAccounts(accounts);
          
          const networkId = await web3Instance.eth.net.getId();
          const deployedNetwork = VotingContract.networks[networkId];
          const contractInstance = new web3Instance.eth.Contract(
            VotingContract.abi,
            deployedNetwork && deployedNetwork.address
          );
          setContract(contractInstance);

          const votingPermissionsDeployedNetwork = VotingPermissionsContract.networks[networkId];
          const votingPermissionsContractInstance = new web3Instance.eth.Contract(
          VotingPermissionsContract.abi,
          votingPermissionsDeployedNetwork && votingPermissionsDeployedNetwork.address
        );
        setPermissionContract(votingPermissionsContractInstance);


          // Check if the connected account has already voted
          const hasAlreadyVoted = await contractInstance.methods.hasVoted(accounts[0]).call();
          setHasVoted(hasAlreadyVoted);

          // Check if the connected account has already voted
          const hasAlreadySet = await votingPermissionsContractInstance.methods.hasSet(accounts[0]).call();
          setHasSet(hasAlreadySet);

          
          // Subscribe to Voted event
          contractInstance.events.Voted({ filter: { _voter: accounts[0] } })
            .on('data', async (event) => {
              console.log('Voted event received:', event);
              if (isLoading) { // Check if loading notification is still active
                setIsLoading(false); // Turn off loading state
                toast.success('Your vote has been recorded!');
                setHasVoted(true); // Update the state to reflect that the user has voted
              }
            })
            .on('error', (error) => {
              console.error('Error listening to Voted event:', error);
            });
        } else {
          toast.error('Please install MetaMask to use this dApp.');
        }
      } catch (error) {
        console.error('Error initializing app:', error);
      }
    };
    init();
  }, []);

  function bigintToFloat(bigInt) {
    // Convert BigInt to a string
    let bigIntStr = bigInt.toString();

    // Parse the string as a floating-point number
    let floatNumber = parseFloat(bigIntStr);

    return floatNumber;
}

  const handleVote = async () => {
    if (!selectedCandidate || !contract) return;
  
    try {
      setIsLoading(true);
      const accounts = await web3.eth.getAccounts();
      console.log('Sending transaction from account:', accounts[0]);
      // Display loading notification
      const loadingToastId = toast.info('Waiting for the transaction to be confirmed...', { autoClose: false });
      
      // transaction that consumes gas => eth transfer to compensate miners for the transaction validation
      const gas = await contract.methods.vote(selectedCandidate).estimateGas({ from: accounts[0] });
      const gasPrice = await web3.eth.getGasPrice();
      const gasFloat = bigintToFloat(gas);
      const gasLimit = gas * 1.2; // Set gas limit slightly higher than the estimated gas cost
      const tx = await contract.methods.vote(selectedCandidate).send({ from: accounts[0], gas: '100000', gasPrice });
      //const tx = await contract.methods.vote(selectedCandidate).send({ from: accounts[0], gas });
      console.log('Transaction successful. Transaction hash:', tx.transactionHash);
      // Remove loading notification once the transaction is successful
      toast.dismiss(loadingToastId);
      // Trigger success notification
      toast.success('Your vote has been recorded!');
      // Update the state to reflect that the user has voted
      setHasVoted(true);
    } catch (error) {
      console.error('Error voting:', error);
      console.log('MetaMask RPC Error Response:', error.message);
      if (error.code === 4001) {
        toast.error('Transaction rejected by user.');
      } else {
        toast.error('Error voting. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  

  const loadCandidates = async () => {
    if (!contract) return;

    try {
      const candidateCount = await contract.methods.getCandidateCount().call();
      const candidateList = [];
      for (let i = 0; i < candidateCount; i++) {
        const voteCount = parseInt(await contract.methods.totalVotesFor(i).call(), 10);
        const candidate = await contract.methods.candidates(i).call();
        candidateList.push({ ...candidate, voteCount });
      }
      console.log(candidateList);
      setCandidates(candidateList);
    } catch (error) {
      console.error('Error loading candidates:', error);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, [contract]);

  const checkAgeEligibility = async () => {
    try {
      const eligible = await votingPermissionsContract.methods.meetsAgeRequirement(accounts[0], 18).call();
      console.log("eligible value: ", eligible);
      setIsEligible(eligible);
    } catch (error) {
      console.error('Error checking age eligibility:', error);
    }
  };

  const handleAgeChange = (event) => {
    console.log("age input: ", event.target.value);
    setAge(event.target.value);
  };


  // submit age function

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await votingPermissionsContract.methods.setAge(accounts[0], age).send({ from: accounts[0] });
      console.log('Age set successfully');
      setHasSet(true);
      checkAgeEligibility();
    } catch (error) {
      console.error('Error setting age:', error);
    }
  };

  const endVote = async () => 
    {
      try {
        const winner = await contract.methods.calculateWinner(candidates).call();
        setWinner(winner);
      } catch (error) {
        console.error('Error getting vote winner:', error);
      }
    }


  return (
    <div className="App">
      <header className="App-header">

        <div style={{width:"100%"}}>
          <div style={{display:"flex",justifyContent:"end", marginRight:"50px", marginTop:"20px"}}>
            <button onClick={endVote}>End vote</button>
          </div>
        </div>

        <div style={{justifyContent:"center", width:"100%"}}>
            <h1>Voting App</h1>
        </div>


        {winner && <div>
          <h3>The winner is: {winner}</h3></div>}
      
        
        <p>Account: {accounts.length > 0 ? accounts[0] : 'No account connected'}</p>

        {
          isEligible == false && <form onSubmit={handleSubmit}>
          <label>
            Age:
            <input type="number" value={age} onChange={handleAgeChange} />
          </label>
          <button type="submit">Check Eligibility</button>
        </form>
        }

        

        {hasVoted && <p>You have already voted. Cannot vote again.</p>}

        {hasSet && <p>You set your age once. You cannot set again</p>}

       <div>
          <div>
          <h2>Candidates:</h2>
          <ul>
            {candidates.map((candidate, index) => (
              <li key={index}>
                {candidate.name} - Votes: {candidate.voteCount}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2>Vote</h2>
          <select onChange={(e) => setSelectedCandidate(e.target.value)} disabled={hasVoted}>
            <option value="">Select a candidate</option>
            {candidates.map((candidate, index) => (
              <option key={index} value={index}>
                {candidate.name}
              </option>
            ))}
          </select>
          <button onClick={handleVote} disabled={!selectedCandidate || isLoading || hasVoted}>
            Vote
          </button>
        </div>
        </div>

        {/* Toastify container */}
        <ToastContainer />
      </header>
    </div>
  );
}

export default App;
