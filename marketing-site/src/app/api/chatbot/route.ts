export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { withTracing, withSecurityHeaders } from "@/lib/middleware";
import { withRateLimit, rateLimits } from "@/lib/middleware";
import { getDb } from "@/lib/db";

// In-memory fallback knowledge base for when DB is unavailable or empty
const fallbackKB: {
  question: string;
  response: string;
  keywords: string;
  category: string;
}[] = [
  {
    question: "Who is Scratch Solid Solutions",
    response: "We are a professional cleaning service based in the Northern Suburbs of Cape Town. We deliver spotless cleaning for homes, offices, and short-term rentals. Our slogan is 'Scratch-Free, Solidly Clean'.",
    keywords: "about,who,company,scratch solid,solutions,mission,vision,values,story",
    category: "About Us"
  },
  {
    question: "What cleaning services do you offer",
    response: "We offer Residential Cleaning, Office & Commercial Cleaning, Deep Cleaning, Move-In/Move-Out Cleaning, and Short-Term Rental Turnovers.",
    keywords: "services,offer,what do you do,cleaning types,residential,office,commercial,deep clean",
    category: "Services & Pricing"
  },
  {
    question: "How much do your cleaning services cost",
    response: "Our Grand Opening Special is R350 for 4 hours. Standard Maintenance Cleans start from R400-R600. Deep Cleans are quoted individually. Request a Quick Quote via WhatsApp at +27 69 673 5947.",
    keywords: "price,cost,how much,rate,charge,pricing,fee,estimate,quote",
    category: "Services & Pricing"
  },
  {
    question: "Which areas do you service",
    response: "We service Parow, Plattekloof, Durbanville, Tygervalley, Bellville, Kuils River, and Brackenfell. Contact us via WhatsApp to confirm your specific address.",
    keywords: "areas,location,where,service,cover,region,suburbs,cape town",
    category: "Areas & Coverage"
  },
  {
    question: "How do I book a cleaning service",
    response: "Book online at scratchsolidsolutions.org, via WhatsApp at +27 69 673 5947, or email customerservice@scratchsolidsolutions.org.",
    keywords: "book,how to book,schedule,appointment,reserve,online,whatsapp",
    category: "Booking & Scheduling"
  },
  {
    question: "How does your real-time tracking work",
    response: "Our Transparency Policy gives you live visibility. Track your cleaner status: 'On the Way,' 'Arrived,' and 'Completed.' Each update is timestamped for full accountability.",
    keywords: "tracking,real time,transparency,live,status,on the way,arrived,completed",
    category: "Transparency & Tracking"
  },
  {
    question: "What is geolocation and how do you use it",
    response: "Geolocation uses GPS coordinates to show your cleaner location during the service window: when they are On the Way, when they Arrive, and when Completed.",
    keywords: "geolocation,gps,location,coordinates,where,how does geolocation work",
    category: "Transparency & Tracking"
  },
  {
    question: "What is geofencing and how does it work",
    response: "Geofencing is a virtual boundary around your property. When the cleaner enters it and marks 'Arrived,' the system auto-verifies they are physically there. This prevents false check-ins.",
    keywords: "geofence,geofencing,virtual boundary,auto arrival,automatic,check in,verify",
    category: "Transparency & Tracking"
  },
  {
    question: "Is the geolocation data secure",
    response: "Yes. Our tracking runs on Cloudflare secure infrastructure with end-to-end encryption. We are POPIA compliant. Only you and our management can see location data during your booking window.",
    keywords: "secure,privacy,poipa,safe,confidential,encryption,who can see,data protection",
    category: "Technology & Data"
  },
  {
    question: "How do I pay for the service",
    response: "Once the job is marked 'Completed,' your invoice is generated automatically. Pay via EFT or our secure online portal. Business clients receive monthly consolidated invoices.",
    keywords: "pay,payment,how to pay,EFT,bank transfer,online payment,invoice,billing",
    category: "Payments & Billing"
  },
  {
    question: "Is your staff trained and vetted",
    response: "Absolutely. Every team member is background-checked and trained in cleaning techniques, safety protocols, and customer service before being assigned to clients.",
    keywords: "trained,vetted,background check,qualifications,screening,staff quality,team",
    category: "Safety & Trust"
  },
  {
    question: "Are you insured",
    response: "Yes, we are fully insured with public liability coverage. In the unlikely event of damage, we have a clear claims process.",
    keywords: "insured,insurance,liability,covered,protection,damage,claim,accident",
    category: "Safety & Trust"
  },
  {
    question: "How can I contact you",
    response: "WhatsApp: +27 69 673 5947. Email: customerservice@scratchsolidsolutions.org. Website: scratchsolidsolutions.org. Social: @ScratchSolidSolutions.",
    keywords: "contact,phone,email,whatsapp,reach,message,call,social media",
    category: "General FAQ"
  }
];

