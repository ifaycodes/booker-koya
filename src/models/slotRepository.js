export function createSlotRepository(db) {
    return {
        async seeAvailableSlots(provider=null){
            const result = await db.query(
                `SELECT id, provider, start, "end", available FROM slots 
                WHERE ($1::text IS NULL OR provider = $1) 
                ORDER BY start ASC`,
                [provider]
            )
            return result.rows;
        },

        async selectSlotForBooking(id) {
            const { rows } = await db.query(
                `SELECT * FROM slots WHERE id = $1 FOR UPDATE`, [id]
            );
            return rows[0] || null;
        },
    }
}