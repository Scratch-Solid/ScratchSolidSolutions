-- AI Bot Knowledge Base v2
-- Comprehensive Q&A with keyword tags for semantic matching
-- Covers: products, services, pricing, about us, areas, transparency, tracking, geofencing, geolocation, safety, payments, booking, and more

-- Clear existing entries to avoid duplicates (idempotent seed)
DELETE FROM ai_responses WHERE category IN (
  'About Us', 'Services & Pricing', 'Areas & Coverage', 'Transparency & Tracking',
  'Booking & Scheduling', 'Safety & Trust', 'Payments & Billing',
  'Commercial & Business', 'Technology & Data', 'General FAQ'
);

INSERT INTO ai_responses (question, response, keywords, category, created_at, updated_at) VALUES
('Who is Scratch Solid Solutions',
 'We are a professional cleaning service based in the Northern Suburbs of Cape Town, South Africa. Founded on the promise of reliability and excellence, we deliver spotless cleaning for homes, offices, commercial spaces, and short-term rentals. Our slogan is "Scratch-Free, Solidly Clean" — because we handle every surface with care and leave nothing but shine behind.',
 'about,who,company,scratch solid,solutions,mission,vision,values,story,background,founder,started,origin',
 'About Us', datetime('now'), datetime('now')),

('What is your mission and vision',
 'Our Mission is to deliver spotless, reliable cleaning services that create healthy, productive, and welcoming environments. Our Vision is to be the most trusted and innovative cleaning solutions provider in South Africa, setting new standards for quality, sustainability, and customer satisfaction. Our core values are Trust, Excellence, Attention to Detail, Eco-Consciousness, and Customer-First.',
 'mission,vision,values,goals,purpose,why exist,believe,core values,principles,philosophy',
 'About Us', datetime('now'), datetime('now')),

('What cleaning services do you offer',
 'We offer a full range of professional cleaning services: 1) Residential Cleaning — homes, apartments, and complexes. 2) Office & Commercial Cleaning — workspaces, business premises, and retail stores. 3) Deep Cleaning — intensive top-to-bottom cleaning including inside appliances, window tracks, grout scrubbing, and hard-to-reach areas. 4) Move-In/Move-Out Cleaning — end-of-lease and pre-occupancy cleaning designed to get your deposit back. 5) Short-Term Rental Turnovers — LekkeSlaap, Airbnb, and guest-house cleaning with fast turnaround. 6) Event & Post-Construction Cleaning — specialized deep cleans after events or building work.',
 'services,offer,what do you do,cleaning types,residential,office,commercial,deep clean,move in,move out,airbnb,lekkeslaap,turnover,event,construction,types of clean',
 'Services & Pricing', datetime('now'), datetime('now')),

('What is the difference between Maintenance and Deep Clean',
 'A Maintenance Clean is our standard service: dusting, mopping, vacuuming, surface sanitizing, and bathroom/kitchen wipe-down. It is designed for regularly maintained spaces. A Deep Clean is intensive: inside ovens and fridges, window tracks and frames, grout scrubbing, ceiling cobweb removal, and detailed attention to neglected areas. Deep Cleans are ideal for first-time clients, spring cleaning, or move-in/move-out situations.',
 'maintenance,deep clean,difference,standard,intensive,regular,deep cleaning vs,compare,what included',
 'Services & Pricing', datetime('now'), datetime('now')),

('How much do your cleaning services cost',
 'Pricing depends on the service type, property size, and condition. Our Grand Opening Special is R350 for 4 hours of professional cleaning. Standard Maintenance Cleans start from around R400–R600 for a typical apartment or small home. Deep Cleans are quoted individually based on square meters and the level of work required. Business and contract clients receive tailored rates. Request a free Quick Quote via WhatsApp at +27 69 673 5947 for an exact price.',
 'price,cost,how much,rate,charge,pricing,fee,estimate,quote,what does it cost,expensive,cheap,affordable,budget',
 'Services & Pricing', datetime('now'), datetime('now')),

