-- Migration: Add editable consent form and contract tables
-- This allows admin to edit the consent form and contract content via dashboard

-- Table for storing consent form content
CREATE TABLE IF NOT EXISTS consent_form_content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL DEFAULT 'Employee Background Check Consent Form',
  consent_text TEXT NOT NULL,
  background_checks TEXT NOT NULL,
  acknowledgments TEXT NOT NULL,
  witness_name TEXT NOT NULL DEFAULT 'Xolani Jason Tshaka',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by INTEGER,
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Table for storing contract content
CREATE TABLE IF NOT EXISTS contract_content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL DEFAULT 'Employment Contract',
  contract_text TEXT NOT NULL,
  terms TEXT NOT NULL,
  company_name TEXT NOT NULL DEFAULT 'Scratch Solid Solutions',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by INTEGER,
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Insert default consent form content
INSERT INTO consent_form_content (title, consent_text, background_checks, acknowledgments, witness_name)
VALUES (
  'Employee Background Check Consent Form',
  'I, the undersigned, hereby give written, informed consent to Scratch Solid Solutions to conduct background checks relevant to my application for employment.',
  'Identity verification\nCriminal record check (where relevant to the position)\nReference and employment history checks',
  'All information will be processed in accordance with the Protection of Personal Information Act (POPIA)\nInformation collected will only be used for employment-related purposes\nMy personal information will be stored securely and confidentially\nI may request access to my information or withdraw consent in writing',
  'Xolani Jason Tshaka'
);

-- Insert default contract content
INSERT INTO contract_content (title, contract_text, terms, company_name)
VALUES (
  'Employment Contract',
  'This Employment Agreement is entered into between Scratch Solid Solutions (the "Employer") and the Employee.',
  '1. The Employee agrees to perform all duties assigned by the Employer.\n2. The Employee will maintain confidentiality of all company information.\n3. The Employee will adhere to all company policies and procedures.\n4. The Employer reserves the right to modify terms with notice.',
  'Scratch Solid Solutions'
);
