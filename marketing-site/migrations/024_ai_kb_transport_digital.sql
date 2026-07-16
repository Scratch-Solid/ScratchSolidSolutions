-- AI Bot Knowledge Base update: Scratch Solid Solutions is no longer just
-- cleaning. It now has three divisions (Cleaning, Transportation, Digital),
-- but 015_ai_knowledge_base_v2.sql only ever seeded cleaning content. This
-- refreshes the company-overview answers to mention all three divisions and
-- adds dedicated Transportation and Digital Services categories, without
-- touching the existing cleaning-specific Q&A (still accurate as-is).

-- Refresh the two "About Us" answers that described the company as
-- cleaning-only (idempotent re-seed, same pattern as 015).
DELETE FROM ai_responses WHERE question IN (
  'Who is Scratch Solid Solutions',
  'What makes Scratch Solid Solutions different'
);

INSERT INTO ai_responses (question, response, keywords, category, created_at, updated_at) VALUES
('Who is Scratch Solid Solutions',
 'We''re a Cape Town-based company built around three connected divisions: Scratch Solid Cleaning (residential & commercial cleaning across the Northern Suburbs), Scratch Solid Transportation (personal & corporate transport, launching soon), and Scratch Solid Digital (our in-house software studio, which builds the booking and live-tracking systems the other divisions run on). Our slogan is "Scratch-Free, Solidly Clean" — the same standard of transparency and reliability runs through everything we do.',
 'about,who,company,scratch solid,solutions,mission,vision,values,story,background,founder,started,origin,divisions,departments,cleaning transportation digital',
 'About Us', datetime('now'), datetime('now')),

('What makes Scratch Solid Solutions different',
 'Three things set us apart: 1) Real-Time Transparency — live GPS tracking, geofencing, and status updates so you never wonder what is happening. 2) Quality Assurance — background-checked staff, rigorous training, and a satisfaction guarantee with free re-cleans within 24 hours. 3) One connected company — Cleaning, Transportation and Digital all under one name, with our own in-house Digital team building the booking and tracking systems everything else runs on. We are not just cleaners; we are your local, tech-backed service partner.',
 'different,better,why choose,unique,what makes you special,competitor,advantage,stand out,why us',
 'About Us', datetime('now'), datetime('now')),

('What services does Scratch Solid Solutions offer',
 'We operate three divisions: 1) Cleaning — residential, commercial, deep cleans, move-in/out, and short-term rental turnovers across the Northern Suburbs. 2) Transportation — personal and corporate transport, launching soon; message us on WhatsApp to be notified. 3) Digital — Scratch Solid Digital builds websites, apps and booking systems in-house, including the live tracker used on our own cleaning bookings. Ask me about any of the three and I''ll go into detail!',
 'what do you do,divisions,departments,overview,three divisions,lines of business,cleaning transportation digital,what does scratch solid do',
 'General FAQ', datetime('now'), datetime('now'));

-- Transportation division (idempotent re-seed)
DELETE FROM ai_responses WHERE category = 'Transportation';

INSERT INTO ai_responses (question, response, keywords, category, created_at, updated_at) VALUES
('Do you offer transportation services',
 'Yes — Scratch Solid Transportation is launching soon! We will offer both Personal transport (airport runs, appointments, everyday trips) and Corporate transport (staff shuttling and executive transport, billed on account like a cleaning contract). Message us on WhatsApp at +27 69 673 5947 and we will notify you the moment it launches.',
 'transport,transportation,ride,lift,shuttle,driver,cab,personal transport,corporate transport,launching,coming soon,when transport,do you have transport',
 'Transportation', datetime('now'), datetime('now')),

('What is personal transport',
 'Personal transport will cover everyday trips — airport runs, appointments, and general transport — booked the same trusted way you already book a clean. It is part of our upcoming Transportation division; WhatsApp us to be notified when it launches.',
 'personal transport,airport,appointment,everyday trip,personal ride,individual transport,airport run',
 'Transportation', datetime('now'), datetime('now')),

('What is corporate transport',
 'Corporate transport will cover staff shuttling and executive transport for businesses, billed on account just like a cleaning contract. It is part of our upcoming Transportation division — WhatsApp us to register interest and be notified at launch.',
 'corporate transport,staff shuttle,executive transport,business transport,company transport,shuttle service',
 'Transportation', datetime('now'), datetime('now')),

('When does transportation launch',
 'Transportation is currently in development and marked "Coming Soon" on our site. We do not have an exact launch date yet, but you can message us on WhatsApp at +27 69 673 5947 and we will notify you the moment personal and corporate transport go live.',
 'when launch,available now,transportation ready,is transport live,transport date,eta transport,not available yet,launch date',
 'Transportation', datetime('now'), datetime('now'));

-- Digital Services division (idempotent re-seed)
DELETE FROM ai_responses WHERE category = 'Digital Services';

INSERT INTO ai_responses (question, response, keywords, category, created_at, updated_at) VALUES
('Do you build websites and apps',
 'Yes! Scratch Solid Digital is our in-house software studio — we design and build websites, apps, and booking systems. We built our own live cleaner-tracking system first, and now take on projects for other businesses too. Start a project via customerservice@scratchsolidsolutions.org or WhatsApp us at +27 69 673 5947.',
 'website,app,build,develop,software,digital,web design,app development,scratch solid digital,programming,developer,booking system',
 'Digital Services', datetime('now'), datetime('now')),

('What digital services do you offer',
 'Scratch Solid Digital covers three areas: 1) Websites — marketing sites and client-facing portals built for speed and clarity. 2) Apps — staff and client-facing tools, from onboarding flows to internal dashboards. 3) Booking systems — end-to-end scheduling, assignment and live status tracking, built to your business. Everything is designed and run in-house.',
 'digital services,web design,app development,booking system,what does digital do,software services,digital division',
 'Digital Services', datetime('now'), datetime('now')),

('Is the live tracking system one of your own products',
 'Yes — the real-time cleaner tracker you see on our Cleaning pages was built entirely in-house by Scratch Solid Digital. It is running in production for every cleaning booking, not a demo. It is a good example of what our Digital team can build for your business too.',
 'tracking system,built in house,your own product,who built the tracker,proof,tracker built by you,live tracker,is it a demo',
 'Digital Services', datetime('now'), datetime('now')),

('Can you build a website or app for my business',
 'Yes, that is exactly what Scratch Solid Digital does. We build for our own cleaning and transport operations first, and take on outside projects too — websites, apps, and booking systems. Email customerservice@scratchsolidsolutions.org or WhatsApp +27 69 673 5947 with a bit about your project to get started.',
 'build for my business,hire developer,web development service,app for my company,client project,commission a website,start a project',
 'Digital Services', datetime('now'), datetime('now'));