('Do you have any specials or promotions',
 'Yes! Our Grand Opening Special is R350 for 4 hours of professional cleaning — a fantastic way to experience our service. We also run seasonal promotions and loyalty rewards for recurring clients. Businesses signing long-term contracts can qualify for discounted rates. Follow us on Instagram and Facebook @ScratchSolidSolutions to stay updated on our latest deals.',
 'special,promotion,discount,deal,offer,grand opening,cheap,sale,loyalty,reward,coupon,voucher,save money',
 'Services & Pricing', datetime('now'), datetime('now')),

('Which areas do you service',
 'We currently service the Northern Suburbs of Cape Town, including: Parow, Plattekloof, Durbanville, Tygervalley, Bellville, Kuils River, and Brackenfell. We also cover select surrounding areas on request. If you are unsure whether we service your location, send us your address via WhatsApp at +27 69 673 5947 and we will confirm immediately.',
 'areas,location,where,service,cover,region,suburbs,northern suburbs,cape town,parow,durbanville,bellville,brackenfell,kuils river,plattekloof,tygervalley,which parts',
 'Areas & Coverage', datetime('now'), datetime('now')),

('Do you service apartments and complexes',
 'Absolutely. We clean apartments, townhouses, secure estates, and office parks across the Northern Suburbs. Our teams are experienced with access-controlled complexes and gated estates. Just provide us with the gate code or arrange access via security, and we will handle the rest.',
 'apartment,complex,estate,gated,security, townhouse,flat,unit,building,secure estate',
 'Areas & Coverage', datetime('now'), datetime('now')),

('What are your operating hours',
 'Our standard operating hours are Monday to Friday, 08:00 to 17:00, and Saturdays from 08:00 to 13:00. We are closed on Sundays and public holidays. Business and contract clients can arrange after-hours cleaning by special request. Short-term rental turnovers are prioritized on Saturdays to ensure guest readiness.',
 'hours,open,when,time,operating,schedule,availability,closed,sunday,weekend,public holiday,after hours',
 'Booking & Scheduling', datetime('now'), datetime('now')),

('How do I book a cleaning service',
 'You can book in three ways: 1) Online — visit scratchsolidsolutions.org and use our booking form. 2) WhatsApp — message us at +27 69 673 5947 with your area, service type, and preferred date. 3) Phone/Email — call or email customerservice@scratchsolidsolutions.org. Once booked, you will receive a confirmation and reminders before your appointment.',
 'book,how to book,schedule,appointment,reserve,make a booking,how do I get,order,request,online,whatsapp',
 'Booking & Scheduling', datetime('now'), datetime('now')),

('Can I book a recurring service',
 'Yes, and most of our clients love it! We offer weekly, bi-weekly, and monthly Maintenance Clean subscriptions. Recurring bookings secure your preferred time slot and often qualify for loyalty discounts. You can manage your schedule through your client dashboard or by messaging us on WhatsApp.',
 'recurring,regular,subscription,weekly,biweekly,monthly,repeat,ongoing,contract,retainer,plan',
 'Booking & Scheduling', datetime('now'), datetime('now')),

('How do I cancel or reschedule a booking',
 'We ask for at least 24 hours notice for cancellations or reschedules. You can cancel via your client dashboard or by messaging us on WhatsApp. Cancellations with less than 24 hours notice may incur a fee to cover administrative and labour costs. Rescheduling is free with sufficient notice.',
 'cancel,reschedule,change,move,postpone,skip,late,refund,24 hours,notice,how do I cancel',
 'Booking & Scheduling', datetime('now'), datetime('now')),

