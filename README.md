# Koya Clinic Booking API

A RESTful booking API for a clinic that lets patients view available appointment slots, make bookings, and manage them. Includes a simple web interface.

## Features

- **Level 1** — List slots, book one, look up a booking
- **Level 2** — API key authentication, input validation
- **Level 3** — Concurrency-safe bookings, cancellation
- **Level 4** — Idempotent requests, cursor-based pagination
- **Level 5** — Per-email rate limiting (5 requests/minute)

## Tech Stack

- **Runtime**: Node.js (ESM)
- **Framework**: Express v5
- **Database**: PostgreSQL
- **Frontend**: Vanilla HTML/CSS/JS

## API Reference

Full OpenAPI spec: [koyaacademy.com/assessment-api](https://koyaacademy.com/assessment-api)

Every request requires the `X-API-Key` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/reset` | Replace all slots |
| `GET` | `/slots` | List all slots |
| `POST` | `/bookings` | Book a slot |
| `GET` | `/bookings` | List bookings (paginated) |
| `GET` | `/bookings/:id` | Get a booking |
| `DELETE` | `/bookings/:id` | Cancel a booking |

## Running Locally

1. Clone the repo:
   ```bash
   git clone https://github.com/ifaycodes/booker-koya.git
   cd booker-koya

### Install dependencies:
```bash
npm install
```

### Create a .env file in the project root
```bash
DATABASE_URL=postgres://your_db_url
API_KEY=your_secret_key
PORT=3000
```

### Start the server:
```bash
npm start
```

The app runs on http://localhost:3000.

## Project Folder
```bash
├── index.js                   # App entry point
├── public/
│   └── index.html             # Web interface
└── src/
    ├── models/
    │   ├── migrations.js       # DB schema setup
    │   ├── seedSlots.js        # Initial slot seeder
    │   ├── pool.js             # Postgres connection pool
    │   ├── slotRepository.js   # Slot DB queries
    │   ├── bookingRepositiory.js # Booking DB queries
    │   └── idempotencyRepository.js # Idempotency DB queries
    ├── services/
    │   ├── booker.js           # Business logic
    │   └── idempSet.js         # Idempotency logic
    ├── routes/
    │   └── routes.js           # Express route handlers
    └── utils/
        └── rateLimiter.js      # Sliding window rate limiter
```
