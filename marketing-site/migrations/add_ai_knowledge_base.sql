-- Add AI Bot Knowledge Base Q&A
-- This migration adds comprehensive Q&A for the Scratch Solid Solutions AI Assistant

-- General Business Info
INSERT INTO ai_responses (question, response, category, created_at, updated_at) VALUES
('Who is Scratch Solid Solutions', 'We are a professional cleaning service based in the Northern Suburbs of Cape Town. We specialize in residential, commercial, move-in/out, and short-term accommodation (LekkeSlaap) cleaning. Our mission is to provide high-standard, reliable cleaning that enhances the lives of our clients and the success of our local business partners.', 'General Business Info', datetime('now'), datetime('now')),
('Which areas do you service', 'We service the following areas in the Northern Suburbs: Parow, Plattekloof, Durbanville, Tygervalley, Bellville, Kuilsriver, and Brackenfell.', 'General Business Info', datetime('now'), datetime('now')),
('What are your operating hours', 'We are open Monday to Friday from 08:00 to 17:00, and Saturdays from 08:00 to 13:00. We are closed on Sundays.', 'General Business Info', datetime('now'), datetime('now')),

-- Services & Pricing
('What types of cleaning do you offer', 'We offer two main tiers: 1. Maintenance Clean: A standard reset for homes and offices (dusting, mopping, sanitizing). 2. Deep Clean: A top-to-bottom intensive clean including inside appliances, window tracks, and grout scrubbing.', 'Services & Pricing', datetime('now'), datetime('now')),
('Do you clean Airbnb or LekkeSlaap properties', 'Yes! We specialize in LekkeSlaap and short-term accommodation turnovers. We ensure the property is 5-star ready for every new guest arrival.', 'Services & Pricing', datetime('now'), datetime('now')),
('How do I get a quote', 'You can request a Quick Quote by sending us a message on WhatsApp at +27 69 673 5947. Just let us know your area, the type of clean you need, and the size of the property.', 'Services & Pricing', datetime('now'), datetime('now')),

-- Trust & Safety
('Is your staff trained and safe', 'Absolutely. Our team is our heart. We invest in quality equipment and rigorous safety standards, including full PPE where necessary, to ensure every job is performed with integrity and care.', 'Trust & Safety', datetime('now'), datetime('now')),
('What happens if I need to cancel', 'We ask for at least 24 hours'' notice for cancellations. Cancellations made within less than 24 hours may be subject to a fee to cover administrative and labor costs.', 'Trust & Safety', datetime('now'), datetime('now')),

-- Data Privacy & Tech (POPIA/GRC)
('Is my personal information safe with you', 'Yes. We are fully compliant with the Protection of Personal Information Act (POPIA). Your data is stored within a secure environment protected by Cloudflare encryption and firewalls.', 'Data Privacy & Tech', datetime('now'), datetime('now')),
('Who can I talk to about my data', 'You can reach our Information Officer at it@scratchsolidsolutions.org for any privacy-related inquiries.', 'Data Privacy & Tech', datetime('now'), datetime('now')),

-- Contact Details
('How can I contact you', 'WhatsApp: +27 69 673 5947. Customer Service: customerservice@scratchsolidsolutions.org. Website: https://scratchsolidsolutions.org. Social Media: Find us on Instagram and Facebook @ScratchSolidSolutions', 'Contact Details', datetime('now'), datetime('now')),