('How does your real-time tracking work',
 'Our Transparency Policy gives you live visibility into your cleaning service. Once your cleaner is assigned, you can track their status in real time through our web tracker. You will see when they are "On the Way," when they have "Arrived," and when the job is "Completed." Each status update is timestamped, giving you full accountability from start to finish.',
 'tracking,real time,transparency,live,status,on the way,arrived,completed,how does tracking work,tracker',
 'Transparency & Tracking', datetime('now'), datetime('now')),

('How do I know when my cleaner will arrive',
 'You will receive live status updates. When the cleaner marks "On the Way," you can see their transit progress. When they arrive at your property, the status changes to "Arrived" with a GPS-verified timestamp. If traffic on routes like the N1 or around Tygervalley causes delays, you will see the delay reflected in real time, and our support team may reach out proactively.',
 'when arrive,arrival time,late,delay,ETA,estimated time,how long until,cleaner coming,where is cleaner',
 'Transparency & Tracking', datetime('now'), datetime('now')),

('What is geolocation and how do you use it',
 'Geolocation is the use of GPS coordinates to determine a cleaner exact location during their service window. Our app captures the cleaner latitude and longitude at key moments: when they mark "On the Way," when they "Arrive," and when they mark the job "Completed." This data is displayed to you in real time so you know exactly where they are and when they reached your property. It is purely for transparency and accountability during your scheduled service.',
 'geolocation,gps,location,coordinates,where,how does geolocation work,gps tracking,location data,latitude,longitude',
 'Transparency & Tracking', datetime('now'), datetime('now')),

('What is geofencing and how does it work',
 'Geofencing is a virtual boundary we draw around your property. When a cleaner enters this boundary and marks their status as "Arrived," our system auto-verifies that they are physically at your address. This prevents false check-ins and ensures you are only billed for actual on-site work. The geofence radius is typically set to 100 metres around your property.',
 'geofence,geofencing,virtual boundary,auto arrival,automatic,check in,verify,arrival detection,100 metres,arrived status,how does geofencing',
 'Transparency & Tracking', datetime('now'), datetime('now')),

('Can I see where the cleaner is during the day',
 'Yes! During your scheduled service window, you can view the cleaner real-time location on our tracker. You will see if they are in transit or on-site at your property. For privacy, location sharing is only active during your specific booking window — not before or after.',
 'see cleaner,where is,location,tracker,map,follow,spy,watch,monitor,view location',
 'Transparency & Tracking', datetime('now'), datetime('now')),

('Is the geolocation data secure and private',
 'Completely. Our tracking system is hosted on Cloudflare secure infrastructure with end-to-end encryption. Only you (the client) and our management team can view the cleaner location during your scheduled service window. We are fully compliant with POPIA (Protection of Personal Information Act), and location data is never shared with third parties. Data is purged from our systems after 90 days in line with our data retention policy.',
 'secure,privacy,poipa,safe,confidential,encryption,who can see,data protection,location privacy',
 'Technology & Data', datetime('now'), datetime('now')),

('How long does a standard clean take',
 'A standard Maintenance Clean for an average-sized home or apartment takes approximately 3 to 4 hours on-site. This includes 3 hours of active cleaning plus setup, a final walkthrough of our transparency checklist, and our signature Fresh Lemon final touch. Deep Cleans can take 4 to 8 hours depending on property size and condition.',
 'how long,duration,time,take,how many hours,quick,slow,length,standard clean time',
 'Services & Pricing', datetime('now'), datetime('now')),

('Do I need to be home during the cleaning',
 'Not necessarily. Many clients provide access codes, leave keys with security, or use a lockbox. You can arrange access via WhatsApp before the team arrives. Our real-time tracking means you will know exactly when they arrive and finish, even if you are not there. All our staff are background-checked and trained in property security protocols.',
 'home,present,there,away,not home,access,key,lockbox,security,gate,do I have to be',
 'Safety & Trust', datetime('now'), datetime('now')),

