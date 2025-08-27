// src/app/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatEther } from 'viem';

const CHAINS = [
  { id: '11155111', label: 'Sepolia' },
];

const TOKENS = [
  { id: 'ETH', label: 'ETH' },
];

type ApiError = { error: string; ttlSeconds?: number };

export default function Home() {
  const [to, setTo] = useState('');
  const [chain, setChain] = useState<string>('11155111');
  const [token, setToken] = useState<string>('ETH');
  const [balance, setBalance] = useState<string>('');
  const [txHash, setTxHash] = useState<string>('');
  const [loading, setLoading] = useState<'balance' | 'send' | null>(null);
  const [error, setError] = useState<string>('');
  const [captchaChecked, setCaptchaChecked] = useState(false);

  const explorerTxUrl = useMemo(() => {
    // Gather the explorer URL for the tx hash, whenever a tx is made
    if (!txHash) return '';
    // Sepolia default
    if (chain === '11155111') return `https://sepolia.etherscan.io/tx/${txHash}`;
    return '';
  }, [txHash, chain]);

  useEffect(() => {
    // On mount, fetch the faucet balance
    handleCheckBalance();
  }, [])

  async function handleCheckBalance() {
    // Fetch the faucet balance from the backend (can also add params for chain/token)
    setLoading('balance');
    setError('');
    setBalance('');
    try {
      const res = await fetch("http://localhost:2000/faucet-balance");
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as ApiError;
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json() as { chain: string; token: string; balance: string | number };
      const str = typeof data.balance === 'string' ? data.balance : String(data.balance);
      setBalance(str);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch balance');
    } finally {
      setLoading(null);
    }
  }

  async function handleRequestFunds() {
    // Request faucet to send to the specified address
    setLoading('send'); 
    setError(''); 
    setTxHash('');
    try {
      if (!captchaChecked) throw new Error('Please complete the CAPTCHA'); 
      const url = `http://localhost:2000/distribute?to=${to}&chain=${chain}&token=${token}`;
      const res = await fetch(url);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = body as ApiError;
        if (err.error === 'rate limited' && typeof err.ttlSeconds === 'number') {
          const mins = Math.ceil(err.ttlSeconds / 60);
          throw new Error(`Rate limited. Try again in ~${mins} min`);
        }
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const { txHash } = body as { ok: boolean; chain: string; token: string; txHash: string };
      setTxHash(txHash);
    } catch (e: any) {
      setError(e.message || 'Request failed');
    } finally {
      setLoading(null);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: '2rem auto', padding: '1rem' }}>
      <h1 style={{ marginBottom: '1rem' }}>Sepolia Faucet</h1>

      <section style={{ display: 'grid', gap: '0.75rem' }}>
          <div style={{ padding: '0.5rem', background: '#f4f4f5' }}>
            <strong>Faucet Balance:</strong> {balance? formatEther(balance as any): 0} ETH
          </div>

        <label>
          Recipient Address
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="0x…"
            style={{ width: '100%', padding: '0.5rem', marginTop: 4 }}
          />
        </label>

        <label>
          Chain
          <select
            value={chain}
            onChange={(e) => setChain(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginTop: 4 }}
            disabled={true}
          >
            {CHAINS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </label>

        <label>
          Token
          <select
            value={token}
            onChange={(e) => setToken(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginTop: 4 }}
            disabled={true}
          >
            {TOKENS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </label>

        {/* Dummy CAPTCHA*/}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={captchaChecked} onChange={(e) => setCaptchaChecked(e.target.checked)} />
          <span>I am not a robot</span>
        </label>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleRequestFunds} disabled={loading === 'send' || !to} style={{ padding: '0.5rem 0.75rem' }}>
            {loading === 'send' ? 'Sending…' : 'Request Funds'}
          </button>
        </div>

      {txHash && (
        <div style={{ padding: '0.5rem', background: '#ecfeff' }}>
          <strong>Success: </strong>{' '}
          <a
            href={explorerTxUrl}
            target="_blank"
            rel="noreferrer"
            style={{ wordBreak: 'break-all', textDecoration: 'underline', color: '#0c4a6e', fontSize: "16px" }}
          >
            {txHash}
          </a>
        </div>
      )}

        {error && (
          <div style={{ padding: '0.5rem', background: '#fee2e2', color: '#7f1d1d' }}>
            {error}
          </div>
        )}
      </section>

    </main>
  );
}