-- Detailed Logistics
('Do I need to be home during the cleaning', 'Not necessarily! Many of our clients provide us with access codes or leave keys with security/complex gates. We just ask that you confirm the access arrangements via WhatsApp before the team arrives.', 'Detailed Logistics', datetime('now'), datetime('now')),
('Do you bring your own cleaning supplies and equipment', 'Yes, we come fully equipped with high-quality cleaning detergents and professional equipment. If you have specific eco-friendly products or specialized surfaces (like unsealed wood) you''d prefer us to use, just let us know!', 'Detailed Logistics', datetime('now'), datetime('now')),
('How long does a typical clean take', 'A Maintenance Clean for a standard home usually takes 3–5 hours, while a Deep Clean can take a full day depending on the size and condition of the property. We will give you a time estimate along with your Quick Quote.', 'Detailed Logistics', datetime('now'), datetime('now')),
('Can I book a recurring service', 'Absolutely. Most of our clients in the Northern Suburbs prefer a weekly or bi-weekly Maintenance Clean to keep their homes and offices in top shape. We can schedule these in advance to secure your preferred time slot.', 'Detailed Logistics', datetime('now'), datetime('now')),
('What happens if I am not happy with the clean', 'Your satisfaction is our priority. If we missed a spot, please notify us within 24 hours. We will send a team back to rectify the specific area at no additional cost to you.', 'Detailed Logistics', datetime('now'), datetime('now')),

-- Specific Service Queries
('Does the Deep Clean include inside the oven and fridge', 'Yes! Unlike a Maintenance Clean, our Deep Clean package specifically includes degreasing the inside of your oven and wiping out the fridge and freezer.', 'Specific Service Queries', datetime('now'), datetime('now')),
('Do you clean windows', 'We clean the inside of windows, frames, and tracks as part of our Deep Clean and Move-In/Out services. For exterior windows on higher floors, please check with us regarding accessibility.', 'Specific Service Queries', datetime('now'), datetime('now')),
('Can you help with laundry and ironing', 'Our primary focus is on property maintenance and hygiene (surfaces, floors, and sanitization). We do not currently offer laundry or ironing as a standard service, but feel free to ask about custom requests for long-term bookings.', 'Specific Service Queries', datetime('now'), datetime('now')),
('What is included in a Move-In/Move-Out clean', 'This is our most intensive service. We ensure all cupboards are cleaned inside and out, all surfaces are sanitized, and the property is "white-glove" ready for the next occupant. It''s designed to ensure you get your rental deposit back!', 'Specific Service Queries', datetime('now'), datetime('now')),

-- Commercial & Hospitality
('Do you provide VAT invoices for businesses', 'We provide professional invoices for all services rendered. Please send your company details to customerservice@scratchsolidsolutions.org so we can ensure your billing information is correct.', 'Commercial & Hospitality', datetime('now'), datetime('now')),
('How fast can you turn over a LekkeSlaap property', 'We understand that hospitality requires a quick turnaround. We prioritize LekkeSlaap bookings on Saturdays to ensure your property is ready for the next guest''s check-in time.', 'Commercial & Hospitality', datetime('now'), datetime('now')),
('Do you clean office carpets and upholstery', 'We provide vacuuming and spot-cleaning as part of our standard commercial service. For full industrial carpet steam cleaning, please request a specialized quote so we can bring the necessary heavy-duty equipment.', 'Commercial & Hospitality', datetime('now'), datetime('now')),

-- Safety & Compliance
('Are your cleaning chemicals safe for pets', 'We prioritize safety. While our industrial cleaners are effective, we ensure surfaces are rinsed and dried. If you have pets, please let us know so we can take extra care in the areas they frequent.', 'Safety & Compliance', datetime('now'), datetime('now')),
('How do you handle my keys and gate remotes', 'We have a strict Key Management Policy. All keys are tagged and stored securely when not in use, and our staff are trained on the importance of property security in the Northern Suburbs.', 'Safety & Compliance', datetime('now'), datetime('now')),
('What is your Fresh Lemon final touch', 'It''s our signature! After every clean, we apply a fresh lemon-scented final touch spray to leave your space smelling as clean as it looks. It''s the Scratch Solid Solutions way of saying "Welcome Home."', 'Safety & Compliance', datetime('now'), datetime('now')),