('Do you bring your own supplies and equipment',
 'Yes, we come fully equipped with professional-grade cleaning detergents, mops, vacuums, cloths, and protective gear. If you have specific eco-friendly products you prefer, or delicate surfaces like unsealed wood or marble, just let us know and we will adapt our approach.',
 'supplies,equipment,products,detergents,tools,bring own,what do I need to provide,materials',
 'Safety & Trust', datetime('now'), datetime('now')),

('Are your cleaning chemicals safe for pets and children',
 'We prioritize safety in every home. While our industrial-grade cleaners are highly effective, we ensure all surfaces are properly rinsed and dried before we leave. If you have pets, children, or family members with allergies or sensitivities, please inform us beforehand so we can select the most appropriate products and take extra care in high-traffic areas.',
 'pets,children,baby,safe,toxic,allergy,sensitive,non toxic,eco friendly,green,chemicals,harmful',
 'Safety & Trust', datetime('now'), datetime('now')),

('Is your staff trained and vetted',
 'Absolutely. Every team member undergoes rigorous training in cleaning techniques, equipment use, safety protocols, and customer service. All staff are background-checked before employment. We invest in ongoing training to ensure our team delivers consistent, high-quality results every time.',
 'trained,vetted,background check,qualifications,screening,staff quality,team,employees,experience,skills',
 'Safety & Trust', datetime('now'), datetime('now')),

('Are you insured',
 'Yes, Scratch Solid Solutions is fully insured. We carry public liability insurance to protect your property and our staff during every service. In the unlikely event of damage or an incident, we have a clear claims process. Please contact customerservice@scratchsolidsolutions.org for insurance documentation.',
 'insured,insurance,liability,covered,protection,damage,claim,accident,what if something breaks',
 'Safety & Trust', datetime('now'), datetime('now')),

('How do I pay for the service',
 'Once your cleaner marks the job as "Completed," our system automatically generates your invoice. You can pay via EFT (Electronic Funds Transfer) or through our secure online payment portal. Business clients on contract receive monthly consolidated invoices. All payments are recorded and tracked in our system for your peace of mind.',
 'pay,payment,how to pay,EFT,bank transfer,credit card,online payment,invoice,billing,cash,card',
 'Payments & Billing', datetime('now'), datetime('now')),

('Do you provide VAT invoices for businesses',
 'Yes. We provide professional VAT-compliant invoices for all business and commercial clients. Please send your company registration and VAT number to customerservice@scratchsolidsolutions.org so we can ensure your invoices are correctly formatted for SARS compliance.',
 'vat,invoice,tax,business invoice,company,registered,sars,receipt,billing details',
 'Payments & Billing', datetime('now'), datetime('now')),

('What if I am not happy with the clean',
 'Your satisfaction is our top priority. If we missed a spot or you are not fully satisfied, notify us within 24 hours via WhatsApp or email. We will send a team back to rectify the specific area at no additional cost. We also encourage you to leave an honest review — it helps us improve.',
 'unhappy,complaint,dissatisfied,not happy,bad,quality,poor,refund,redo,fix,missed spot,satisfaction',
 'Safety & Trust', datetime('now'), datetime('now')),

('Can I request the same cleaner every time',
 'We strive for consistency. If you have a preferred cleaner who knows your home layout and preferences, let us know via WhatsApp and we will do our best to assign them to your recurring bookings. While we cannot guarantee the same person 100 percent of the time due to leave and scheduling, we prioritize client preferences wherever possible.',
 'same cleaner,preferred,favourite,regular,consistent,specific person,always,request same',
 'Booking & Scheduling', datetime('now'), datetime('now')),

('What is the Fresh Lemon final touch',
 'It is our signature finishing step! After every clean, our team applies a fresh lemon-scented spray to leave your space smelling as clean as it looks. It is the Scratch Solid Solutions way of saying "Welcome Home."',
 'fresh lemon,scent,smell,fragrance,final touch,signature,what is fresh lemon,lemon scent',
 'Services & Pricing', datetime('now'), datetime('now')),

