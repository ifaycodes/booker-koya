import { isSet } from "util/types";
import { createIdempotencyRepository } from "../models/idempotencyRepository.js";
import { pool } from "../models/pool.js";
import crypto from 'crypto'

export async function checkIdempKey(idempKey, body) {
    if (!idempKey) return { isSet: false };

    const client = await pool.connect();
    try {
        const idempRepo = createIdempotencyRepository(client);
        let bodyhash = crypto.createHash('sha256').update(JSON.stringify(body ?? {}))
            .digest('hex');

        const existing = await idempRepo.getKey(idempKey);
        if (existing) {
            if (existing.body_hash !== bodyhash) {
                return { isSet: true, status: 422, message: 'Idempotency Key reused  with a different body'};
            }
            return { isSet: true, status: existing.status_code, data: existing.response_body}
        }
        
        return { isSet: false, bodyhash};
    } finally {
        client.release();
    }
}

export async function saveIdempKey(idempKey, bodyHash, statusCode, data) {
    if (!idempKey || !bodyHash) return;

    const client = await pool.connect();
    try {
        const idempRepo = createIdempotencyRepository(client);
        await idempRepo.saveKey(idempKey, bodyHash, statusCode, data);
    } catch (err) {
        console.error("Couldn't save idempotency key:", err.message)
    } finally {
        client.release();
    }
}