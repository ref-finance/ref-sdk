import {
  getMemorySigner,
  getSignedTransactionsByMemoryKey,
  sendTransactionsByMemoryKey,
  fetchAllPools,
  getRefPools,
} from '../dist/ref-sdk.esm.js';

fetchAllPools().then(res => {
  console.log(res);
});
