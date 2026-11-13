import { Router } from "express";

import { addBooking, getBookingDetails, getBookings, cancelBooking, getAvailableSlots, resetAndPopulate } from "../services/booker.js";
import crypto from 'crypto'
import { checkAndRecordAttempt, resetRateLimits } from "../utils/rateLimiter.js";
import { createIdempotencyRepository } from "../models/idempotencyRepository.js";
import { pool } from "../models/pool.js";
import { checkIdempKey, saveIdempKey } from "../services/idempSet.js";

const router = Router();

router.get('/slots', async (req, res) => {
    try {
        const {provider} = req.query;

        const slots = await getAvailableSlots(provider || null);
        if (!slots.success) {
            return res.status(400).json({
                error: slots.message,
            })
        }
        res.status(200).json({ slots: slots.data});
    } catch (err) {
        console.error('[Route] Unexpected error:', err);
        res.status(500).json({
            error: 'Internal server error', err
        });
    }
})

router.post('/bookings', async (req, res) => {
    try {
        const idempKey = req.get('Idempotency-Key');
        const apiKey = req.get('X-API-Key');
        let {slot_id, name, email} = req.body;
        
        if (!slot_id || !name || !email) {
            return res.status(400).json({
                error: "all fields are required"
            });
        }  
        if (!areStrings(slot_id, email, name)) {
            return res.status(400).json({
                error: "please enter valid strings"
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        name = name.trim();
        email = email.toLowerCase().trim();
        slot_id = slot_id.trim();

        const limitCheck = checkAndRecordAttempt(apiKey);
        if (!limitCheck.allowed) {
            res.set('Retry-After', String(limitCheck.retryAfter));
            return res.status(429).json({ error: 'Too many attempts for this email' });
        }

        const idempCheck = await checkIdempKey(idempKey, req.body);
        if (idempCheck.isSet) {
            if(idempCheck.error) {
                return res.status(idempCheck.status).json({error: idempCheck.error});
            }
            return res.status(idempCheck.status).json(idempCheck.data);
        }

        const createBooking = await addBooking(slot_id, name, email);
        if (!createBooking.success) {
            return res.status(createBooking.status || 500).json({
                error: createBooking.message
            })
        }

        await saveIdempKey(idempKey, idempCheck.bodyhash, 201, createBooking.data);

        res.status(201).json(createBooking.data);
    } catch (err) {
        console.error('[Route] Unexpected error: ', err);
        res.status(500).json({
            error: 'Internal server error', err
        });
    }
})

router.get('/bookings', async (req, res) => {
    try {
        let { email, cursor } = req.query;
        let limit = req.query.limit !== undefined ? Number(req.query.limit) : 10;

        if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
            return res.status(400).json({ error: 'invalid limit' });
        }

        if (!areStrings(email) || !email) {
            return res.status(400).json({error: "please enter valid email address"});
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
        email = email.toLowerCase().trim();

        const allBookings = await getBookings(email, limit, cursor);
        if (!allBookings.success) {
            return res.status(allBookings.status || 404).json({
                error: allBookings.message
            })
        }
        res.status(200).json(allBookings.data);
    } catch (err) {
        console.error('[Route] Unexpected error:', err);
        res.status(500).json({error: 'Internal server error', err });
    }
})

router.get('/bookings/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({
                error: "provide booking id"
            });
        }
        const details = await getBookingDetails(id);
        if (!details.success) {
            return res.status(404).json({
                error: details.message
            })
        }
        res.status(200).json(details.data);
    } catch (err) {
        console.error('[Route] Unexpected error:', err);
        res.status(500).json({
            error: 'Internal server error', err
        });
    }
})

router.delete('/bookings/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({
                error: "please provide booking id"
            });
        }
        const cancellation = await cancelBooking(id);
        if (!cancellation.success) {
            return res.status(cancellation.status || 404).json({
                error: cancellation.message
            })
        }
        res.status(200).json(cancellation.message);
    } catch (err) {
        console.error('[Route] Unexpected error:', err);
        res.status(500).json({
            error: 'Internal server error', err
        });
    }
})

router.post('/reset', async (req, res) => {
    try {
        const { slots } = req.body;

        if (!Array.isArray(slots)) {
            return res.status(400).json({
                error: "slots cannot be empty"
            });
        }

        const resetAll = await resetAndPopulate(slots);
        if (!resetAll.success) {
            return res.status(400).json({
                    error: resetAll.message
                })
        }
        res.status(200).json({ok: true});
    } catch (err) {
        console.error('[Route] Unexpected error: ', err);
        res.status(500).json({
            error: 'Internal server error', err
        });
    }
})

function areStrings(...values) {
  return values.every((val) => typeof val === 'string' && val.trim().length > 0);
}

export default router;