# Sepolia Faucet — Monorepo Setup Guide

This repo has two apps:

- `/backend` — Node/Express faucet API
- `/frontend` — Next.js UI

---

## 1) Backend setup (`/backend`)

**Install dependencies**  
`cd backend`  
`npm install`

**Configure environment**  
`cp .env.example .env`

Fill in the required values in `.env`. You will need an Alchemy API key enabled for Sepolia/Mainnet

**Run the backend locally**  
`npm run dev`

**Quick test**  
Check the faucet balance

`curl "http://localhost:2000/faucet-balance?chain=11155111&token=ETH"`

Get some faucet tokens (through terminal)
`curl "http://localhost:2000/distribute?to={{RECIPIENT_ADDRESS}}&chain=11155111&token=ETH"`

### Important considerations

- Rate limiting allows for a token transfer once every hour per IP address/address.
- Rate limiting data is stored in memory. If you are using this faucet locally, expect rate limiting to reset upon server restarts.
- 0.001 ETH on Mainnet is necessary to use the faucet
- The faucet was designed to be extendable to different testnets, assets, and even test functionalities. While not functional, some logic was placed to demonstrate this flexibility

---

## 2) Frontend setup

Open a new terminal tab:  
`cd frontend`  
`npm install`

**Run the frontend locally**  
`npm run dev`

Frontend will be available at:  
`http://localhost:3000`

---

## 3) Endpoints

#### Note

In these endpoints, the chain and token parameters are optional. This was included to demonstrate some level of composability and a later extension to supporting different networks/assets.

- **Get faucet balance**  
  `GET /faucet-balance?chain=11155111&token=ETH`  
  Response: `{ chain, token, balance }`

- **Request funds**  
  `GET /distribute?to={{RECIPIENT_ADDRESS}}&chain=11155111&token=ETH`  
  Success: `{ ok: true, chain, token, txHash }`  
  Errors may include:
  - `{ error: "Invalid recipient address" }`
  - `{ error: "rate limited", ttlSeconds }`
  - `{ error: "unsupported chain" }`
  - `{ error: "insufficient faucet balance" }`
  - `{ error: "Recipient has no mainnet ETH" }`
