export function createBookingRepository(db) {
    return {
        async bookSlot(slot_id, name, email){
            const result = await db.query(
                `INSERT INTO bookings (slot_id, name, email)
                VALUES ($1, $2, $3)
                ON CONFLICT (slot_id) WHERE status = 'confirmed' DO NOTHING
                RETURNING *`,
                [slot_id, name, email]
            );
            await db.query(`
                UPDATE slots
                SET status = 'booked', available = false
                WHERE id = $1;`, [slot_id]);
            
            return result.rows[0];
        },

        async getBookings(email) {
            const result = await db.query(
                `SELECT *
                FROM bookings 
                WHERE email = $1 ORDER BY created_at ASC, id ASC`, [email]
            );
            return result.rows;
        },

        async getABooking(id) {
            const result = await db.query(
                `SELECT * FROM bookings WHERE id = $1`, [id]
            );
            return result.rows[0];
        },

        async cancelBooking(id, slot_id) {
            const result = await db.query(
                `UPDATE bookings SET status = 'cancelled' WHERE id = $1 AND status = 'confirmed' RETURNING *;`,
                [id] );

            if (result.rows.length === 0) {
                return null;
            }

            await db.query(`
                UPDATE slots SET status = 'available', available = true WHERE id = $1;`, [slot_id] );
            return result.rows[0];
        },

        async clearTable() {
            await db.query(
                `DELETE FROM bookings`
            );

            await db.query(
                `DELETE FROM slots`
            );

            await db.query(
                `DELETE FROM idempotency_keys`
            );
            return 'Tables are clear and ready for data'
        },

        async resetSlot({ id, provider, start, end }) {
            const result = await db.query(
                `UPDATE slots SET status = 'available'
                WHERE id = $1`, [id, provider, start, end]
            );
            return result.rows[0];
        }
    }
}