('Do you clean Airbnb and LekkeSlaap properties',
 'Yes, we specialize in short-term rental turnovers. We understand the hospitality standard required — every surface must be guest-ready. We prioritize LekkeSlaap and Airbnb bookings on Saturdays to ensure your property is spotless before the next guest checks in. You will also receive a "Completed" notification so you know exactly when the property is ready.',
 'airbnb,lekkeslaap,short term rental,guest house,turnover,guest ready,hospitality,accommodation',
 'Services & Pricing', datetime('now'), datetime('now')),

('How fast can you turn over a rental property',
 'We understand that hospitality runs on tight schedules. A standard rental turnover (Maintenance Clean) takes 3 to 4 hours. For larger properties or Deep Cleans, we allocate more time. We prioritize short-term rental bookings and coordinate with your check-in/check-out times to ensure zero guest disruption.',
 'turnaround,fast,quick,how fast,speed,time,same day,rush,urgent,deadline,guest check in',
 'Services & Pricing', datetime('now'), datetime('now')),

('Do you clean offices and commercial spaces',
 'Yes, we provide comprehensive office and commercial cleaning. This includes dusting workstations, sanitizing common areas, vacuuming carpets, cleaning kitchens and bathrooms, and restocking supplies. We can schedule after-hours or weekend cleaning to avoid disrupting your business operations. Contract clients receive preferential rates and dedicated account management.',
 'office,commercial,business,workspace,retail,shop,store,company,corporate,industrial,after hours',
 'Commercial & Business', datetime('now'), datetime('now')),

('Do you offer cleaning contracts for businesses',
 'Yes, we offer flexible service contracts for businesses of all sizes. Contracts can include daily, weekly, or monthly cleaning schedules, with rates locked for the contract duration. Benefits include dedicated account management, priority scheduling, VAT-compliant invoicing, and discounted rates. Contact us on WhatsApp for a tailored commercial proposal.',
 'contract,commercial,long term,business contract,service agreement,monthly,yearly,retainer,corporate',
 'Commercial & Business', datetime('now'), datetime('now')),

('Do you clean carpets and upholstery',
 'We provide vacuuming and spot-cleaning as part of our standard and deep cleaning services. For full industrial carpet steam cleaning or upholstery deep-cleaning, please request a specialized quote so we can bring the necessary heavy-duty equipment and trained technicians.',
 'carpet,upholstery,sofa,couch,rug,steam clean,shampoo,deep clean carpet,furniture',
 'Services & Pricing', datetime('now'), datetime('now')),

('Do you clean windows',
 'Yes! We clean interior windows, frames, and tracks as part of our Deep Clean and Move-In/Out services. For exterior windows on higher floors, please check with us regarding accessibility and safety equipment — we will assess and quote accordingly.',
 'window,glass,frame,track,exterior,interior,panes,window cleaning',
 'Services & Pricing', datetime('now'), datetime('now')),

('What is included in a Move-In/Move-Out clean',
 'This is our most intensive service. We clean all cupboards inside and out, scrub bathrooms top to bottom, degrease the kitchen including oven and fridge, clean window tracks and frames, sanitize all surfaces, and ensure the property is white-glove ready. It is specifically designed to help you get your rental deposit back.',
 'move in,move out,end of lease,deposit,rental,tenant,landlord,white glove,intensive,thorough',
 'Services & Pricing', datetime('now'), datetime('now')),

('Does the Deep Clean include inside the oven and fridge',
 'Yes! Unlike a Maintenance Clean, our Deep Clean explicitly includes degreasing the inside of your oven, wiping out the fridge and freezer compartments, and sanitizing all kitchen appliances. It is one of the key differences that makes a Deep Clean truly intensive.',
 'oven,fridge,inside appliances,kitchen,degrease,appliance,deep clean includes,microwave',
 'Services & Pricing', datetime('now'), datetime('now')),

