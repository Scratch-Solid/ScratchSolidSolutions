// Database for Cleaner Profiles and Bookings
// Uses Cloudflare D1 database for data storage

import type { D1Database } from '@cloudflare/workers-types';
import { logger } from './logger';

export interface CleanerProfile {
  id: string;
  paysheetCode: string; // Scratch12345, Solid67890, Trans11111
  firstName: string;
  lastName: string;
  residentialAddress: string;
  cellphone: string;
  email: string; // Optional
  specialties: string[];
  rating: number;
  profilePicture: string; // Base64 or URL
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContact2Name: string;
  emergencyContact2Phone: string;
  department: 'cleaning' | 'digital' | 'transport';
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface CleanerPublicProfile {
  firstName: string;
  lastName: string;
  profilePicture: string;
}

export interface Booking {
  id: string;
  clientId: string;
  clientName: string;
  cleanerId?: string; // Assigned cleaner
  location: string;
  serviceType: string;
  date: string;
  time: string;
  status: 'pending' | 'assigned' | 'on_way' | 'arrived' | 'completed' | 'cancelled';
  specialInstructions?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskCompletion {
  id: string;
  bookingId: string;
  cleanerId: string;
  completedAt: string;
  earnings: number; // R150 per completion
}

// API Functions using D1 database

// Cleaner Profile Functions
export async function getCleanerProfile(db: D1Database, paysheetCode: string): Promise<CleanerProfile | null> {
  try {
    const result = await db.prepare(
      `SELECT * FROM cleaner_profiles WHERE paysheet_code = ? LIMIT 1`
    ).bind(paysheetCode).first();

    if (!result) {
      return null;
    }

    return {
      id: result.id as string,
      paysheetCode: result.paysheet_code as string,
      firstName: result.first_name as string,
      lastName: result.last_name as string,
      residentialAddress: result.residential_address as string,
      cellphone: result.cellphone as string,
      email: result.email as string,
      specialties: JSON.parse(result.specialties as string),
      rating: result.rating as number,
      profilePicture: result.profile_picture as string,
      emergencyContactName: result.emergency_contact_name as string,
      emergencyContactPhone: result.emergency_contact_phone as string,
      emergencyContact2Name: result.emergency_contact_2_name as string,
      emergencyContact2Phone: result.emergency_contact_2_phone as string,
      department: result.department as 'cleaning' | 'digital' | 'transport',
      status: result.status as 'active' | 'inactive',
      createdAt: result.created_at as string,
      updatedAt: result.updated_at as string
    };
  } catch (error) {
    logger.error('Error fetching cleaner profile', error as Error);
    return null;
  }
}

export async function getCleanerProfileById(db: D1Database, id: string): Promise<CleanerProfile | null> {
  try {
    const result = await db.prepare(
      `SELECT * FROM cleaner_profiles WHERE id = ? LIMIT 1`
    ).bind(id).first();

    if (!result) {
      return null;
    }

    return {
      id: result.id as string,
      paysheetCode: result.paysheet_code as string,
      firstName: result.first_name as string,
      lastName: result.last_name as string,
      residentialAddress: result.residential_address as string,
      cellphone: result.cellphone as string,
      email: result.email as string,
      specialties: JSON.parse(result.specialties as string),
      rating: result.rating as number,
      profilePicture: result.profile_picture as string,
      emergencyContactName: result.emergency_contact_name as string,
      emergencyContactPhone: result.emergency_contact_phone as string,
      emergencyContact2Name: result.emergency_contact_2_name as string,
      emergencyContact2Phone: result.emergency_contact_2_phone as string,
      department: result.department as 'cleaning' | 'digital' | 'transport',
      status: result.status as 'active' | 'inactive',
      createdAt: result.created_at as string,
      updatedAt: result.updated_at as string
    };
  } catch (error) {
    logger.error('Error fetching cleaner profile by ID', error as Error);
    return null;
  }
}

export async function getCleanerPublicProfile(db: D1Database, id: string): Promise<CleanerPublicProfile | null> {
  try {
    const result = await db.prepare(
      `SELECT first_name, last_name, profile_picture FROM cleaner_profiles WHERE id = ? LIMIT 1`
    ).bind(id).first();

    if (!result) {
      return null;
    }

    return {
      firstName: result.first_name as string,
      lastName: result.last_name as string,
      profilePicture: result.profile_picture as string
    };
  } catch (error) {
    logger.error('Error fetching cleaner public profile', error as Error);
    return null;
  }
}

export async function getAllCleaners(db: D1Database): Promise<CleanerProfile[]> {
  try {
    const results = await db.prepare(
      `SELECT * FROM cleaner_profiles WHERE status = 'active' ORDER BY created_at DESC`
    ).all();

    return results.results.map(row => ({
      id: row.id as string,
      paysheetCode: row.paysheet_code as string,
      firstName: row.first_name as string,
      lastName: row.last_name as string,
      residentialAddress: row.residential_address as string,
      cellphone: row.cellphone as string,
      email: row.email as string,
      specialties: JSON.parse(row.specialties as string),
      rating: row.rating as number,
      profilePicture: row.profile_picture as string,
      emergencyContactName: row.emergency_contact_name as string,
      emergencyContactPhone: row.emergency_contact_phone as string,
      emergencyContact2Name: row.emergency_contact_2_name as string,
      emergencyContact2Phone: row.emergency_contact_2_phone as string,
      department: row.department as 'cleaning' | 'digital' | 'transport',
      status: row.status as 'active' | 'inactive',
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string
    }));
  } catch (error) {
    logger.error('Error fetching all cleaners', error as Error);
    return [];
  }
}

// Booking Functions
export async function createBooking(db: D1Database, booking: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>): Promise<Booking | null> {
  try {
    const result = await db.prepare(
      `INSERT INTO bookings (client_id, client_name, location, service_type, date, time, status, special_instructions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING *`
    ).bind(
      booking.clientId,
      booking.clientName,
      booking.location,
      booking.serviceType,
      booking.date,
      booking.time,
      booking.status,
      booking.specialInstructions || null
    ).first();

    if (!result) {
      return null;
    }

    return {
      id: result.id as string,
      clientId: result.client_id as string,
      clientName: result.client_name as string,
      cleanerId: result.cleaner_id as string | undefined,
      location: result.location as string,
      serviceType: result.service_type as string,
      date: result.date as string,
      time: result.time as string,
      status: result.status as 'pending' | 'assigned' | 'on_way' | 'arrived' | 'completed' | 'cancelled',
      specialInstructions: result.special_instructions as string | undefined,
      createdAt: result.created_at as string,
      updatedAt: result.updated_at as string
    };
  } catch (error) {
    logger.error('Error creating booking', error as Error);
    return null;
  }
}

export async function getCleanerBookings(db: D1Database, cleanerId: string): Promise<Booking[]> {
  try {
    const results = await db.prepare(
      `SELECT * FROM bookings WHERE cleaner_id = ? ORDER BY date, time`
    ).bind(cleanerId).all();

    return results.results.map(row => ({
      id: row.id as string,
      clientId: row.client_id as string,
      clientName: row.client_name as string,
      cleanerId: row.cleaner_id as string | undefined,
      location: row.location as string,
      serviceType: row.service_type as string,
      date: row.date as string,
      time: row.time as string,
      status: row.status as 'pending' | 'assigned' | 'on_way' | 'arrived' | 'completed' | 'cancelled',
      specialInstructions: row.special_instructions as string | undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string
    }));
  } catch (error) {
    logger.error('Error fetching cleaner bookings', error as Error);
    return [];
  }
}

export async function getPendingBookings(db: D1Database): Promise<Booking[]> {
  try {
    const results = await db.prepare(
      `SELECT * FROM bookings WHERE status = 'pending' ORDER BY date, time`
    ).all();

    return results.results.map(row => ({
      id: row.id as string,
      clientId: row.client_id as string,
      clientName: row.client_name as string,
      cleanerId: row.cleaner_id as string | undefined,
      location: row.location as string,
      serviceType: row.service_type as string,
      date: row.date as string,
      time: row.time as string,
      status: row.status as 'pending' | 'assigned' | 'on_way' | 'arrived' | 'completed' | 'cancelled',
      specialInstructions: row.special_instructions as string | undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string
    }));
  } catch (error) {
    logger.error('Error fetching pending bookings', error as Error);
    return [];
  }
}

export async function getBooking(db: D1Database, bookingId: string): Promise<Booking | null> {
  try {
    const result = await db.prepare(
      `SELECT * FROM bookings WHERE id = ? LIMIT 1`
    ).bind(bookingId).first();

    if (!result) {
      return null;
    }

    return {
      id: result.id as string,
      clientId: result.client_id as string,
      clientName: result.client_name as string,
      cleanerId: result.cleaner_id as string | undefined,
      location: result.location as string,
      serviceType: result.service_type as string,
      date: result.date as string,
      time: result.time as string,
      status: result.status as 'pending' | 'assigned' | 'on_way' | 'arrived' | 'completed' | 'cancelled',
      specialInstructions: result.special_instructions as string | undefined,
      createdAt: result.created_at as string,
      updatedAt: result.updated_at as string
    };
  } catch (error) {
    logger.error('Error fetching booking', error as Error);
    return null;
  }
}

export async function updateBookingStatus(db: D1Database, bookingId: string, status: Booking['status']): Promise<boolean> {
  try {
    const result = await db.prepare(
      `UPDATE bookings SET status = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(status, bookingId).run();

    return result.success;
  } catch (error) {
    logger.error('Error updating booking status', error as Error);
    return false;
  }
}

export async function assignCleanerToBooking(db: D1Database, bookingId: string, cleanerId: string): Promise<boolean> {
  try {
    const result = await db.prepare(
      `UPDATE bookings SET cleaner_id = ?, status = 'assigned', updated_at = datetime('now') WHERE id = ?`
    ).bind(cleanerId, bookingId).run();

    return result.success;
  } catch (error) {
    logger.error('Error assigning cleaner to booking', error as Error);
    return false;
  }
}

// Task Completion Functions
export async function createTaskCompletion(db: D1Database, completion: Omit<TaskCompletion, 'id'>): Promise<TaskCompletion | null> {
  try {
    const result = await db.prepare(
      `INSERT INTO task_completions (booking_id, cleaner_id, completed_at, earnings)
       VALUES (?, ?, ?, ?)
       RETURNING *`
    ).bind(
      completion.bookingId,
      completion.cleanerId,
      completion.completedAt,
      completion.earnings
    ).first();

    if (!result) {
      return null;
    }

    return {
      id: result.id as string,
      bookingId: result.booking_id as string,
      cleanerId: result.cleaner_id as string,
      completedAt: result.completed_at as string,
      earnings: result.earnings as number
    };
  } catch (error) {
    logger.error('Error creating task completion', error as Error);
    return null;
  }
}

export async function getCleanerTaskCompletions(db: D1Database, cleanerId: string): Promise<TaskCompletion[]> {
  try {
    const results = await db.prepare(
      `SELECT * FROM task_completions WHERE cleaner_id = ? ORDER BY completed_at DESC`
    ).bind(cleanerId).all();

    return results.results.map(row => ({
      id: row.id as string,
      bookingId: row.booking_id as string,
      cleanerId: row.cleaner_id as string,
      completedAt: row.completed_at as string,
      earnings: row.earnings as number
    }));
  } catch (error) {
    logger.error('Error fetching cleaner task completions', error as Error);
    return [];
  }
}
