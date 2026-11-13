const attemptsByEmail = new Map();

const WINDOW_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

export function checkAndRecordAttempt(email) {
    const now = Date.now();
    const timestamps = attemptsByEmail.get(email) || [];

    const recent = timestamps.filter(ts => now - ts < WINDOW_MS);

    if (recent.length >= MAX_ATTEMPTS) {
        const oldest = recent[0];
        const waitMs = oldest + WINDOW_MS - now;
        const retryAfterSeconds = Math.max(1, Math.ceil(waitMs / 1000));

        attemptsByEmail.set(email, recent);
        return { allowed: false, retryAfter: retryAfterSeconds };
    }

    recent.push(now);
    attemptsByEmail.set(email, recent);
    return { allowed: true };
}

export function resetRateLimits() {
    attemptsByEmail.clear();
}