# Ref SDK

Functions to quickly implement AMM feature both for Dapp developers or makers.

## Install

For yarn Developers: `yarn add ref-sdk`

For npm Developers: `npm install ref-sdk`

## Initialization

ref-sdf identifies env varivable NEAR_ENV to get global configuration, we suggest to `export NEAR_ENV=mainnet` or `export NEAR_ENV=testnet` to set up NEAR network.

```typescript
export function getConfig(env: string | undefined = process.env.NEAR_ENV) {
  switch (env) {
    case 'mainnet':
      return {
        networkId: 'mainnet',
        nodeUrl: 'https://rpc.mainnet.near.org',
        walletUrl: 'https://wallet.near.org',
        WRAP_NEAR_CONTRACT_ID: 'wrap.near',
        REF_FI_CONTRACT_ID: 'v2.ref-finance.near',
      };
    case 'testnet':
      return {
        networkId: 'testnet',
        nodeUrl: 'https://rpc.testnet.near.org',
        walletUrl: 'https://wallet.testnet.near.org',
        WRAP_NEAR_CONTRACT_ID: 'wrap.testnet',
        REF_FI_CONTRACT_ID: 'ref-finance-101.testnet',
      };
    default:
      return {
        networkId: 'mainnet',
        nodeUrl: 'https://rpc.mainnet.near.org',
        walletUrl: 'https://wallet.near.org',
        REF_FI_CONTRACT_ID: 'v2.ref-finance.near',
        WRAP_NEAR_CONTRACT_ID: 'wrap.near',
      };
  }
}
```

## Functions

### Tokens

#### ftGetTokenMetadata

View to get token metadata.

**Parameters**

```typescript
id: string;
```

**Example**

```typescript
const WrapNear = await ftGetTokenMetadata('wrap.testnet');
```

**Response**

```typescript
{
  decimals: 24;
  icon: null;
  id: 'wrap.testnet';
  name: 'Wrapped NEAR fungible token';
  reference: null;
  reference_hash: null;
  spec: 'ft-1.0.0';
  symbol: 'wNEAR';
}
```

---

#### ftGetTokensMetadata

Get tokens metadata, set token id as index.

**Parameters**

```typescript
tokenIds: string[]
```

**Example**

```typescript
const tokensMetadata = await ftGetTokensMetadata([
  'ref.fakes.testnet',
  'wrap.testnet',
]);
```

**Response**

```typescript
{
  "ref.fakes.testnet":{
    decimals: 18
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='16 24 248 248' style='background: %23000'%3E%3Cpath d='M164,164v52h52Zm-45-45,20.4,20.4,20.6-20.6V81H119Zm0,18.39V216h41V137.19l-20.6,20.6ZM166.5,81H164v33.81l26.16-26.17A40.29,40.29,0,0,0,166.5,81ZM72,153.19V216h43V133.4l-11.6-11.61Zm0-18.38,31.4-31.4L115,115V81H72ZM207,121.5h0a40.29,40.29,0,0,0-7.64-23.66L164,133.19V162h2.5A40.5,40.5,0,0,0,207,121.5Z' fill='%23fff'/%3E%3Cpath d='M189 72l27 27V72h-27z' fill='%2300c08b'/%3E%3C/svg%3E%0A"
    id: "ref.fakes.testnet"
    name: "Ref Finance Token"
    reference: null
    reference_hash: null
    spec: "ft-1.0.0"
    symbol: "REF"
  },
  "wrap.testnet":{
    decimals: 24
    icon: null
    id: "wrap.testnet"
    name: "Wrapped NEAR fungible token"
    reference: null
    reference_hash: null
    spec: "ft-1.0.0"
    symbol: "wNEAR"
  }
}
```

---

### Pools

#### fetchAllRefPools

Fetch all pools in Ref, including simple pools, rated pools and unrated pools.

**Parameters**

None

**Example**

```typescript
const { ratedPools, unRatedPools, simplePools } = await fetchAllRefPools();
```

**Response**

