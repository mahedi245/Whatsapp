/**
 * Token Bucket Rate Limiter
 * Implements token bucket algorithm to enforce requests per second (RPS) limits
 * in accordance with Meta WhatsApp Cloud API limits (Tier 1: 80 requests/second).
 */
export class TokenBucketRateLimiter {
  private capacity: number;
  private tokens: number;
  private fillRatePerMs: number;
  private lastFillTime: number;

  constructor(tokensPerSecond: number = 25) {
    this.capacity = tokensPerSecond;
    this.tokens = tokensPerSecond;
    this.fillRatePerMs = tokensPerSecond / 1000;
    this.lastFillTime = Date.now();
  }

  private replenish(): void {
    const now = Date.now();
    const elapsed = now - this.lastFillTime;
    const addedTokens = elapsed * this.fillRatePerMs;
    this.tokens = Math.min(this.capacity, this.tokens + addedTokens);
    this.lastFillTime = now;
  }

  async acquire(): Promise<void> {
    while (true) {
      this.replenish();
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }
      // Wait for next token to be available
      const waitTime = Math.ceil((1 - this.tokens) / this.fillRatePerMs);
      await new Promise((resolve) => setTimeout(resolve, Math.max(10, waitTime)));
    }
  }
}