-- Real-Time Transparency & Tracking
('How do I know when my cleaner will arrive', 'We pride ourselves on our Transparency Policy. You can track your cleaner''s status in real-time through our application. You will see exactly when they are "On the Way," when they have "Arrived," and when the job is "Completed."', 'Real-Time Transparency & Tracking', datetime('now'), datetime('now')),
('Can I see where the cleaner is during the day', 'Yes! Our app provides geolocation tracking so you can see if the cleaner is currently in transit or on-site. This ensures total accountability and security for your property.', 'Real-Time Transparency & Tracking', datetime('now'), datetime('now')),
('What does Idle status mean on the tracker', '"Idle" simply means the cleaner is currently between jobs or preparing for their next transit. As soon as they head toward your address, the status will update to "On the Way."', 'Real-Time Transparency & Tracking', datetime('now'), datetime('now')),
('Will I get a notification when the job is done', 'Absolutely. As soon as the cleaner marks the session as "Completed" on the app, you will be notified. This is perfect for our LekkeSlaap hosts who need to know exactly when a property is ready for the next guest.', 'Real-Time Transparency & Tracking', datetime('now'), datetime('now')),

-- Service Duration & Timing
('How long does a Standard/Maintenance Clean take', 'Our Standard Clean is a thorough session. We allocate 3 hours of active cleaning, and the cleaner will generally be on-site for a total of 4 hours to ensure every checklist item is handled with precision.', 'Service Duration & Timing', datetime('now'), datetime('now')),
('How long does a Deep Clean take', 'A Deep Clean starts at a minimum of 4 hours. The final duration depends on the size and condition of the property, but we ensure our team stays long enough to complete the intensive deep-clean checklist.', 'Service Duration & Timing', datetime('now'), datetime('now')),
('Why does the cleaner stay for 4 hours for a 3-hour clean', 'We believe in quality over haste. The extra hour allows for set-up, a final walkthrough of our transparency checklist, and ensuring your home receives the "Fresh Lemon" final touch without rushing.', 'Service Duration & Timing', datetime('now'), datetime('now')),
('Can I request a specific time slot', 'Yes, you can! Because we use real-time tracking, we manage our schedules tightly. When you book via WhatsApp, we will confirm a window that fits your schedule perfectly.', 'Service Duration & Timing', datetime('now'), datetime('now')),

-- Trust, Safety & Payments
('What if the cleaner arrives late', 'Because of our live geolocation tracking, you''ll see if traffic in areas like the N1 or Tygervalley is causing a delay. If there is a significant holdup, our customer service team will reach out to you immediately.', 'Trust, Safety & Payments', datetime('now'), datetime('now')),
('How do I pay for the service', 'We offer secure payment options. Once the job is marked "Completed" on our system, you will receive your invoice. You can pay via EFT or our secure online portal.', 'Trust, Safety & Payments', datetime('now'), datetime('now')),
('Is the geolocation data secure', 'Completely. Our tracking system is hosted on our secure Cloudflare-protected infrastructure. Only you (the client) and our management team can see the cleaner''s location during your scheduled service window.', 'Trust, Safety & Payments', datetime('now'), datetime('now')),

-- General FAQ Additions
('Do you service complex apartments in Plattekloof or Durbanville', 'Yes! We service all property types, including secure estates and apartments. Just ensure you''ve updated your cleaner''s status to "Arrived" once they are at the gate so you can buzz them in.', 'General FAQ Additions', datetime('now'), datetime('now')),
('Can I request the same cleaner every time', 'We strive for consistency! If you have a preferred cleaner who knows your home''s layout, let us know via WhatsApp and we will do our best to assign them to your recurring Maintenance Cleans.', 'General FAQ Additions', datetime('now'), datetime('now')),
('What is the benefit of your Transparency Policy', 'It removes the guesswork. You don''t have to wonder if the cleaner has arrived or if the job is finished—you have the live data right in front of you.', 'General FAQ Additions', datetime('now'), datetime('now')),
('Does the 4-hour window include a lunch break', 'Our teams are managed to ensure your 3 hours of active cleaning are uninterrupted. Any necessary breaks are managed around the service window to ensure your home is finished on time.', 'General FAQ Additions', datetime('now'), datetime('now'));
