import { erc20Abi, getAddress, isAddress, PublicClient } from "viem";

export async function fetchFaucetBalance(opts: {
    faucetAddress: `0x${string}`;
    client: PublicClient;
    token?: string; // An ERC-20 address in the case faucet enables other tokens
}): Promise<bigint> {
    if (!opts.client) throw new Error('unsupported chain');
    
    try {
        const token = (opts.token || '').trim();
        if (isAddress(token)) {
            const tokenAddr = getAddress(token);
            return opts.client.readContract({
                address: tokenAddr,
                abi: erc20Abi,
                functionName: 'balanceOf',
                args: [opts.faucetAddress],
            });
        }
        return opts.client.getBalance({ address: opts.faucetAddress });
    } catch (err) {
        return 0n;
    }
}