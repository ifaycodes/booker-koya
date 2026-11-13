export async function seedInitialSlots(db) {
    const { rows } = await db.query('SELECT COUNT(*) FROM slots;');
    if (parseInt(rows[0].count, 10) > 0) {
        console.log('Slots already seeded.');
        return;
    }

    console.log('Seeding initial clinic slots...');

    const providers = ['Dr Ade', 'Dr Ngozi', 'Dr Ibrahim'];
    const hours = [9, 11, 13, 15];

    const slotsToInsert = [];
    const today = new Date();

    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
        const currentDate = new Date(today);
        currentDate.setDate(today.getDate() + dayOffset);

        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            continue;
        }

        for (const hour of hours) {
            for (const provider of providers) {
                const start = new Date(currentDate);
                start.setHours(hour, 0, 0, 0);

                const end = new Date(start);
                end.setHours(hour + 1, 0, 0, 0);

                const dateStr = start.toISOString().slice(0, 10).replace(/-/g, '');
                const provSlug = provider.toLowerCase().replace(/[^a-z0-9]/g, '');
                const id = `s_${dateStr}_${hour}_${provSlug}`;

                slotsToInsert.push({
                    id,
                    provider,
                    start: start.toISOString(),
                    end: end.toISOString()
                });
            }
        }
    }

    for (const slot of slotsToInsert) {
        await db.query(
            `INSERT INTO slots (id, provider, start, "end", available)
             VALUES ($1, $2, $3, $4, true)
             ON CONFLICT (id) DO NOTHING;`,
            [slot.id, slot.provider, slot.start, slot.end]
        );
    }

    console.log(`Successfully seeded ${slotsToInsert.length} slots.`);
}