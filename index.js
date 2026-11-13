import express from 'express'
import router from './src/routes/routes.js';
import { up, down } from './src/models/migrations.js';
import { pool } from './src/models/pool.js';
import { seedInitialSlots } from './src/models/seedSlots.js';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

async function bootstrap() {
    await up(pool);
    await seedInitialSlots(pool);
}
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express()
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
    if (req.path === '/' || !req.path.startsWith('/api') && (req.path.endsWith('.html') || req.path.endsWith('.css') || req.path.endsWith('.js'))) {
        return next();
    }

    const apiKey = req.get('X-API-Key');
    if (!apiKey || apiKey !== process.env.API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
});

app.use('', router);

app.get('/', (req, res) => {
    res.json('Welcome to Application Booker')
});

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
    console.log('Listening on port: ' + port);
})

bootstrap()
    .then(() => console.log('Booking Service is ready'))
    .catch((err) => {
        console.error('Fatal start up error: ', err);
        process.exit(1);
    });