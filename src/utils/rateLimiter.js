const attemptsByApi = new Map();

const WINDOW_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

export function checkAndRecordAttempt(apiKey) {
    const now = Date.now();
    const timestamps = attemptsByApi.get(apiKey) || [];

    const recent = timestamps.filter(ts => now - ts < WINDOW_MS);

    if (recent.length >= MAX_ATTEMPTS) {
        const oldest = recent[0];
        const waitMs = oldest + WINDOW_MS - now;
        const retryAfterSeconds = Math.max(1, Math.ceil(waitMs / 1000));

        attemptsByApi.set(apiKey, recent);
        return { allowed: false, retryAfter: retryAfterSeconds };
    }

    recent.push(now);
    attemptsByApi.set(apiKey, recent);
    return { allowed: true };
}

export function resetRateLimits() {
    attemptsByApi.clear();
}