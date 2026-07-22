-- Fix a stale description of the check-in flow (WhatsApp START/HERE/DONE is
-- the primary signal, GPS is only a backup confirmation - see
-- internal-portal/src/app/api/cleaner/gps-ping/route.ts), and add the first
-- Transport and Digital FAQ content (previously Cleaning-only).

UPDATE ai_responses
SET response = 'Geofencing is a virtual boundary we draw around your property, used as a backup confirmation layer. The main way we know a cleaner has arrived is the WhatsApp message they send themselves the moment they get there - geofencing just double-checks that against their phone''s GPS location (within about 150 metres of your address), catching the rare case where a message does not come through. This prevents false check-ins and ensures you are only billed for actual on-site work.',
    keywords = keywords || ',whatsapp,start here done,check in message',
    updated_at = datetime('now')
WHERE question = 'What is geofencing and how does it work';

UPDATE ai_responses
SET response = 'Here is the full journey: 1) You book via our website or WhatsApp. 2) Our system assigns a cleaner based on availability, skills, and proximity. 3) You receive a confirmation with your booking details and a unique tracking link. 4) On the day, the cleaner sends a WhatsApp "On the Way" message and you see their live GPS location. 5) They arrive and send "Arrived" via WhatsApp - their GPS location backs this up automatically. 6) Cleaning is performed against a digital checklist. 7) The cleaner sends "Completed" via WhatsApp - you receive a notification. 8) Your invoice is generated automatically. 9) You pay via EFT or online portal. 10) You can leave a review and upload completion photos. Every step is logged for transparency.',
    updated_at = datetime('now')
WHERE question = 'How does the end-to-end tracking work from booking to completion';

DELETE FROM ai_responses WHERE category IN ('Digital', 'Transportation');

INSERT INTO ai_responses (question, response, keywords, category, created_at, updated_at) VALUES

('What is Scratch Solid Digital',
 'Scratch Solid Digital is our in-house software studio - the same team that built the live cleaner-tracking system you see on our cleaning page. We build websites, apps, and booking/scheduling systems, originally for our own cleaning and transport operations, and now for other businesses too.',
 'digital,scratch solid digital,software,web development,app development,who builds,tech team,in house',
 'Digital', datetime('now'), datetime('now')),

('What kind of digital projects do you build',
 'Three main areas: marketing websites and client-facing portals built for speed and clarity; staff and client-facing apps (from onboarding flows to internal dashboards); and end-to-end booking systems with scheduling, assignment, and live status tracking - built to your business, not off the shelf.',
 'digital projects,websites,apps,booking system,what do you build,web design,software development',
 'Digital', datetime('now'), datetime('now')),

('How do I start a digital project with Scratch Solid',
 'Use the "Start a Project" button on our Digital page (scratchsolidsolutions.org/digital), or message us directly on WhatsApp to discuss what you need.',
 'start project,digital quote,hire developer,build my website,build my app,contact digital',
 'Digital', datetime('now'), datetime('now')),

('Is your live tracking system something you could build for my business',
 'Yes - it is one of our own products. The real-time, timestamped tracker running live on our cleaning page was built by Scratch Solid Digital, not a third-party vendor, so we can build the same kind of system for your business.',
 'build tracker,tracking system for my business,custom tracking,proof of work,portfolio,example project',
 'Digital', datetime('now'), datetime('now')),

('Is Scratch Solid Transportation available yet',
 'Not yet - Transportation is launching soon. You can message us on WhatsApp and we will notify you the moment it launches.',
 'transport,transportation,is it available,when launch,coming soon,when does transport start',
 'Transportation', datetime('now'), datetime('now')),

('What will Scratch Solid Transportation offer',
 'Two services are planned: personal transport (airport runs, appointments, everyday trips, booked the same trusted way you already book a clean) and corporate transport (staff shuttling and executive transport, billed on account like a cleaning contract).',
 'transport services,what transport,airport,corporate transport,staff shuttle,executive transport,personal transport',
 'Transportation', datetime('now'), datetime('now')),

('How do I get notified when transportation launches',
 'Click "Notify me on WhatsApp" on our Transportation page (scratchsolidsolutions.org/transportation), or message us directly and we will let you know the moment it is live.',
 'notify me,transport launch,waitlist,sign up transport,when will i know',
 'Transportation', datetime('now'), datetime('now'));