('How do you handle keys and gate remotes',
 'We have a strict Key Management Policy. All keys are tagged, logged, and stored in a secure lock-up when not in use. Our staff are trained on the importance of property security, especially in access-controlled estates in the Northern Suburbs. Keys are never duplicated or shared.',
 'keys,gate remote,access,key management,security,lock,who holds keys,safe,duplicate',
 'Safety & Trust', datetime('now'), datetime('now')),

('Is my personal information safe with you',
 'Yes. We are fully compliant with the Protection of Personal Information Act (POPIA). Your data is stored on secure Cloudflare infrastructure with encryption at rest and in transit. We never sell or share your personal information with third parties. You have the right to access, correct, or delete your data at any time. Contact our Information Officer at it@scratchsolidsolutions.org for data-related requests.',
 'privacy,personal information,poipa,data protection,secure,confidential,GDPR,information officer,data rights',
 'Technology & Data', datetime('now'), datetime('now')),

('How can I contact you',
 'You can reach us in several ways: WhatsApp: +27 69 673 5947 (fastest response). Email: customerservice@scratchsolidsolutions.org. Website: scratchsolidsolutions.org. Instagram & Facebook: @ScratchSolidSolutions. Our customer service team is available during business hours and responds to WhatsApp messages throughout the day.',
 'contact,phone,email,whatsapp,reach,message,call,social media,instagram,facebook,how to reach',
 'General FAQ', datetime('now'), datetime('now')),

('Do you do laundry or ironing',
 'Our primary focus is property maintenance and hygiene — surfaces, floors, bathrooms, kitchens, and sanitization. We do not currently offer laundry or ironing as a standard service. For long-term or contract clients, feel free to ask about custom add-on requests and we will assess feasibility.',
 'laundry,washing,ironing,clothes,linen,wash,press,not offered',
 'Services & Pricing', datetime('now'), datetime('now')),

('What happens if the cleaner arrives late',
 'Because of our live geolocation tracking, you can see in real time if traffic on routes like the N1 or around Tygervalley is causing a delay. If there is a significant hold-up, our customer service team will proactively reach out to you with an updated ETA. We believe in transparency, not excuses.',
 'late,delay,traffic,behind schedule,held up,not on time,missed appointment,ETA update',
 'Transparency & Tracking', datetime('now'), datetime('now')),

('Will I get a notification when the job is done',
 'Yes. As soon as the cleaner marks the session as "Completed" on our app, the status updates in real time on your tracker. For short-term rental hosts, this is invaluable — you will know the exact moment your property is guest-ready. You can also enable email or WhatsApp notifications in your client dashboard.',
 'notification,alert,done,finished,completed,when job done,message,sms,whatsapp alert,email',
 'Transparency & Tracking', datetime('now'), datetime('now')),

('What does Idle status mean on the tracker',
 '"Idle" simply means the cleaner is currently between jobs or preparing for their next transit. It does not mean they are slacking off — it is a normal status in our workflow. As soon as they begin travelling to your address, the status will update to "On the Way."',
 'idle,what does idle mean,status meaning,explanation,between jobs,waiting,not moving',
 'Transparency & Tracking', datetime('now'), datetime('now')),

('Can I leave a review after my clean',
 'Absolutely, and we encourage it! After a booking is marked "Completed," you can leave a review and upload photos through your client dashboard or business dashboard. Your feedback helps us maintain our standards and helps future clients choose with confidence.',
 'review,feedback,rating,testimonial,stars,opinion,experience,rate,compliment,complaint',
 'General FAQ', datetime('now'), datetime('now')),

('How do I get a quote',
 'Requesting a quote is easy: 1) WhatsApp us at +27 69 673 5947 with your property type, area, and service needed. 2) Use the Quick Quote button on our website. 3) Email customerservice@scratchsolidsolutions.org with details. We typically respond within a few hours with a tailored estimate based on square metres, service type, and any special requirements.',
 'quote,estimate,how much will it cost,pricing request,how do I get a quote,tailored estimate',
 'Services & Pricing', datetime('now'), datetime('now')),

