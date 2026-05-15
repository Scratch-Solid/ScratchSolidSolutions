-- Migration: Add transparency system tables
-- This migration creates tables for GPS tracking, photos, feedback, checklists, loyalty, referrals, geofences, and client preferences
-- Created: 2026-05-14
-- Phase 1: Database Schema & Infrastructure Setup

-- Locations table for transport fees
CREATE TABLE IF NOT EXISTS locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  area_name TEXT UNIQUE NOT NULL,
  base_transport_fee REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Quote logs table for audit trail
CREATE TABLE IF NOT EXISTS quote_logs (
  id TEXT PRIMARY KEY,
  created_at TEXT DEFAULT (datetime('now')),
  data_payload JSON NOT NULL
);

-- Cleaner photos table for photo verification
CREATE TABLE IF NOT EXISTS cleaner_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  photo_type TEXT NOT NULL CHECK(photo_type IN ('before', 'after')),
  photo_url TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  gps_lat REAL,
  gps_long REAL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- Client feedback table
CREATE TABLE IF NOT EXISTS client_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  client_id INTEGER NOT NULL,
  rating INTEGER CHECK(rating >= 1 AND rating <= 5),
  comment TEXT DEFAULT '',
  timestamp TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- Cleaning checklist table
CREATE TABLE IF NOT EXISTS cleaning_checklist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  cleaner_id INTEGER NOT NULL,
  task_name TEXT NOT NULL,
  completed INTEGER DEFAULT 0,
  timestamp TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- Loyalty points table
CREATE TABLE IF NOT EXISTS loyalty_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  earned_date TEXT NOT NULL,
  expires_date TEXT,
  source TEXT NOT NULL CHECK(source IN ('booking', 'referral', 'bonus')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  referrer_id INTEGER NOT NULL,
  referred_id INTEGER,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'cancelled')),
  reward_date TEXT,
  points_earned INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Geofences table for auto-arrival
CREATE TABLE IF NOT EXISTS geofences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL UNIQUE,
  client_lat REAL NOT NULL,
  client_long REAL NOT NULL,
  radius_meters INTEGER DEFAULT 500,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- Client preferences table
CREATE TABLE IF NOT EXISTS client_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL UNIQUE,
  notification_method TEXT DEFAULT 'whatsapp' CHECK(notification_method IN ('whatsapp', 'sms', 'email', 'push')),
  quiet_hours_start TEXT DEFAULT '22:00',
  quiet_hours_end TEXT DEFAULT '08:00',
  language TEXT DEFAULT 'en',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Update service_pricing table with new columns
-- These columns might already exist, so we'll add them if they don't exist
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we'll try-catch
-- For now, we'll skip these if they fail
ALTER TABLE service_pricing ADD COLUMN unit_type TEXT DEFAULT 'flat';
ALTER TABLE service_pricing ADD COLUMN min_bedrooms INTEGER DEFAULT 1;
ALTER TABLE service_pricing ADD COLUMN max_bedrooms INTEGER DEFAULT NULL;
ALTER TABLE service_pricing ADD COLUMN after_hours_surcharge REAL DEFAULT 0;

-- Create bookings table if it doesn't exist (for staging database)
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  cleaner_id INTEGER,
  type TEXT DEFAULT 'once_off',
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  status TEXT DEFAULT 'pending',
  location TEXT DEFAULT '',
  booking_date TEXT DEFAULT '',
  booking_time TEXT DEFAULT '',
  client_name TEXT DEFAULT '',
  tracking_token TEXT UNIQUE,
  tracking_expires_at TEXT,
  gps_lat REAL,
  gps_long REAL,
  last_location_update TEXT,
  team_leader_id INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_locations_area_name ON locations(area_name);
CREATE INDEX IF NOT EXISTS idx_quote_logs_created_at ON quote_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_cleaner_photos_booking_id ON cleaner_photos(booking_id);
CREATE INDEX IF NOT EXISTS idx_cleaner_photos_photo_type ON cleaner_photos(photo_type);
CREATE INDEX IF NOT EXISTS idx_client_feedback_booking_id ON client_feedback(booking_id);
CREATE INDEX IF NOT EXISTS idx_client_feedback_client_id ON client_feedback(client_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_checklist_booking_id ON cleaning_checklist(booking_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_client_id ON loyalty_points(client_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_earned_date ON loyalty_points(earned_date);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_geofences_booking_id ON geofences(booking_id);
CREATE INDEX IF NOT EXISTS idx_client_preferences_client_id ON client_preferences(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tracking_token ON bookings(tracking_token);
CREATE INDEX IF NOT EXISTS idx_bookings_team_leader_id ON bookings(team_leader_id);
