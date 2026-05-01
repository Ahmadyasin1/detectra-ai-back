function calculateDelay(
  attempt: number,
  options: RetryOptions,
  lastResponseStatus?: number
): number {
  const baseDelayMs     = options.baseDelayMs ?? DEFAULT_RETRY_OPTIONS.baseDelayMs;
  const backoffMultiplier = options.backoffMultiplier ?? DEFAULT_RETRY_OPTIONS.backoffMultiplier;
  const maxDelayMs      = options.maxDelayMs ?? DEFAULT_RETRY_OPTIONS.maxDelayMs;
  const retryableStatuses = options.retryableStatuses ?? DEFAULT_RETRY_OPTIONS.retryableStatuses;

  if (lastResponseStatus === 401 || 
      (lastResponseStatus && lastResponseStatus >= 400 && lastResponseStatus < 500 && 
       !retryableStatuses.includes(lastResponseStatus))) {
    return -1;
  }

  const exponentialDelay = baseDelayMs * Math.pow(backoffMultiplier, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay;
  const delay = Math.min(exponentialDelay + jitter, maxDelayMs);
  return Math.max(delay, baseDelayMs);
}