('What makes Scratch Solid Solutions different',
 'Three things set us apart: 1) Real-Time Transparency — live GPS tracking, geofencing, and status updates so you never wonder what is happening. 2) Quality Assurance — background-checked staff, rigorous training, and a satisfaction guarantee with free re-cleans within 24 hours. 3) Local Expertise — we know the Northern Suburbs inside out, from traffic patterns to estate access protocols. We are not just cleaners; we are your local cleaning partners.',
 'different,better,why choose,unique,what makes you special,competitor,advantage,stand out,why us',
 'About Us', datetime('now'), datetime('now')),

('Can I see photos of your work',
 'Yes! Visit our Gallery page at scratchsolidsolutions.org/gallery to see before-and-after photos from real cleans. You can also view photo uploads from satisfied clients in our Reviews section. If you are a business client, we can provide a portfolio of commercial work on request.',
 'photos,portfolio,work,gallery,examples,before after,pictures,see your work,proof,results',
 'General FAQ', datetime('now'), datetime('now')),

('Do you work on weekends',
 'Yes, Saturdays are a core part of our schedule. We are open Saturdays from 08:00 to 13:00. Weekend cleaning is perfect for short-term rental turnovers and busy professionals. Note that weekend rates may be higher for one-off bookings — contract clients have weekend rates built into their agreement.',
 'weekend,saturday,sunday,weekend work,saturday cleaning,weekend availability',
 'Booking & Scheduling', datetime('now'), datetime('now')),

('Do you offer gift vouchers',
 'Yes! A cleaning service voucher makes a thoughtful and practical gift for new homeowners, busy parents, or anyone who deserves a break. Contact us via WhatsApp to purchase a voucher in any denomination. Vouchers are valid for 12 months and can be redeemed for any service.',
 'gift,voucher,present,card,coupon,buy gift,give cleaning, christmas,birthday',
 'General FAQ', datetime('now'), datetime('now')),

('How do I become a cleaner for Scratch Solid Solutions',
 'We are always looking for dedicated, detail-oriented people to join our team. Visit our Cleaner Sign-Up page or WhatsApp us to express interest. All applicants undergo background checks and training before being assigned to clients. We offer competitive pay, ongoing training, and a supportive team culture.',
 'join,work for,apply,job,career,employment,become cleaner,hire,recruit,vacancy,work with us',
 'General FAQ', datetime('now'), datetime('now')),

('What is your data retention policy',
 'In line with POPIA, we retain personal data only for as long as necessary: booking and payment records for 7 years (tax compliance), tracking and location data for 90 days, and marketing data until you unsubscribe. You can request data deletion at any time via it@scratchsolidsolutions.org. We purge deleted data within 48 hours of a confirmed request.',
 'data retention,how long keep data,delete data,purge,policy,storage,records,how long',
 'Technology & Data', datetime('now'), datetime('now')),

('How does the end-to-end tracking work from booking to completion',
 'Here is the full journey: 1) You book via our website or WhatsApp. 2) Our system assigns a cleaner based on availability, skills, and proximity. 3) You receive a confirmation with your booking details and a unique tracking link. 4) On the day, the cleaner marks "On the Way" — you see their live GPS location. 5) They arrive at your property — the geofence auto-verifies their presence. 6) Cleaning is performed against a digital checklist. 7) The cleaner marks "Completed" — you receive a notification. 8) Your invoice is generated automatically. 9) You pay via EFT or online portal. 10) You can leave a review and upload completion photos. Every step is logged for transparency.',
 'end to end,full process,journey,step by step,how does it work,what happens,workflow,from start to finish,complete flow',
 'Transparency & Tracking', datetime('now'), datetime('now'));