/** Normalize and tokenize user input into a set of searchable keywords */
function tokenize(input: string): Set<string> {
  const cleaned = input
    .toLowerCase()
    .replace(/[?!.,;:'"()\[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = cleaned.split(' ').filter(w => w.length > 1 && !isStopWord(w));
  const tokens = new Set<string>(words);
  for (let i = 0; i < words.length - 1; i++) {
    tokens.add(`${words[i]} ${words[i + 1]}`);
  }
  return tokens;
}

/** Common stop words to ignore during scoring */
function isStopWord(word: string): boolean {
  const stops = new Set([
    'a','an','the','is','are','was','were','be','been','being',
    'have','has','had','do','does','did','will','would','could',
    'shall','should','may','might','must','can','need','dare',
    'ought','used','to','of','in','for','on','with','at','by',
    'from','as','into','through','during','before','after',
    'above','below','between','among','within','without','under',
    'and','but','or','yet','so','if','because','although',
    'though','while','where','when','that','which','who','whom',
    'whose','what','how','why','this','these','those','i','me',
    'my','myself','we','our','ours','you','your','yours','he',
    'him','his','she','her','hers','it','its','they','them',
    'their','theirs','am','got','get','tell','give','just','only',
    'also','even','still','already','yet','too','very','much',
    'many','more','most','some','any','all','each','every','both',
    'few','little','less','least','other','another','such','no',
    'nor','not','only','own','same','so','than','too','very'
  ]);
  return stops.has(word);
}

/** Score a single knowledge entry against user tokens */
function scoreEntry(
  userTokens: Set<string>,
  entryKeywords: string,
  entryQuestion: string
): number {
  let score = 0;
  const kwTokens = entryKeywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
  const qTokens = tokenize(entryQuestion);

  for (const kw of kwTokens) {
    const kwClean = kw.replace(/[?!.,;:'"()\[\]{}]/g, ' ').trim();
    for (const userToken of userTokens) {
      if (kwClean === userToken) {
        score += 3;
      } else if (kwClean.includes(userToken) || userToken.includes(kwClean)) {
        score += 1.5;
      }
    }
  }

  for (const qToken of qTokens) {
    for (const userToken of userTokens) {
      if (qToken === userToken) {
        score += 1;
      } else if (qToken.includes(userToken) || userToken.includes(qToken)) {
        score += 0.5;
      }
    }
  }

  return score;
}

/** Find the best matching response from the knowledge base */
function findBestMatch(
  input: string,
  entries: { question: string; response: string; keywords: string; category: string }[]
): { response: string; category: string; score: number } | null {
  const userTokens = tokenize(input);
  if (userTokens.size === 0) return null;

  let best: { response: string; category: string; score: number } | null = null;

  for (const entry of entries) {
    const score = scoreEntry(userTokens, entry.keywords, entry.question);
    if (score > 0 && (!best || score > best.score)) {
      best = { response: entry.response, category: entry.category, score };
    }
  }

  return best;
}

/** Load all responses from the database */
async function loadDbResponses(db: any) {
  try {
    const result = await db.prepare(
      `SELECT question, response, keywords, category FROM ai_responses WHERE response IS NOT NULL AND response != '' ORDER BY id`
    ).all();
    return (result.results || []).map((row: any) => ({
      question: row.question as string,
      response: row.response as string,
      keywords: (row.keywords as string) || '',
      category: (row.category as string) || 'General FAQ'
    }));
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  const traceId = withTracing(req);

  const rateLimitResult = await withRateLimit(req, rateLimits.standard);
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(
      NextResponse.json(
        { error: 'Too many chatbot requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString()
          }
        }
      ),
      traceId
    );
  }

  const body = await req.json() as { question?: string };
  const { question } = body;
  if (!question || typeof question !== "string") {
    const response = NextResponse.json({ error: "No question provided." }, { status: 400 });
    return withSecurityHeaders(response, traceId);
  }

  try {
    const db = await getDb();
    let kbEntries = fallbackKB;

    if (db) {
      const dbEntries = await loadDbResponses(db);
      if (dbEntries.length > 0) {
        kbEntries = dbEntries;
      }
    }

    const match = findBestMatch(question, kbEntries);

    if (match && match.score >= 2) {
      const response = NextResponse.json({
        answer: match.response,
        category: match.category,
        matched: true
      });
      return withSecurityHeaders(response, traceId);
    }

    const fallback =
      "I don't have a specific answer for that right now, but I'd love to help! Here are some topics I can assist with:\n\n" +
      "* Services & Pricing\n" +
      "* Booking & Scheduling\n" +
      "* Real-Time Tracking & Geolocation\n" +
      "* Transparency & Geofencing\n" +
      "* Safety, Insurance & Staff Vetting\n" +
      "* Payments & Billing\n" +
      "* Areas We Cover\n\n" +
      "Or contact us directly on WhatsApp at +27 69 673 5947 for immediate assistance.";

    const response = NextResponse.json({
      answer: fallback,
      category: "General FAQ",
      matched: false
    });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    const response = NextResponse.json({
      answer: "Sorry, I'm having trouble right now. Please contact us on WhatsApp at +27 69 673 5947.",
      category: "General FAQ",
      matched: false
    });
    return withSecurityHeaders(response, traceId);
  }
}
