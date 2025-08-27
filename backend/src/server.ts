import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { createPublicClient, createWalletClient, http, Account,PublicClient, isAddress, formatEther, zeroHash} from 'viem';
import { mainnet, sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { fetchFaucetBalance } from './utils';
import { RateLimiter } from './rateLimiter';

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const MAINNET_RPC_URL = process.env.MAINNET_RPC_URL;
const PK_FAUCET = process.env.PK_FAUCET || '0x';
const RATE_LIMIT_TTL_SECONDS = Number(process.env.RATE_LIMIT_TTL_SECONDS || '3600');
const PORT = Number(process.env.PORT || '2000');
const ETH_THRESHOLD: bigint = 1000000000000000n; // 0.001 ETH
const FAUCET_DISTRIBUTION_AMOUNT: bigint = 10000000000000000n; // 0.01 ETH

const clients: {[x: string]: PublicClient} = {
	'1': createPublicClient({ chain: mainnet, transport: http(MAINNET_RPC_URL) }),
	'11155111': createPublicClient({ chain: sepolia, transport: http(SEPOLIA_RPC_URL) })
	// testnet clients can be added to extend faucet functionality
}

const rateLimiter = new RateLimiter(11155111, RATE_LIMIT_TTL_SECONDS, true, true);

// IMPORTANT - Production should use a more secure, encrypted solution for PK access
const account: Account = privateKeyToAccount(PK_FAUCET as `0x${string}`); // Viem account for signatures and txs
const wallet = createWalletClient({ chain: sepolia, transport: http(SEPOLIA_RPC_URL), account });
const faucetAddress = account.address as `0x${string}`;


const app = express();
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET'],
}));

// Faucet balance endpoint
app.get('/faucet-balance', async (req, res) => {
	try {
		const token = String(req.query.token || ''); // For later support for ERC-20 token distribution
		const chain = String(req.query.chain || '11155111'); // default to sepolia
		const client = clients[chain];
		if (!client) return res.status(400).json({ error: 'unsupported chain' });
		
		const balance: BigInt = await fetchFaucetBalance({
			faucetAddress,
			client,
			token
		});
		
		return res.json({ chain, token, balance: balance.toString() });
	} catch (e: any) {
		res.status(400).json({ error: e?.message || 'bad request' });
	}
});

// Faucet distribution endpoint 
app.get('/distribute', async (req, res) => {
	try {
		// Extract IP Address
		const clientIp: string = req.headers['x-forwarded-for']
		? (req.headers['x-forwarded-for'] as string).split(',')[0].trim()
		: ""
		
		// Get the req params. While only the toAddr is used in the demo atm, the point is to be extensible for chains/assets
		const chain = String(req.query.chain || '11155111'); // default to sepolia
		const token = String(req.query.token || 'ETH'); // Token address param, support for ERC-20 token distribution
		const toAddr = String(req.query.to || '');
		
		const client = clients[chain];
		if (!isAddress(toAddr)) return res.status(400).json({ error: 'Invalid recipient address' });
		if (rateLimiter.isLimited({ip: clientIp, addr: toAddr})) return res.status(429).json({ error: 'rate limited', ttlSeconds: RATE_LIMIT_TTL_SECONDS });
		if (!client) return res.status(400).json({ error: 'unsupported chain' });
		
		
		// read recipient MAINNET ETH balance, prevent abuse
		const mainnetEthBalance: bigint = await clients["1"].getBalance({ address: toAddr as `0x${string}`});
		console.log("Mainnet ETH balance for " + toAddr + " is", formatEther(mainnetEthBalance));
		if (mainnetEthBalance < ETH_THRESHOLD) return res.status(400).json({ error: 'Recipient has no mainnet ETH' });
		
		const faucetBalance: bigint = await fetchFaucetBalance({
			faucetAddress,
			client,
			token
		});
		
		if (faucetBalance < FAUCET_DISTRIBUTION_AMOUNT) return res.status(400).json({ error: 'insufficient faucet balance' });
		
		
		let txHash: `0x${string}` = zeroHash;
		if (isAddress(token)) {
			// ERC20 token faucet logic 
			// const data = encodeFunctionData({ abi: erc20Abi, functionName: 'transfer', args: [toAddr as  `0x${string}`, req.params.amount] });
			// const txHash = await wallet.sendTransaction({ to: token, data: data as any });
		} else {
			txHash = await wallet.sendTransaction({ to: toAddr as `0x${string}`, value: FAUCET_DISTRIBUTION_AMOUNT });
		}
		
		// Mark address and IP as having received faucet distribution at timestamp
		rateLimiter.markAddr(toAddr, RATE_LIMIT_TTL_SECONDS);
		rateLimiter.markIp(clientIp, RATE_LIMIT_TTL_SECONDS);
		return res.json({ ok: true, chain, token, txHash });
	} catch (e: any) {
		res.status(400).json({ error: e?.message || 'Bad request' });
	}
});

app.listen(PORT, () => console.log(`Faucet backend listening on http://localhost:${PORT}`));