```typescript
{
  ratedPools:[{
    fee: 5,
    id: 568,
    pool_kind: "RATED_SWAP",
    shareSupply: "80676034815429711745720012070",
    supplies:{
      "meta-v2.pool.testnet": "1298314415249170366960739764"
    	"wrap.testnet": "80182803630538035347294614770"
  	},
    token0_ref_price: undefined,
    tokenIds: ["meta-v2.pool.testnet", "wrap.testnet"],
    tvl: undefined
  },...]
  unRatedPools:[...],
	simplePools:[...],
}
```

---

#### getStablePoolsDetail

We call `unRatedPools` or `ratedPools` as `stablePool`, this function gets stable pools' detail.

**Parameters**

```typescript
stablePools: Pool[]
```

**Example**

```typescript
const stablePools: Pool[] = unRatedPools.concat(ratedPools);

const stablePoolsDetail: StablePool[] = await getStablePoolsDetail(stablePools);
```

**Response**

```typescript
[
	{
		amounts: ['1298314415249170366960739764', '80182803630538035347294614770'],
		amp: 240,
		c_amounts:["1298314415249170366960739764","80182803630538035347294614770"],
		decimals:[24,24],
		id: 568,
		pool_kind: "RATED_SWAP",
		rates:["1972101024157559347385372","1000000000000000000000000"],
		shares_total_supply: "80676034815429711745720012070",
		token_account_ids:["meta-v2.pool.testnet","wrap.testnet"],
		total_fee:5
	},
	...
]
```

---

### Swap

#### estimateSwap

Get swap routes by pools, tokens, input amount. Especially, there is message constraint on **Ledger**, we set `enableSmartRouting` option for developers.

This function integrates smart routing, parallel swap and hybrid stable smart routing algorihtms to get best estimate based on input pools.

**Parameters**

```typescript
interface SwapParams {
  tokenIn: TokenMetadata;
  tokenOut: TokenMetadata;
  amountIn: string;
  simplePools: Pool[];
  options?: SwapOptions;
}

interface SwapOptions {
  enableSmartRouting?: boolean;
  stablePools?: Pool[];
  stablePoolsDetail?: StablePool[];
}
```

**Example**

```typescript
// enableSmartRouting as false, swap from Ref to wNear, with amount 1
const tokenIn = await ftGetTokenMetadata('ref.fakes.testnet');
const tokenOut = await ftGetTokenMetadata('wrap.testnet');

const swapTodos: EstimateSwapView[] = estimateSwap({
  tokenIn,
  tokenOut,
  amountIn: '1',
  simplePools,
});

// enableSmartRouting as true, swap from USDT.e to Dai, with amount 1
const tokenIn = await ftGetTokenMetadata('usdt.fakes.testnet');
const tokenOut = await ftGetTokenMetadata('dai.fakes.testnet');

const options: SwapOptions = {
  enableSmartRouting: true,
  stablePools,
  stablePoolsDetail,
};

const swapTodos: EstimateSwapView[] = estimateSwap({
  tokenIn,
  tokenOut,
  amountIn: '1',
  simplePools,
  options,
});
```

**Response**

```typescript
// enableSmartRouting to false, swap from Ref to wNear, with amount 1

[
  {
    estimate: "0.7338604246699393",
    inputToken: "ref.fakes.testnet",
    outputToken: "wrap.testnet",
    pool:{
      fee: 30,
      id: 38,
      partialAmountIn: "1000000000000000000",
      pool_kind: "SIMPLE_POOL",
      shareSupply: "1000587315520795219676332",
      supplies: {ref.fakes.testnet: '7789776060978885018', wrap.testnet: 								'6467670222256390319335181'},
      token0_ref_price: undefined,
      tokenIds: (2) ['ref.fakes.testnet', 'wrap.testnet'],
      tvl: undefined
    }
  }
]
```

---

#### getPoolEstimate

Get estimate output from single pool, which integrates estimate method on simple pool and stable pool.

**Parameters**

```typescript
{
  tokenIn: TokenMetadata;
  tokenOut: TokenMetadata;
  amountIn: string;
  pool: Pool;
  // please input stablePoolDetail if to estimate output on stable pool or the pool will be recognized as simple pool
  stablePoolDetail?: StablePool;
}
```

