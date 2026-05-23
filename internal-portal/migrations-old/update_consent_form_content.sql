-- Migration: Update consent form content
-- Update the consent form content with new title and centered layout

UPDATE consent_form_content
SET title = 'Scratch Solid Solutions Employee Background Check Consent Form',
    consent_text = 'I, the undersigned, hereby give written, informed consent to Scratch Solid Solutions to conduct background checks relevant to my application for employment.',
    background_checks = 'Identity verification\nCriminal record check (where relevant to the position)\nReference and employment history checks',
    acknowledgments = 'All information will be processed in accordance with the Protection of Personal Information Act (POPIA)\nInformation collected will only be used for employment-related purposes\nMy personal information will be stored securely and confidentially\nI may request access to my information or withdraw consent in writing',
    witness_name = 'Xolani Jason Tshaka',
    updated_at = datetime('now')
WHERE id = (SELECT id FROM consent_form_content ORDER BY id DESC LIMIT 1);

-- If no record exists, insert one
INSERT OR IGNORE INTO consent_form_content (title, consent_text, background_checks, acknowledgments, witness_name)
VALUES (
  'Scratch Solid Solutions Employee Background Check Consent Form',
  'I, the undersigned, hereby give written, informed consent to Scratch Solid Solutions to conduct background checks relevant to my application for employment.',
  'Identity verification\nCriminal record check (where relevant to the position)\nReference and employment history checks',
  'All information will be processed in accordance with the Protection of Personal Information Act (POPIA)\nInformation collected will only be used for employment-related purposes\nMy personal information will be stored securely and confidentially\nI may request access to my information or withdraw consent in writing',
  'Xolani Jason Tshaka'
);
