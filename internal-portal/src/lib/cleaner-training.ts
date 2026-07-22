export type LessonBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'callout'; text: string };

export type QuizQuestion = {
  question: string;
  options: string[];
  correctAnswerIndex: number;
};

export type CleanerTrainingModule = {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  lessonContent: LessonBlock[];
  quiz: QuizQuestion[];
};

// Lesson content and quizzes are a first draft - written from the app's
// actual current behaviour (KPI formula in lib/kpi.ts, the WhatsApp/GPS
// check-in flow in api/cleaner/gps-ping/route.ts) plus standard SA
// OHS/POPIA/cleaning-industry practice where no real source material
// existed. Review before treating this as the final, official version.
//
// Module 3's quiz folds in real, previously-authored questions recovered
// from an older training system's "specification document" (cloth colour
// coding, mop technique, deep-clean protocol, final-walkthrough ritual) -
// those are marked below. Modules 1, 4 and 6 each carry one more recovered
// question that fit their topic better than their original home.
export const CLEANER_TRAINING_MODULES: CleanerTrainingModule[] = [
  {
    id: 'module-1',
    title: 'POPIA, Privacy & Data Protection',
    description:
      'Understand the Protection of Personal Information Act (POPIA). Learn how to handle client data, ' +
      'obtain consent, report breaches within 48 hours, and securely dispose of records. ' +
      'Includes Scratch Solid\'s data-retention and right-to-be-forgotten policies.',
    duration_minutes: 20,
    lessonContent: [
      { type: 'paragraph', text: 'Every job puts you inside someone\'s home or office - their address, their gate code, their alarm code, sometimes their paperwork on a desk. POPIA (the Protection of Personal Information Act) is the law that governs how that information gets handled, and it applies to you every time you\'re on site.' },
      { type: 'heading', text: 'What counts as personal information here' },
      { type: 'list', items: [
        'Gate codes, alarm codes, and spare-key locations',
        'Photos taken for job records (before/after photos, damage reports)',
        'Anything written down on a client\'s desk, mail, or documents',
        'A client\'s booking history, address, or contact details',
      ] },
      { type: 'callout', text: 'Never photograph, copy, or share a client\'s access codes or documents outside the app\'s job-report tools - not even in a personal WhatsApp chat.' },
      { type: 'heading', text: 'If something goes wrong' },
      { type: 'paragraph', text: 'If you lose a gate code, misplace a key, or think client information may have been exposed, tell your supervisor the same day. Scratch Solid has to report certain breaches within 48 hours, and that clock starts when you tell us - not when we find out some other way.' },
      { type: 'heading', text: 'Handling paperwork and desks' },
      { type: 'paragraph', text: 'In offices and home studies, you\'ll often clean around open paperwork. Don\'t read it, stack it differently, or move it into drawers to "tidy up" - clean the visible open surfaces only and leave documents exactly as you found them.' },
    ],
    quiz: [
      { question: 'You accidentally lose a client\'s gate access code. What should you do?', options: ['Say nothing - it will probably be fine', 'Tell your supervisor the same day', 'Write it down somewhere safer and keep working'], correctAnswerIndex: 1 },
      { question: 'You\'re cleaning a corporate desk covered in open client files and documents. What\'s the correct approach?', options: ['Stack the files neatly by size, wipe the desk, and put them back', 'Do not move or touch the paperwork - clean around the visible open desk areas only', 'Put the loose papers in a drawer to keep the surface clean'], correctAnswerIndex: 1 },
      { question: 'Which of these is fine to do with a client\'s gate or alarm code?', options: ['Save it in the job app as intended', 'Text it to a friend covering your shift', 'Post a before/after photo that includes it, for your own records'], correctAnswerIndex: 0 },
      { question: 'What law governs how you must handle a client\'s personal information on the job?', options: ['The Consumer Protection Act', 'POPIA (Protection of Personal Information Act)', 'The Companies Act'], correctAnswerIndex: 1 },
      { question: 'Which of these counts as personal information you must protect?', options: ['The street name the property is on', 'The client\'s gate and alarm codes', 'The colour of the front door'], correctAnswerIndex: 1 },
      { question: 'How quickly does Scratch Solid need to report certain data breaches?', options: ['Within 48 hours', 'Within 30 days', 'Only if the client asks'], correctAnswerIndex: 0 },
      { question: 'When does the 48-hour breach-reporting clock start?', options: ['When you tell your supervisor', 'When the client notices something wrong', 'When head office does a routine audit'], correctAnswerIndex: 0 },
      { question: 'Is it OK to take extra photos "for your own records" beyond what the job-report tool asks for?', options: ['Yes, as long as they stay on your phone', 'No', 'Only for damage claims'], correctAnswerIndex: 1 },
      { question: 'You find a client\'s document open on a desk. What should you do with it?', options: ['Leave it exactly as you found it', 'Turn it face-down for privacy', 'File it in a drawer to tidy up'], correctAnswerIndex: 0 },
      { question: 'Is it OK to save a client\'s access code in your personal phone notes "just in case"?', options: ['Yes, it\'s more convenient', 'No - use the app\'s intended tools only', 'Only if you delete it after the job'], correctAnswerIndex: 1 },
    ],
  },
  {
    id: 'module-2',
    title: 'Occupational Health & Safety (OHS)',
    description:
      'South African OHS Act compliance for cleaners. Covers PPE requirements, slip-trip-fall prevention, ' +
      'hazardous chemical handling (GHS labels), emergency procedures, and incident reporting. ' +
      'Includes COID Act basics and employer/employee duties.',
    duration_minutes: 25,
    lessonContent: [
      { type: 'paragraph', text: 'Cleaning involves chemicals, wet floors, and repetitive physical work - all manageable safely if you follow a few core habits every shift.' },
      { type: 'heading', text: 'PPE - non-negotiable basics' },
      { type: 'list', items: [
        'Gloves for any chemical use or bathroom/kitchen deep cleaning',
        'A mask when using strong-smelling or dust-generating products',
        'Closed, non-slip shoes - no sandals or open-toe footwear on the job',
      ] },
      { type: 'heading', text: 'Chemicals: read the label, every time' },
      { type: 'paragraph', text: 'Every cleaning product carries a GHS hazard label (the diamond-shaped icons). Learn what they mean for the products you use most, and never mix bleach-based and ammonia-based products - the fumes are dangerous. Keep the area ventilated when using strong chemicals.' },
      { type: 'callout', text: 'Never mix bleach and ammonia-based cleaners. If you\'re not sure what\'s in a product, don\'t combine it with anything else.' },
      { type: 'heading', text: 'Slips, trips, and falls' },
      { type: 'paragraph', text: 'Wet floors are the single biggest injury risk in this job. Mop in a way that keeps you on dry ground (see Module 3), and be extra careful on stairs and tiled entryways.' },
      { type: 'heading', text: 'If you\'re injured on the job' },
      { type: 'paragraph', text: 'Report any injury to your supervisor the same day, however minor it seems. You\'re covered under the Compensation for Occupational Injuries and Diseases Act (COID) while performing your duties - reporting promptly is what makes a claim possible later if it\'s needed.' },
    ],
    quiz: [
      { question: 'Which two types of cleaning products should never be mixed?', options: ['Glass cleaner and water', 'Bleach-based and ammonia-based products', 'Two different brands of dish soap'], correctAnswerIndex: 1 },
      { question: 'What footwear is required on the job?', options: ['Whatever is comfortable', 'Closed, non-slip shoes', 'Sandals, as long as they\'re clean'], correctAnswerIndex: 1 },
      { question: 'You cut your finger slightly on a job. What should you do?', options: ['Ignore it, it\'s minor', 'Report it to your supervisor the same day', 'Only mention it if it gets worse'], correctAnswerIndex: 1 },
      { question: 'What do the diamond-shaped GHS labels on a chemical bottle tell you?', options: ['The brand\'s marketing slogan', 'Hazard information for that product', 'The expiry date'], correctAnswerIndex: 1 },
      { question: 'When should you wear a mask on the job?', options: ['Never - it\'s not required', 'When using strong-smelling or dust-generating products', 'Only on your first week'], correctAnswerIndex: 1 },
      { question: 'What is the single biggest injury risk in this job?', options: ['Paper cuts', 'Wet floors (slips, trips, falls)', 'Sunburn'], correctAnswerIndex: 1 },
      { question: 'Which Act covers you if you\'re injured while performing your duties?', options: ['COID (Compensation for Occupational Injuries and Diseases Act)', 'The Rental Housing Act', 'The Tax Administration Act'], correctAnswerIndex: 0 },
      { question: 'When should you report a workplace injury, even a minor one?', options: ['Only if it needs medical attention', 'The same day it happens', 'At the end of the month'], correctAnswerIndex: 1 },
      { question: 'You\'re not sure what a chemical contains. What should you do?', options: ['Mix a small amount with another product to test it', 'Check the label and don\'t combine it with anything else', 'Use it anyway, it\'s probably fine'], correctAnswerIndex: 1 },
      { question: 'Why should the area be ventilated when using strong chemicals?', options: ['So the floor dries faster', 'Because the fumes can be dangerous', 'To make the scent last longer'], correctAnswerIndex: 1 },
    ],
  },
  {
    id: 'module-3',
    title: 'Cleaning Standards & Service Delivery',
    description:
      'Scratch Solid\'s 5-star service standard: room-by-room checklists, colour-coded cloth systems, ' +
      'cross-contamination prevention, high-touch disinfection, and post-construction clean-up protocols. ' +
      'Aligns with SANS 10049 and ISO 9001 quality principles.',
    duration_minutes: 35,
    lessonContent: [
      { type: 'paragraph', text: '"Every smudge left behind is a scratch on our reputation; every gleaming surface is a signature of our excellence." This module covers the technique standards that make that true, job after job.' },
      { type: 'heading', text: 'The 5-colour cloth system' },
      { type: 'paragraph', text: 'Colour-coded cloths exist to stop cross-contamination between rooms. Match the cloth colour to the surface, every time - it\'s the single easiest way to keep a job hygienic.' },
      { type: 'list', items: [
        'Orange - basins, faucets, and polished bathroom fittings',
        'Yellow - electronics, keypads, and delicate office equipment',
        'Green and red - reserved for other surface categories per your induction briefing',
      ] },
      { type: 'heading', text: 'Mopping technique' },
      { type: 'paragraph', text: 'Always start in the furthest corner of a room and mop backward toward the exit door - this way you never walk on, or leave footprints in, the area you just cleaned.' },
      { type: 'heading', text: 'Maintenance clean vs. deep clean' },
      { type: 'paragraph', text: 'On a standard Maintenance Clean, kitchen appliance exteriors get cleaned and polished - no interior teardown. A Deep Clean goes further: skirting boards, door frames, light switches, and internal appliance surfaces (like the inside of a fridge) all get attention that a maintenance visit skips.' },
      { type: 'heading', text: 'The final walkthrough' },
      { type: 'paragraph', text: 'Before you leave any job, do a slow 360-degree visual check of the space from top to bottom, looking for anything missed. Finish by applying the signature lemon-scented room spray as a light mist near the exit door - this is the last thing you do, not the first.' },
      { type: 'callout', text: 'The lemon spray goes on light, in the air near the exit, right as you finish - never heavily on fabric, and never at the start of a job.' },
    ],
    quiz: [
      { question: 'Complete the philosophy: "Every smudge left behind is a scratch on our reputation; every gleaming surface is a..."', options: ['...reason to ask for a tip.', '...signature of our excellence.', '...job done fast.'], correctAnswerIndex: 1 },
      { question: 'What colour microfibre cloth is used for basins and polished faucets?', options: ['Green', 'Red', 'Orange'], correctAnswerIndex: 2 },
      { question: 'What colour cloth is used for electronics, keypads, and office equipment?', options: ['Green', 'Red', 'Yellow'], correctAnswerIndex: 2 },
      { question: 'What is the correct path when damp-mopping a hard-floor room?', options: ['Start at the doorway and work inward', 'Start in the furthest corner and mop backward toward the exit', 'Mop in circles from the middle outward'], correctAnswerIndex: 1 },
      { question: 'On a standard Maintenance Clean, what\'s the rule for kitchen appliances?', options: ['Take them apart and scrub every component', 'Clean and polish the exterior surfaces and handles - no interior teardown', 'Leave them untouched entirely'], correctAnswerIndex: 1 },
      { question: 'Which task is a key differentiator of a Deep Clean vs. a Maintenance Clean?', options: ['Making beds and straightening cushions', 'Deep-cleaning skirting boards, door frames, light switches, and internal appliance surfaces', 'Emptying the kitchen trash can'], correctAnswerIndex: 1 },
      { question: 'What\'s the first step of the Final Walkthrough protocol?', options: ['Spray the signature lemon spray near the entry door', 'Do a slow, 360-degree visual check of the room from top to bottom', 'Lock the door and leave'], correctAnswerIndex: 1 },
      { question: 'Where and when should the signature lemon room spray be applied?', options: ['Heavily on fabric and curtains at the start of the shift', 'As a light mist near the exit door, right as you finish the final walkthrough', 'Heavily throughout the entire space'], correctAnswerIndex: 1 },
      { question: 'What is the purpose of the 5-colour cloth system?', options: ['To make the cleaning cart look organised', 'To prevent cross-contamination between rooms and surfaces', 'To match the client\'s decor'], correctAnswerIndex: 1 },
      { question: 'Why do you mop backward toward the exit door instead of forward?', options: ['It\'s faster', 'So you never walk on, or leave footprints in, the area you just cleaned', 'It uses less water'], correctAnswerIndex: 1 },
    ],
  },
  {
    id: 'module-4',
    title: 'Equipment, Chemicals & Sustainability',
    description:
      'Correct use and daily maintenance of vacuum cleaners, floor scrubbers, steam cleaners, pressure washers, and ' +
      'micro-fibre systems. Chemical dilution ratios, SDS sheets, green-cleaning alternatives, ' +
      'and water-saving practices for the South African context.',
    duration_minutes: 25,
    lessonContent: [
      { type: 'paragraph', text: 'Good equipment care protects both the client\'s home and your own safety, and gets you through the day faster.' },
      { type: 'heading', text: 'Deep-cleaning a refrigerator' },
      { type: 'paragraph', text: 'On a Deep Clean, the fridge gets a real interior clean, not just a wipe-down: temporarily remove all contents safely, wash the interior shelves and drawers with a food-safe sanitizer, dry them fully, and put everything back neatly in its original place.' },
      { type: 'heading', text: 'Steam cleaners' },
      { type: 'paragraph', text: 'We use steam cleaners for tile grout, high-touch disinfection, and some upholstery work - the heat kills germs with little to no chemical needed, which is great for chemical-sensitive homes and pets.' },
      { type: 'list', items: [
        'Never use a steam cleaner on unsealed wood, delicate electronics, or anywhere the client hasn\'t approved',
        'Hot steam and hot water in the tank can burn - keep the nozzle pointed away from yourself and others, and use gloves',
        'Empty, let cool, and descale the tank after use per the equipment\'s instructions - never store it full',
      ] },
      { type: 'heading', text: 'Chemical dilution and SDS sheets' },
      { type: 'paragraph', text: 'Always follow the dilution ratio printed on the product - stronger isn\'t better, and over-diluting wastes product without cleaning properly. Every chemical on site should have an SDS (Safety Data Sheet) available; know where to find it if you need to check handling instructions.' },
      { type: 'heading', text: 'Equipment upkeep' },
      { type: 'list', items: [
        'Empty and rinse vacuum canisters/bags after every shift, not just when full',
        'Rinse and wring mop heads before storing - a damp mop left folded breeds mould',
        'Report any equipment fault (frayed cord, weak suction, leaking bottle) immediately rather than working around it',
      ] },
      { type: 'callout', text: 'Water-saving matters in the South African context - use bucket-and-cloth methods over running taps wherever the job allows it.' },
    ],
    quiz: [
      { question: 'What is the correct protocol for a residential fridge on a Deep Clean?', options: ['Spray disinfectant around the food containers without moving them', 'Temporarily remove all contents safely, wash interior shelves/drawers with food-safe sanitizer, dry, and replace items neatly', 'Unplug the appliance and leave the door open'], correctAnswerIndex: 1 },
      { question: 'How should you determine how much to dilute a cleaning chemical?', options: ['Always use it at full strength for a deeper clean', 'Follow the dilution ratio printed on the product', 'Dilute it as much as possible to save product'], correctAnswerIndex: 1 },
      { question: 'What should you do with vacuum canisters and mop heads at the end of a shift?', options: ['Leave them as-is for the next job', 'Empty/rinse the vacuum and rinse-and-wring the mop head before storing', 'Only clean them once a week'], correctAnswerIndex: 1 },
      { question: 'What is a key benefit of using a steam cleaner?', options: ['It disinfects with heat, using little to no chemical', 'It works faster than any other tool on every surface', 'It never needs to be emptied'], correctAnswerIndex: 0 },
      { question: 'Which surface should you avoid using a steam cleaner on?', options: ['Sealed tile grout', 'Unsealed wood or delicate electronics', 'Bathroom fittings'], correctAnswerIndex: 1 },
      { question: 'What is the main safety risk with a steam cleaner?', options: ['It\'s too quiet to notice it\'s on', 'Burns from hot steam or hot water in the tank', 'It uses too much electricity'], correctAnswerIndex: 1 },
      { question: 'What should you do to a steam cleaner after use?', options: ['Store it full so it\'s ready for next time', 'Empty it, let it cool, and descale per the instructions', 'Leave it running to dry out'], correctAnswerIndex: 1 },
      { question: 'What does SDS stand for?', options: ['Safety Data Sheet', 'Standard Detergent System', 'Site Delivery Schedule'], correctAnswerIndex: 0 },
      { question: 'Why shouldn\'t you over-dilute a cleaning chemical to save product?', options: ['It voids the warranty on the bottle', 'It wastes product without cleaning properly', 'It changes the chemical\'s colour'], correctAnswerIndex: 1 },
      { question: 'What water-saving practice is recommended for the South African context?', options: ['Leaving taps running while you work for convenience', 'Bucket-and-cloth methods over running taps wherever possible', 'Using twice the recommended chemical to clean faster'], correctAnswerIndex: 1 },
    ],
  },
  {
    id: 'module-5',
    title: 'Customer Relations, Complaints & WhatsApp Protocol',
    description:
      'Professional communication with residential and commercial clients. Escalation paths, ' +
      'complaint resolution within 24 hours, WhatsApp Business etiquette, photo-reporting standards, ' +
      'and maintaining a 4.8+ star review average.',
    duration_minutes: 20,
    lessonContent: [
      { type: 'paragraph', text: 'Half of your monthly KPI score comes directly from client ratings (see Module 7) - how you communicate on the job matters as much as the cleaning itself.' },
      { type: 'heading', text: 'WhatsApp Business etiquette' },
      { type: 'paragraph', text: 'Keep messages professional, brief, and job-related. Confirm arrival and completion through the app\'s intended check-in flow (Module 6), not casual chat.' },
      { type: 'heading', text: 'If a client raises a concern' },
      { type: 'list', items: [
        'Stay calm and professional - never argue with a client on site',
        'If it\'s something you can fix immediately (a missed spot, a moved item), fix it on the spot',
        'If it\'s bigger than that, escalate to your supervisor rather than promising something you can\'t control',
      ] },
      { type: 'callout', text: 'Complaints get resolved within 24 hours company-wide - escalating promptly is what makes that possible, not a sign of failure.' },
      { type: 'heading', text: 'Photo-reporting standards' },
      { type: 'paragraph', text: 'When the job requires before/after photos, take them through the app only, and keep them limited to the cleaning result - never include documents, screens, or anything containing a client\'s personal information (see Module 1).' },
    ],
    quiz: [
      { question: 'A client is unhappy about a missed spot you can fix right away. What do you do?', options: ['Apologise and fix it on the spot', 'Tell them to submit a complaint through the app instead', 'Ignore it and finish the rest of the job first'], correctAnswerIndex: 0 },
      { question: 'A client raises a concern that\'s bigger than something you can fix on site. What\'s the right move?', options: ['Promise a discount yourself to keep them happy', 'Escalate it to your supervisor', 'Argue that the job was done correctly'], correctAnswerIndex: 1 },
      { question: 'What should before/after job photos always exclude?', options: ['The cleaned surface itself', 'Anything containing the client\'s personal information (documents, screens, codes)', 'The room\'s general lighting'], correctAnswerIndex: 1 },
      { question: 'What percentage of your monthly KPI comes directly from client ratings?', options: ['25%', '50%', '75%'], correctAnswerIndex: 1 },
      { question: 'Where should you confirm arrival and completion with a client?', options: ['Through the app\'s intended check-in flow, not casual chat', 'Through a personal phone call every time', 'It doesn\'t matter, any message works'], correctAnswerIndex: 0 },
      { question: 'Within what timeframe does Scratch Solid aim to resolve client complaints?', options: ['24 hours', '7 days', '30 days'], correctAnswerIndex: 0 },
      { question: 'Is escalating a complaint to your supervisor a sign you\'ve failed?', options: ['Yes, you should always resolve it yourself', 'No - escalating promptly is the correct process', 'Only if the client is very upset'], correctAnswerIndex: 1 },
      { question: 'What tone should you keep in WhatsApp messages with clients?', options: ['Casual and chatty', 'Professional, brief, and job-related', 'As detailed as possible about your day'], correctAnswerIndex: 1 },
      { question: 'A client raises their voice at you on site. What should you do?', options: ['Raise your voice back to be heard', 'Stay calm and professional', 'Leave the job immediately without a word'], correctAnswerIndex: 1 },
      { question: 'What star-rating average does the company aim to maintain?', options: ['3.0+', '4.0+', '4.8+'], correctAnswerIndex: 2 },
    ],
  },
  {
    id: 'module-6',
    title: 'Booking App, Check-In & Shift Adherence',
    description:
      'How Scratch Solid confirms arrival and completion: WhatsApp START/HERE/DONE as your primary ' +
      'check-in signal, with GPS as an automatic backup. Covers adherence scoring, the Transparency ' +
      'Policy, and payslip access via the ERPNext integration.',
    duration_minutes: 20,
    lessonContent: [
      { type: 'paragraph', text: 'Scratch Solid\'s Transparency Policy - real-time visibility into where staff are and when jobs happen - is one of our biggest differentiators with clients, and it runs through two systems working together.' },
      { type: 'heading', text: 'Your primary signal: WhatsApp' },
      { type: 'paragraph', text: 'Send START when you begin travelling to a job, HERE when you arrive, and DONE when you finish. This is the signal you control, and it\'s what the client dashboard and your adherence score are built from first.' },
      { type: 'heading', text: 'GPS: your safety net, not your primary method' },
      { type: 'paragraph', text: 'If a WhatsApp message doesn\'t go through - no signal, a forgotten phone - a live location ping can confirm the same arrival/completion moments automatically. It never overwrites a WhatsApp signal you already sent; it only fills the gap. Don\'t rely on GPS instead of sending your WhatsApp messages - it\'s a backup, not a replacement.' },
      { type: 'callout', text: 'Always send your WhatsApp START/HERE/DONE messages. Treat GPS as the safety net under you, not the main system.' },
      { type: 'heading', text: 'Adherence and your payslip' },
      { type: 'paragraph', text: 'Your system score (25% of your monthly KPI - see Module 7) comes directly from how closely your check-in times match your scheduled booking. Payslips are generated through the ERPNext integration and available in the app once processed each month.' },
    ],
    quiz: [
      { question: 'What is Scratch Solid\'s primary check-in signal for a job?', options: ['A live GPS ping only', 'WhatsApp messages: START, HERE, and DONE', 'A phone call to the office'], correctAnswerIndex: 1 },
      { question: 'What role does GPS play in the check-in process?', options: ['It\'s the only method that matters', 'A backup confirmation if a WhatsApp message doesn\'t come through - it never overwrites a WhatsApp signal', 'It replaces WhatsApp check-ins entirely'], correctAnswerIndex: 1 },
      { question: 'What does your "system score" (part of your monthly KPI) measure?', options: ['How many jobs you\'ve done in total', 'How closely your check-in times match your scheduled booking', 'How many client reviews you\'ve received'], correctAnswerIndex: 1 },
      { question: 'What are the three WhatsApp check-in messages, in order?', options: ['START, HERE, DONE', 'ARRIVE, CLEAN, LEAVE', 'BEGIN, MIDDLE, END'], correctAnswerIndex: 0 },
      { question: 'When do you send the START message?', options: ['When you finish the job', 'When you begin travelling to a job', 'The night before'], correctAnswerIndex: 1 },
      { question: 'When do you send the HERE message?', options: ['When you arrive at the job', 'Halfway through the job', 'When you leave home'], correctAnswerIndex: 0 },
      { question: 'When do you send the DONE message?', options: ['When you start cleaning', 'When you finish the job', 'When the client pays'], correctAnswerIndex: 1 },
      { question: 'What percentage of your monthly KPI does your system score represent?', options: ['10%', '25%', '50%'], correctAnswerIndex: 1 },
      { question: 'Where are your payslips generated from?', options: ['A spreadsheet emailed manually', 'The ERPNext integration, available in the app', 'You have to request them by phone'], correctAnswerIndex: 1 },
      { question: 'What happens if you rely on GPS alone and never send your WhatsApp messages?', options: ['Nothing, GPS covers everything', 'You risk incomplete confirmation - GPS is a backup, not a replacement', 'Your pay increases automatically'], correctAnswerIndex: 1 },
    ],
  },
  {
    id: 'module-7',
    title: 'Your Pool, Your KPI, Your Bonus — How Your Pay Grows',
    description:
      'This module explains exactly how your day-to-day work turns into your annual bonus and salary increase, so you can start growing it from day one. ' +
      'Every cleaner is placed in one of two pools by the admin team. If you\'re in the AUTO pool, the system assigns you automatically to standard and maintenance cleans - jobs one person can finish inside a normal booking window. ' +
      'If you\'re in the MANUAL pool, the admin team assigns you by hand, usually together with one or more other cleaners, to bigger jobs like deep cleans, post-construction clean-ups, commercial sites, and move-in/move-out cleans - jobs that need more than one person to finish properly in the time given. ' +
      'Being in either pool is not a reward or a punishment - it\'s about matching the right team size to the right job, and you can ask your admin which pool you\'re in and why at any time. ' +
      'Once a month, your performance is scored out of 5, made up of three parts that always add up to 100%. Fifty percent comes from your client rating - the actual rating your client gives the job after it\'s done, real customer feedback rather than anyone\'s guess, so the way you treat clients and the quality you leave behind directly moves half your score. ' +
      'Twenty-five percent comes from the system score, calculated automatically from your GPS check-in against your scheduled start time - arriving on time or early keeps this score high, and it drops the later you check in, coming straight from your check-in rather than being typed in by anyone. ' +
      'The last twenty-five percent comes from your monthly admin review, where an admin rates your attendance, how well you live the company\'s values, the quality of your work, and how you communicate - this is where things that aren\'t captured automatically, like teamwork, attitude, and following procedure, get recognised. ' +
      'On a MANUAL-pool job with more than one cleaner assigned, everyone on that job shares the same client rating since there\'s only one client experience to rate, but your system score and admin score are still yours alone, so your own punctuality and your own admin review always affect your own KPI, even on a shared job. ' +
      'Your monthly scores are averaged across the year, and that average is your annual KPI, used every February to work out your bonus and salary increase for the year ahead: a KPI of 5 out of 5 pays 100% of your bonus amount and 100% of that year\'s increase budget, 4 out of 5 pays 80%, 3 out of 5 pays 60%, 2 out of 5 pays 40%, and 1 out of 5 pays 20%. ' +
      'You can check your current KPI, its three components, and an estimate of your bonus at any time on your dashboard - it updates as new ratings and reviews come in, so you always know where you stand and what to focus on. ' +
      'From day one: show up on time or early for every job to protect your system score, do careful thorough work and treat every client well to protect your client score, and follow the standards from Modules 1 through 6 and communicate professionally to protect your admin score - all three together are what grow your bonus and your increase every year.',
    duration_minutes: 20,
    lessonContent: [
      { type: 'heading', text: 'Your pool' },
      { type: 'paragraph', text: 'Every cleaner is placed in one of two pools. AUTO pool: the system assigns you automatically to standard and maintenance cleans - jobs one person can finish in a normal window. MANUAL pool: admin assigns you by hand, usually with other cleaners, to bigger jobs (deep cleans, post-construction, commercial sites, move-in/move-out). Neither is a reward or punishment - it\'s about matching team size to the job. Ask your admin which pool you\'re in any time.' },
      { type: 'heading', text: 'Your monthly KPI - three parts, always adding to 100%' },
      { type: 'list', items: [
        '50% - Client rating: the actual rating your client gives after the job',
        '25% - System score: calculated automatically from your check-in time vs. your scheduled start',
        '25% - Admin review: attendance, company values, work quality, and communication',
      ] },
      { type: 'callout', text: 'On a shared MANUAL-pool job, everyone shares the client rating - but your system score and admin score are always yours alone.' },
      { type: 'heading', text: 'From KPI to bonus' },
      { type: 'paragraph', text: 'Your monthly scores average into your annual KPI (out of 5), used every February to set your bonus and salary increase: 5/5 pays 100%, 4/5 pays 80%, 3/5 pays 60%, 2/5 pays 40%, 1/5 pays 20%. You can check your current KPI and its three components on your dashboard at any time.' },
      { type: 'heading', text: 'What protects your KPI, starting day one' },
      { type: 'list', items: [
        'Show up on time or early for every job - protects your system score',
        'Do careful, thorough work and treat every client well - protects your client score',
        'Follow the standards from Modules 1-6 and communicate professionally - protects your admin score',
      ] },
    ],
    quiz: [
      { question: 'What are the three components of your monthly KPI, and their weights?', options: ['Client rating 50% / System score 25% / Admin review 25%', 'Client rating 33% / System score 33% / Admin review 34%', 'Attendance 50% / Client rating 50%'], correctAnswerIndex: 0 },
      { question: 'A KPI of 4 out of 5 pays what percentage of your bonus and increase?', options: ['60%', '80%', '100%'], correctAnswerIndex: 1 },
      { question: 'On a shared MANUAL-pool job with multiple cleaners assigned, what is shared vs. individual?', options: ['Everything is shared equally, including system and admin scores', 'The client rating is shared, but system score and admin score are always your own', 'Nothing is shared - each cleaner is rated completely separately'], correctAnswerIndex: 1 },
      { question: 'What decides whether you\'re placed in the AUTO or MANUAL pool?', options: ['Seniority', 'Matching the right team size to the job, decided by admin', 'A random draw each month'], correctAnswerIndex: 1 },
      { question: 'Which kinds of jobs typically go to the MANUAL pool?', options: ['Small standard maintenance cleans', 'Deep cleans, post-construction, commercial sites, and move-in/move-out jobs', 'Jobs with no client present'], correctAnswerIndex: 1 },
      { question: 'Is being placed in the MANUAL pool a punishment?', options: ['Yes, it means you underperformed', 'No, it\'s about matching team size to the job', 'Only if you\'re new'], correctAnswerIndex: 1 },
      { question: 'What does your monthly admin review score cover?', options: ['Only how many jobs you completed', 'Attendance, company values, work quality, and communication', 'Your client star rating'], correctAnswerIndex: 1 },
      { question: 'When is your annual KPI used to set your bonus and salary increase?', options: ['Every February', 'Every January 1st automatically', 'Only when you ask for a review'], correctAnswerIndex: 0 },
      { question: 'A KPI of 3 out of 5 pays what percentage of your bonus and increase?', options: ['40%', '60%', '80%'], correctAnswerIndex: 1 },
      { question: 'Where can you check your current KPI and its three components at any time?', options: ['Your dashboard', 'Only during your annual review', 'You have to ask HR by email'], correctAnswerIndex: 0 },
    ],
  },
];

