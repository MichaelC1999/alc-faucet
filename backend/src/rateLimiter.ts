// rateLimiter.ts
import type { Address } from 'viem';


export class RateLimiter {
  private ipSeen: Record<string, number> = {};
  private addrSeen: Record<string, number> = {};
  private readonly defaultTtl: number;
  private readonly chainId: number;
  private readonly checkIp: boolean = false;
  private readonly checkAddr: boolean = false;
  
  constructor(chain: number, defaultTtlSeconds?: number, checkIp = false, checkAddr = false) {
    this.defaultTtl = defaultTtlSeconds ?? 3600;
    this.chainId = chain;
    this.checkIp = checkIp;
    this.checkAddr = checkAddr;
  }

  isLimited(opts: {ip?: string, addr?: Address}): boolean {
    if (this.checkIp, opts.ip && this.isIpLimited(opts.ip)) return true;
    if (this.checkAddr, opts.addr && this.isAddrLimited(opts.addr)) return true;
    return false;
  }
  
  isIpLimited(ip: string): boolean {
    const exp = this.ipSeen[ip];
    if (!exp) return false;
    const now = Math.floor(Date.now() / 1000);
    
    if (now > exp) { delete this.ipSeen[ip]; return false; }
    return true;
  }
  
  markIp(ip: string, ttlSeconds?: number) {
    const now = Math.floor(Date.now() / 1000);
    this.ipSeen[ip] = now + (ttlSeconds ?? this.defaultTtl);
  }
  
  isAddrLimited(addr: Address): boolean {
    const exp = this.addrSeen[addr];
    if (!exp) return false;
    const now = Math.floor(Date.now() / 1000);
    
    if (now > exp) { delete this.addrSeen[addr]; return false; }
    return true;
  }
  
  markAddr(addr: Address | string, ttlSeconds?: number) {
    const now = Math.floor(Date.now() / 1000);
    this.addrSeen[addr as string] = now + (ttlSeconds ?? this.defaultTtl);
  }
  
  clear() {
    this.ipSeen = {}
    this.addrSeen = {}
  }
}
