import { Mina, PrivateKey, PublicKey, fetchAccount } from 'o1js';
import { Request } from '../src/Request.js';
import {
  StringCircuitValue,
  ZkonRequestCoordinator,
  ZkonZkProgram,
} from 'zkon-zkapp';

function segmentHash(ipfsHashFile: string) {
  const ipfsHash0 = ipfsHashFile.slice(0, 30); // first part of the ipfsHash
  const ipfsHash1 = ipfsHashFile.slice(30); // second part of the ipfsHash

  const field1 = new StringCircuitValue(ipfsHash0).toField();

  const field2 = new StringCircuitValue(ipfsHash1).toField();

  return { field1, field2 };
}

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

let zkAppAddress = PublicKey.fromBase58(
  'B62qn83VZZwR5aMHLBk1kCSNAypkFKMhHhjprtXaDJ2SD3GCAZVpTN2'
);
let zkApp = new Request(zkAppAddress);

await fetchAccount({
  publicKey: zkAppAddress,
});

console.log('Compiling programms');

await ZkonZkProgram.compile();
await ZkonRequestCoordinator.compile();
await Request.compile();

let senderKey = PrivateKey.fromBase58(process.env.DEPLOYER_KEY!);
let sender = senderKey.toPublicKey();

let { field1, field2 } = segmentHash(
  'bafkreifmsypu6h46aucsk7ouwq2mvxpich2zs6lv2puhqr5t5w3hsl6dl4'
);

let tx = Mina.transaction({ sender, fee: transactionFee }, async () => {
  await zkApp.sendRequest(field1, field2);
});

console.log('Transaction ready');

await tx.prove();
console.log('Transaction proved');
let txInfo = await tx.sign([senderKey]).send();

console.log(`Transaction hash: ${txInfo.hash}`);

console.log(`Wait for transaction inclusion`);

await txInfo.wait();

console.log(`Transaction have succesfully included`);
