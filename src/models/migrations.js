export async function up(db) {
    await db.query('BEGIN');
    try {    
        await db.query(`
            CREATE TABLE IF NOT EXISTS slots (
                id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
                provider        VARCHAR(100) NOT NULL,
                status          VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'booked')),
                start           TIMESTAMPTZ NOT NULL,
                "end"             TIMESTAMPTZ NOT NULL,
                available       BOOLEAN NOT NULL DEFAULT 'true'

            );
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS bookings (
                id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
                slot_id         TEXT NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
                name            VARCHAR(100) NOT NULL,
                email           VARCHAR(150) NOT NULL,
                status          VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
                created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);

        await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_confirmed_slot ON bookings (slot_id) WHERE status = 'confirmed';`);

        await db.query(`
            CREATE TABLE IF NOT EXISTS idempotency_keys (
                key TEXT PRIMARY KEY,
                body_hash TEXT NOT NULL,
                status_code INT NOT NULL,
                response_body JSONB NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
        
        await db.query('COMMIT');
    } catch (error) {
        await db.query('ROLLBACK');
        throw error;
    }
}

export async function down(db) {
    await db.query('BEGIN');
    try {
        // Drop in reverse to avoid foreign key dependency crash
        await db.query('DROP TABLE IF EXISTS bookings;');
        await db.query('DROP TABLE IF EXISTS slots;');
        await db.query('DROP TABLE IF EXISTS idempotency_keys;');
        await db.query('COMMIT');
    } catch (error) {
        await db.query('ROLLBACK');
        throw error;
    }
}