import { createHelia } from 'helia';
import { unixfs } from '@helia/unixfs';
import { readFileSync } from 'fs';

const contractCode = readFileSync('./build/src/Request.js');
contractCode.toString();

// create a Helia node
const helia = await createHelia();
const ipfs = unixfs(helia);

const encoder = new TextEncoder();
const json = {
  method: 'GET',
  baseURL: 'https://quantum-random.com/quantum',
  path: 'seed',
  zkapp: contractCode.toString(),
};

console.log(json);

const bytes = encoder.encode(JSON.stringify(json));

// add the bytes to your node and receive a unique content identifier
const cid = await ipfs.addBytes(bytes);

console.log(cid);
// console.log(cid.toV0());
console.log(cid.toV1());
