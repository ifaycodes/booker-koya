import { createBookingRepository } from "../models/bookingRepositiory.js";
import { createSlotRepository } from "../models/slotRepository.js";
import { pool } from "../models/pool.js";
import { resetRateLimits } from "../utils/rateLimiter.js";

export async function addBooking(id, name, email) {
    const client = await pool.connect();

    const bookingRepo = createBookingRepository(client);
    const slotRepo = createSlotRepository(client);

    try {
        await client.query('BEGIN');

        const slotAvailable = await slotRepo.selectSlotForBooking(id);
        if (!slotAvailable) { 
            await client.query('ROLLBACK');
            return { success: false, status: 404, message: 'slot not found' };
        }
        if (new Date(slotAvailable.start) <= new Date()) {
            await client.query('ROLLBACK');
            return { success: false, status: 400, message: 'slot has already started' };
        }
        if (!slotAvailable.available) {
            await client.query('ROLLBACK');
            return { success: false, status: 409, message: 'slot already booked' };
        }

        const booking = await bookingRepo.bookSlot(id, name, email);
        if (booking == null) { 
            await client.query('ROLLBACK');
            return { success: false, message: 'Failed to create booking' };
        };

        await client.query('COMMIT');
        return { success: true, message: "Booking Confirmed. Here's your details: ", data: booking };
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[Manager] Something went wrong: ', err.message);
        return { success: false, message: 'internal server error' };
    } finally {
        client.release();
    }
}

export async function getBookings(email, limit = 10, cursor = null) {
    const client = await pool.connect();
    const bookingRepo = createBookingRepository(client);

    try {
        const allBookings = await bookingRepo.getBookings(email);
        if (allBookings == null) { 
            return { success: false, message: 'No bookings for this email' }
        };

        let startIndex = 0;
        if (cursor) {
            let cursorId;
            try {
                cursorId = Buffer.from(cursor, 'base64').toString('utf-8');
            } catch {
                return { success: false, status: 400, message: 'Invalid cursor' };
            }

            const index = allBookings.findIndex(b => b.id === cursorId);
            if (index === -1) {
                return { success: false, status: 400, message: 'Invalid cursor' };
            }
            startIndex = index + 1;
        }

        const pageBookings = allBookings.slice(startIndex, startIndex + limit);
        const hasMore = startIndex + limit < allBookings.length;
        let next_cursor = null;
        if (hasMore && pageBookings.length > 0) {
            const lastBooking = pageBookings[pageBookings.length - 1];
            next_cursor = Buffer.from(lastBooking.id).toString('base64');
        }
        return {
            success: true,
            data: {
                bookings: pageBookings,
                next_cursor: next_cursor
            }
        };
    } catch (err) {
        console.error('[Manager] Failed to get paginated bookings: ', err.message);
        return { success: false, status: 500, message: 'Internal server error' };
    } finally {
        client.release();
    }
}

export async function getBookingDetails(id) {
    const client = await pool.connect();
    const bookingRepo = createBookingRepository(client);

    try {
        const bookingDetail = await bookingRepo.getABooking(id);
        if (bookingDetail == null) { 
            return { success: false, message: 'booking not found' };
        };
        return { success: true, data: bookingDetail };
    } catch (err) {
        console.error('[Manager] Something went wrong: ', err.message);
    } finally {
        client.release();
    }
}

export async function cancelBooking(id) {
    const client = await pool.connect();
    const bookingRepo = createBookingRepository(client);

    try {
        const booking = await bookingRepo.getABooking(id);
        if (booking == null) { 
            return { success: false, status: 404, message: 'booking not found' };
        };
        let slot_id = booking.slot_id;

        const cancel = await bookingRepo.cancelBooking(id, slot_id);
        if (!cancel) {
            await client.query('ROLLBACK');
            return { success: false, status: 409, message: 'slot already cancelled' };
        }
        return { success: true, message: cancel}
    } catch (err) {
        console.error('[Manager] Something went wrong: ', err.message);
    } finally {
        client.release();
    }
}

export async function getAvailableSlots(provider=null) {
    const client = await pool.connect();
    const slotRepo = createSlotRepository(client);

    try {
        const availableSlots = await slotRepo.seeAvailableSlots(provider);
        if (!availableSlots) { 
            return { success: false, message: `there are no available slots. Please try again later.` };
        };
        return { success: true, data: availableSlots };
    } catch (err) {
        console.error('[Manager] Something went wrong: ', err.message);
        return { success: false, message: 'Internal server error' };
    } finally {
        client.release();
    }
}

export async function resetAndPopulate(slots) {
    const client = await pool.connect();
    const bookingRepo = createBookingRepository(client);

    try {
        await client.query('BEGIN');

        try {
            await bookingRepo.clearTable();
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('[Manager] Something went wrong: ', err.message);
            return { success: false, message: "Couldn't clear table" };
        }

        for (const slot of slots) {
            let id = slot.id; 
            let provider = slot.provider;
            let start = slot.start;
            let end = slot.end;
            try {
                await client.query(`
                    INSERT INTO slots (id, provider, start, "end", available)
                    VALUES ($1, $2, $3, $4, true)
                `, [id, provider, start, end])
            } catch (err) {
                await client.query('ROLLBACK');
                console.error('[Manager] Something went wrong: ', err.message);
                return { success: false, message: 'Could not insert into Slots table' };
            } 
        }

        resetRateLimits();

        await client.query('COMMIT');
        return { success: true };
    } catch (err) {
        console.error('[Manager] Something went wrong: ', err.message);
    } finally {
        client.release();
    }
}