export type NormalizedCleanerTrainingProgress = {
  modules_completed: string[];
  modules_pending: string[];
  modules_completed_at: Record<string, string>;
  completion_percentage: number;
  completed: boolean;
  background_check_consent: boolean;
  background_check_consent_at: string | null;
  contract_signed: boolean;
  contract_signed_at: string | null;
  contract_signature_id: string | null;
};

function parseCompletedAtMap(value: unknown): Record<string, string> {
  if (typeof value !== 'string' || value.trim() === '') return {};
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const result: Record<string, string> = {};
    for (const [key, val] of Object.entries(parsed)) {
      if (typeof val === 'string') result[key] = val;
    }
    return result;
  } catch {
    return {};
  }
}

// Cleaners are limited to completing 2 modules per rolling 24h window, so
// onboarding is paced rather than rushed in one sitting.
export const MAX_MODULES_PER_DAY = 2;

export function countModulesCompletedInLast24h(modulesCompletedAt: Record<string, string>): number {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  return Object.values(modulesCompletedAt).filter((timestamp) => {
    const time = Date.parse(timestamp);
    return !Number.isNaN(time) && time >= cutoff;
  }).length;
}

function parseModuleList(value: unknown): string[] {
  if (typeof value !== 'string' || value.trim() === '') {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function getDefaultPendingModules(): string[] {
  return CLEANER_TRAINING_MODULES.map((module) => module.id);
}

// correctAnswerIndex is never sent to the client - the complete endpoint
// grades server-side against CLEANER_TRAINING_MODULES, the source of truth.
export function buildCleanerTrainingModules(progress: NormalizedCleanerTrainingProgress) {
  const firstPendingModuleId = progress.modules_pending[0] || null;

  return CLEANER_TRAINING_MODULES.map((module) => {
    const isCompleted = progress.modules_completed.includes(module.id);
    const isActive = !isCompleted && module.id === firstPendingModuleId;

    return {
      id: module.id,
      title: module.title,
      description: module.description,
      duration: `${module.duration_minutes} minutes`,
      duration_minutes: module.duration_minutes,
      lessonContent: module.lessonContent,
      quiz: module.quiz.map((q) => ({ question: q.question, options: q.options })),
      completed: isCompleted,
      status: isCompleted ? 'completed' : isActive ? 'active' : 'locked',
    };
  });
}

function normalizeTrainingProgressRecord(record: Record<string, unknown> | null): NormalizedCleanerTrainingProgress {
  const defaultPendingModules = getDefaultPendingModules();
  const modulesCompleted = parseModuleList(record?.modules_completed);
  let modulesPending = parseModuleList(record?.modules_pending);

  if (modulesPending.length === 0 && modulesCompleted.length === 0) {
    modulesPending = defaultPendingModules;
  }

  const knownModuleIds = new Set(defaultPendingModules);
  const sanitizedCompleted = modulesCompleted.filter((moduleId) => knownModuleIds.has(moduleId));
  const remainingModules = defaultPendingModules.filter((moduleId) => !sanitizedCompleted.includes(moduleId));
  const sanitizedPending = remainingModules.filter((moduleId) => modulesPending.includes(moduleId) || !modulesPending.length);
  const finalPending = sanitizedPending.length > 0 ? sanitizedPending : remainingModules;
  const completionPercentage = defaultPendingModules.length > 0
    ? Math.round((sanitizedCompleted.length / defaultPendingModules.length) * 100)
    : 0;
  const completed = finalPending.length === 0;

  return {
    modules_completed: sanitizedCompleted,
    modules_pending: finalPending,
    modules_completed_at: parseCompletedAtMap(record?.modules_completed_at),
    completion_percentage: completed ? 100 : completionPercentage,
    completed,
    background_check_consent: record?.background_check_consent === 1,
    background_check_consent_at: typeof record?.background_check_consent_at === 'string' ? record.background_check_consent_at : null,
    contract_signed: record?.contract_signed === 1,
    contract_signed_at: typeof record?.contract_signed_at === 'string' ? record.contract_signed_at : null,
    contract_signature_id: typeof record?.contract_signature_id === 'string' ? record.contract_signature_id : null,
  };
}

export async function ensureCleanerTrainingProgress(db: D1Database, paysheetCode: string) {
  const existingRecord = await db.prepare(
    'SELECT * FROM training_progress WHERE employee_id = ?'
  ).bind(paysheetCode).first<Record<string, unknown>>();

  if (!existingRecord) {
    const defaultPendingModules = getDefaultPendingModules();
    await db.prepare(
      `INSERT INTO training_progress (
        employee_id,
        modules_completed,
        modules_pending,
        completion_percentage,
        completed,
        background_check_consent,
        contract_signed,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, 0, 0, 0, 0, datetime('now'), datetime('now'))`
    ).bind(
      paysheetCode,
      JSON.stringify([]),
      JSON.stringify(defaultPendingModules)
    ).run();

    return normalizeTrainingProgressRecord({
      modules_completed: '[]',
      modules_pending: JSON.stringify(defaultPendingModules),
      modules_completed_at: '{}',
      completion_percentage: 0,
      completed: 0,
      background_check_consent: 0,
      contract_signed: 0,
      background_check_consent_at: null,
      contract_signed_at: null,
      contract_signature_id: null,
    });
  }

  const normalized = normalizeTrainingProgressRecord(existingRecord);
  const needsRepair =
    JSON.stringify(parseModuleList(existingRecord.modules_completed)) !== JSON.stringify(normalized.modules_completed) ||
    JSON.stringify(parseModuleList(existingRecord.modules_pending)) !== JSON.stringify(normalized.modules_pending) ||
    Number(existingRecord.completion_percentage || 0) !== normalized.completion_percentage ||
    Number(existingRecord.completed || 0) !== (normalized.completed ? 1 : 0);

  if (needsRepair) {
    await db.prepare(
      `UPDATE training_progress
       SET modules_completed = ?, modules_pending = ?, completion_percentage = ?, completed = ?, updated_at = datetime('now')
       WHERE employee_id = ?`
    ).bind(
      JSON.stringify(normalized.modules_completed),
      JSON.stringify(normalized.modules_pending),
      normalized.completion_percentage,
      normalized.completed ? 1 : 0,
      paysheetCode
    ).run();
  }

  return normalized;
}

export function completeCleanerTrainingModule(
  progress: NormalizedCleanerTrainingProgress,
  moduleId: string
) {
  if (progress.modules_completed.includes(moduleId)) {
    return {
      modules_completed: progress.modules_completed,
      modules_pending: progress.modules_pending,
      modules_completed_at: progress.modules_completed_at,
      completion_percentage: progress.completion_percentage,
      completed: progress.completed,
      all_completed: progress.completed,
    };
  }

  const modulesCompleted = [...progress.modules_completed, moduleId].filter((value, index, array) => array.indexOf(value) === index);
  const modulesPending = progress.modules_pending.filter((pendingModuleId) => pendingModuleId !== moduleId);
  const modulesCompletedAt = { ...progress.modules_completed_at, [moduleId]: new Date().toISOString() };
  const total = CLEANER_TRAINING_MODULES.length;
  const allCompleted = modulesPending.length === 0;
  const completionPercentage = total > 0 ? Math.round((modulesCompleted.length / total) * 100) : 0;

  return {
    modules_completed: modulesCompleted,
    modules_pending: modulesPending,
    modules_completed_at: modulesCompletedAt,
    completion_percentage: allCompleted ? 100 : completionPercentage,
    completed: allCompleted,
    all_completed: allCompleted,
  };
}

export async function setCleanerOnboardingStage(db: D1Database, userId: number, stage: string) {
  try {
    await db.prepare(
      `UPDATE users
       SET onboarding_stage = ?
       WHERE id = ?`
    ).bind(stage, userId).run();
  } catch {
  }
}

export function getCleanerTrainingModule(moduleId: string): CleanerTrainingModule | undefined {
  return CLEANER_TRAINING_MODULES.find((module) => module.id === moduleId);
}
