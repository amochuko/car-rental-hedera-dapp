// @ts-nocheck
import {
  AccountId,
  Client,
  PrivateKey,
  TopicMessageSubmitTransaction,
} from '@hashgraph/sdk';
import { Buffer } from 'buffer';
import { ethers } from 'ethers';
import { useEffect, useState } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { MirrorNodeClient } from '../src/mirrorNodeClient';
import './App.css';
import Borrow from './pages/BorrowCar';
import CreateCar from './pages/CreateCar';
import GiveScore from './pages/GiveScore';
import Return from './pages/ReturnCar';
import { provider } from './utils';

// Part 1 - import ABI
import MerchantBackend from './MerchantBackend.json';

function App() {
  const [defaultAccount, setDefaultAccount] = useState('');
  const [score, setScore] = useState(0);
  const [contract, setContract] = useState();

  // Part 2 - define environment variables
  const scAddress = process.env.REACT_APP_SC_ADDRESS;
  const nftAddress = process.env.REACT_APP_NFT_ADDRESS;
  const nftId = AccountId.fromSolidityAddress(nftAddress).toString();
  const ftAddress = process.env.REACT_APP_FT_ADDRESS;
  const ftId = AccountId.fromSolidityAddress(ftAddress).toString();
  const topicId = process.env.REACT_APP_TOPIC_ID;

  const merchantKey = PrivateKey.fromString(
    process.env.REACT_APP_MERCHANT_PRIVATE_KEY
  );
  const merchantId = AccountId.fromString(process.env.REACT_APP_MERCHANT_ID);
  const merchantAddress = process.env.REACT_APP_MERCHANT_ADDRESS;

  const customerAccount = AccountId.fromString(
    process.env.REACT_APP_CUSTOMER_ACCOUNT_ID
  );

  // Part 3 - create client instance
  const client = Client.forTestnet().setOperator(merchantId, merchantKey);

  const connect = async () => {
    if (window.ethereum) {
      // Part 4 - connect wallet
      await provider.send('eth_requestAccounts', []);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      setDefaultAccount(address);

      window.ethereum.on('accountsChanged', changeConnectedAccount);

      // const contractInstance = new ethers.Contract(
      //   scAddress,
      //   MerchantBackend.abi,
      //   signer
      // );

      // setContract(contractInstance);
      await getContract();
    }
  };

  const changeConnectedAccount = async (newAddress) => {
    try {
      newAddress = Array.isArray(newAddress) ? newAddress[0] : newAddress;
      setDefaultAccount(newAddress);
    } catch (err) {
      console.error(err);
    }
  };

  const getContract = async () => {
    // Part 5 - create contract instance
    // const provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
    const signer = provider.getSigner();
    const address = await signer.getAddress();
    setDefaultAccount(address);

    const contractInstance = new ethers.Contract(
      scAddress,
      MerchantBackend.abi,
      signer
    );
    setContract(contractInstance);
  };

  const getScore = async () => {
    try {
      if (defaultAccount) {
        // Part 16 - get reputation token score
        await fetch(
          `https://testnet.mirrornode.hedera.com/api/v1/accounts/${defaultAccount}/tokens?token.id=${ftId}`
        )
          .then((res) => res.json())
          .then((data) => {
            if (!data.tokens[0]) {
              setScore(0);
              return;
            }

            console.log(data);

            setScore(data.tokens[0].balance);
          });
      }
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    connect();
    getScore();
  }, [defaultAccount]);

  const createCar = async (cid) => {
    try {
      if (!contract) getContract();

      // Part 6 - add new car
      const tx = await contract.mintMFT(nftAddress, [Buffer.from(cid)], {
        gasLimit: 1_000_000,
      });

      await tx.wait();

      // Part 7 - submit add new car logs to topic ~ emit event
      new TopicMessageSubmitTransaction()
        .setTopicId(topicId)
        .setMessage(
          `{
        type: Minting,
        accountAddr: ${defaultAccount}, 
        tokenId: ${nftId}
      }`
        )
        .execute(client);

      alert('Successfully added new car!');
    } catch (e) {
      alert('Failed to add new car');
      console.log(e);
    }
  };

  const metadata = {
    name: 'Tesla Model 3',
    description:
      'Friendly Tesla Model 3. 100% electric. 0-60 in 3.2 seconds. 310 miles range. 5 star safety rating. 5 star reliability rating. 5 star customer satisfaction rating. 5 star every',
    image:
      'https://bafybeid3pzjt7ig3ithbdxuhwd7jtxt766glnekryu6wjrbdbri73qwbxy.ipfs.dweb.link/',
  };

  const associateToken = async (id) => {
    // Part 8 - associate token
    await provider.send('eth_requestAccounts', []);
    const signer = provider.getSigner();
    const abi = ['function associate()'];
    const contract = new ethers.Contract(id, abi, signer);

    try {
      const txnResult = await contract.associate();
      return txnResult.hash;
    } catch (err) {
      console.warn(err.message ? err.message : err);
      return null;
    }
  };

  const isAssociated = async (tokenId) => {
    // Part 9 - check token association
    const mirrorNodeClient = new MirrorNodeClient('testnet');

    return await mirrorNodeClient
      .getAccountInfo(customerAccount)
      .then((acct) => {
        const associatedTokenList = acct.balance.tokens;

        return associatedTokenList.some((token) => token.token_id === tokenId);
      })
      .catch((rej) => {
        console.log('Counld not get token balance', rej);
      });
  };

  const borrowCar = async (tokenSolidityAddress, serial) => {
    // Part 10 - check if tokens are associated, associate them if not

    if (!(await isAssociated(tokenSolidityAddress))) {
      await associateToken(tokenSolidityAddress);
    }

    if (!(await isAssociated(ftAddress))) {
      await associateToken(ftAddress);
    }

    try {
      if (!contract) getContract();
      // Part 11 - borrow new car
      const txn = await contract.borrowing(tokenSolidityAddress, serial, {
        value: ethers.utils.parseEther('1000'),
        gasLimit: 2_000_000,
      });
      await txn.wait();

      // Part 12 - submit borrow car logs to topic
      new TopicMessageSubmitTransaction()
        .setTopicId(topicId)
        .setMessage(
          `{
        type: Borrowing,
        accountAddr: ${defaultAccount},tokenId: ${AccountId.fromSolidityAddress(
            tokenSolidityAddress
          )},
        serial: ${serial}
      }`
        )
        .execute(client);

      alert('Successfully borrowed car!');
    } catch (e) {
      alert('Failed to borrrow car');
      console.log(e);
    }
  };

  const getContractId = async () => {
    const mirrorNodeClient = new MirrorNodeClient('testnet');
    return await mirrorNodeClient
      .getContractInfo(scAddress)
      .then((acc) => {
        const contractId = acc.contract_id;
        return contractId;
      })
      .catch((rejectErr) => {
        console.log('Could not get token balance', rejectErr);
      });
  };

  const returnCar = async (tokenSolidityAddress, serial) => {
    try {
      if (!contract) getContract();

      // Part 13 - give SC allowance
      await provider.send('eth_requestAccounts', []);
      const signer = provider.getSigner();
      const abi = [
        'function approve(address _spender, uint256 _value) public returns (bool success)',
      ];
      const ethContract = new ethers.Contract(
        tokenSolidityAddress,
        abi,
        signer
      );

      try {
        const txnResult = await ethContract.approve(scAddress, serial);
        await txnResult.wait();
      } catch (err) {
        console.warn(err.message ? err.message : err);
      }

      // Part 14 - return car
      const txReturnCar = await contract.returning(
        tokenSolidityAddress,
        serial,
        {
          gasLimit: 1_000_000,
        }
      );

      await txReturnCar.wait();

      // Part 15 - submit return car logs to topic
      new TopicMessageSubmitTransaction()
        .setTopicId(topicId)
        .setMessage(
          `{
        type: Returning, 
        accountAddr: ${defaultAccount},
        tokenId: ${tokenSolidityAddress},
        serial: ${serial}
      }`
        )
        .execute(client);

      alert('Successfully returned car!');
    } catch (e) {
      alert('Failed to return car');
      console.log(e);
    }
  };

  const giveScore = async (customer, score) => {
    try {
      if (!contract) getContract();

      // Part 17 - give reputation tokens
      await fetch(
        `https://testnet.mirrornode.hedera.com/api/v1/accounts/${customer}`
      )
        .then((res) => res.json())
        .then(async (data) => {
          console.log(data.evm_address);

          const tx = await contract.scoring(data.evm_address, score, {
            gasLimit: 1_000_000,
          });

          await tx.wait();
        });

      // Part 18 - submit give REP tokens logs to topic
      new TopicMessageSubmitTransaction()
        .setTopicId(topicId)
        .setMessage(
          `{
        type: Scoring,
        accountAddr: ${customer},
        tokenId: ${ftId.toString()},
        amount: ${1}
      }`
        )
        .execute(client);

      alert('Successfully gave REP tokens!');
    } catch (e) {
      alert('Failed to give REP tokens');
      console.log(e);
    }
  };

  const isMerchant =
    defaultAccount.toLowerCase() === merchantAddress.toLowerCase();
  return (
    <>
      <nav>
        <ul className='nav'>
          {isMerchant ? (
            <>
              <NavLink to='/' className='nav-item'>
                Add Car
              </NavLink>
              <NavLink to='/give' className='nav-item'>
                Give Score
              </NavLink>
            </>
          ) : defaultAccount ? (
            <>
              <NavLink to='/' className='nav-item'>
                Borrow Car
              </NavLink>
              <NavLink to='/give' className='nav-item'>
                Return Car
              </NavLink>
            </>
          ) : (
            <></>
          )}
          <div className='acc-container'>
            {!isMerchant && defaultAccount && (
              <p className='acc-score'>
                My Reputation Tokens: {defaultAccount ? score : '0'}
              </p>
            )}
            <div className='connect-btn'>
              <button onClick={connect} className='primary-btn'>
                {defaultAccount
                  ? `${defaultAccount?.slice(0, 5)}...${defaultAccount?.slice(
                      defaultAccount?.length - 4,
                      defaultAccount?.length
                    )}`
                  : 'Not Connected'}
              </button>
            </div>
          </div>
        </ul>
      </nav>

      {!defaultAccount ? (
        <h1 className='center'>Connect Your Wallet First</h1>
      ) : (
        <></>
      )}

      <Routes>
        {isMerchant ? (
          <>
            <Route path='/' element={<CreateCar createCar={createCar} />} />
            <Route path='/give' element={<GiveScore giveScore={giveScore} />} />
          </>
        ) : defaultAccount ? (
          <>
            <Route path='/' element={<Borrow borrowCar={borrowCar} />} />
            <Route
              path='/give'
              element={
                <Return returnCar={returnCar} address={defaultAccount} />
              }
            />
          </>
        ) : (
          <></>
        )}
      </Routes>
    </>
  );
}

export default App;
