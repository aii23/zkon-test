import dotenv from 'dotenv';
dotenv.config();
import {
  Mina,
  PrivateKey,
  fetchAccount,
  AccountUpdate,
} from 'o1js';
import { Request as ZkonRequest } from '../src/Request.js';
import fs from 'fs-extra';
import { ZkonZkProgram } from 'zkon-zkapp';

// Network configuration
const transactionFee = 100_000_000;
const useCustomLocalNetwork = process.env.USE_CUSTOM_LOCAL_NETWORK === 'true';
const network = Mina.Network({
  mina: useCustomLocalNetwork
    ? 'http://localhost:8080/graphql'
    : 'https://api.minascan.io/node/devnet/v1/graphql',
  lightnetAccountManager: 'http://localhost:8181',
  archive: useCustomLocalNetwork
    ? 'http://localhost:8282'
    : 'https://api.minascan.io/archive/devnet/v1/graphql',
});
Mina.setActiveInstance(network);

let senderKey;
let sender;
let localData;
let zkCoordinatorAddress;

senderKey = PrivateKey.fromBase58(process.env.DEPLOYER_KEY!);
sender = senderKey.toPublicKey();

console.log(`Fetching the fee payer account information.`);
const accountDetails = (await fetchAccount({ publicKey: sender })).account;
console.log(
  `Using the fee payer account ${sender.toBase58()} with nonce: ${
    accountDetails?.nonce
  } and balance: ${accountDetails?.balance}.`
);

await ZkonZkProgram.compile();
// ZkRequest App
const zkRequestKey = PrivateKey.random();
const zkRequestAddress = zkRequestKey.toPublicKey();
await ZkonRequest.compile();
console.log('Compiled');
const zkRequest = new ZkonRequest(zkRequestAddress);
console.log('');

// zkApps deployment
console.log(`Deploy zkRequest to ${zkRequestAddress.toBase58()}`);
let transaction = await Mina.transaction(
  { sender, fee: transactionFee },
  async () => {
    AccountUpdate.fundNewAccount(sender);
    await zkRequest.deploy();
  }
);
console.log('Generating proof');
await transaction.prove();
console.log('Proof generated');

console.log('Signing');
transaction.sign([senderKey, zkRequestKey]);
console.log('');
console.log(
  `Sending the request transaction to zkRequest at: ${zkRequestAddress.toBase58()}`
);
let pendingTx = await transaction.send();
if (pendingTx.status === 'pending') {
  console.log(`Success! Request transaction sent.  
  Txn hash: ${pendingTx.hash}
  Block explorer hash: https://minascan.io/devnet/tx/${pendingTx.hash}`);
}
console.log('Waiting for transaction inclusion in a block.');
await pendingTx.wait({ maxAttempts: 90 });
console.log(`Deployed to ${zkRequestKey.toBase58()}`);
