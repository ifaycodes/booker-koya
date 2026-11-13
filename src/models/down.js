import 'dotenv/config';
import { down } from './migrations.js';
import { pool } from './pool.js';

async function runDown() {
    console.log('Dropping all tables...');
    try {
        await down(pool);
        console.log('All tables successfully dropped.');
    } catch (err) {
        console.error('Error dropping tables:', err);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

runDown();