**Example**

```typescript
// estimate on simple Pool
const estimate = await getPoolEstimate({
  tokenIn,
  tokenOut,
  amountIn: '1',
  pool: simplePools[0],
});

// estimate on stable pool
const estimate = await getPoolEstimate({
  tokenIn,
  tokenOut,
  amountIn: '1',
  pool: stablePools[0],
  stablePoolDetail: stablePoolsDetail[0],
});
```

**Response**

```typescript
  {
  estimate: "0.7338604246699393",
  inputToken: "ref.fakes.testnet",
  outputToken: "wrap.testnet",
  pool:{
    fee: 30,
    id: 38,
    partialAmountIn: "1000000000000000000",
    pool_kind: "SIMPLE_POOL",
    shareSupply: "1000587315520795219676332",
    supplies: {"ref.fakes.testnet": '7789776060978885018', "wrap.testnet": 								'6467670222256390319335181'},
    token0_ref_price: undefined,
    tokenIds: (2) ['ref.fakes.testnet', 'wrap.testnet'],
    tvl: undefined
    }
  }
```

---

### Transactions

#### instantSwap

Set up transactions from swap routest. Especially, we have to make sure the AccountId had balance storaged in the token in contract, **otherwise the transaction would fail and user lost the input token** **amount**.

For Dapp Developers, we only need to create transactions then fed to wallets.

**Parameters**

```typescript
{
  tokenIn: TokenMetadata;
  tokenOut: TokenMetadata;
  amountIn: string;
  slippageTolerance: number;
  swapTodos: EstimateSwapView[];
  AccountId: string;
}

```

**Example**

```typescript
const transactionsRef: Transaction[] = await instantSwap({
  tokenIn,
  tokenOut,
  amountIn: '1',
  swapTodos,
  slippageTolerance = 0.01,
});
```

**Response**

```typescript
[
  {
    functionCalls: [
      {
        amount: '0.000000000000000000000001',
        args: {
          amount: '1000000000000000000',
          msg:
            '{"force":0,"actions":[{"pool_id":38,"token_in":"ref.fakes.testnet","token_out":"wrap.testnet","amount_in":"1000000000000000000","min_amount_out":"730191122546589600000000"}]}',
          receiver_id: 'ref-finance-101.testnet',
        },
        gas: '180000000000000',
        methodName: 'ft_transfer_call',
      },
    ],
    receiverId: 'ref.fakes.testnet',
  },
];
```

---

#### getSignedTransactionsByMemoryKey (Node)

For makers, it utilizes credentials stored in the local env after `near login` to sign transactions..

**Parameters**

```
{
  transactionsRef: Transaction[];
  AccountId: string;
  keyPath: string;
}
```

**Example**

```typescript
const signedTransactions:nearTransactions.SignedTransaction[] = getSignedTransactionsByMemoryKey({
  transactionsRef;
  AccountId: "your-account-id.testnet",
  keyPath: "/.near-credentials/testnet/your-account-id.testnet.json"
})
```

**Response**

```
[
  SignedTransaction {
    transaction: Transaction {
      signerId: 'your-account-id.testnet',
      publicKey: [PublicKey],
      nonce: 91940092000042,
      receiverId: 'ref.fakes.testnet',
      actions: [Array],
      blockHash: <Buffer 45 e5 fd 36 87 3b 10 59 81 d9 a7 b5 20 c7 29 33 f7 27 48 59 06 90 ca 8a 17 03 5c 25 f2 76 ab 7c>
    },
    signature: Signature { keyType: 0, data: [Uint8Array] }
  }
]
```

---

#### sendTransactionsByMemoryKey (Node)

For makers, it utilizes credentials stored in the local env after `near login` to send transactions..

**Parameters**

```typescript
{
  signedTransactions: nearTransactions.SignedTransaction[];
}
```

**Example**

```typescript
sendTransactionsByMemoryKey({
  signedTransactions,
});
```
