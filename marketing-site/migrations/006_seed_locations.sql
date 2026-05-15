-- Seed locations table with Northern Suburbs areas
-- This migration populates the locations table with predefined areas and their transport fees
-- Created: 2026-05-14
-- Phase 1: Database Schema & Infrastructure Setup

-- Insert Northern Suburbs areas with base transport fees
INSERT INTO locations (area_name, base_transport_fee) VALUES
('Durbanville', 50.00),
('Bellville', 45.00),
('Brackenfell', 55.00),
('Plattekloof', 50.00),
('Tygervalley', 45.00),
('Parow', 40.00),
('Goodwood', 40.00),
('Kuils River', 60.00),
('Kraaifontein', 65.00),
('Stellenbosch', 70.00),
('Paarl', 80.00),
('Wellington', 85.00);
