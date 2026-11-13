export function createIdempotencyRepository(db) {
    return {
        async getKey(key) {
            const { rows } = await db.query(
                `SELECT * FROM idempotency_keys WHERE key = $1`,
                [key]
            );
            return rows[0] || null;
        },

        async saveKey(key, bodyHash, statusCode, responseBody) {
            await db.query(
                `INSERT INTO idempotency_keys (key, body_hash, status_code, response_body)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (key) DO NOTHING`,
                [key, bodyHash, statusCode, JSON.stringify(responseBody)]
            );
        },

        async clearAll() {
            await db.query(`DELETE FROM idempotency_keys;`);
        }
    };
}