// AI mockup generation for the Digital project-intake wizard.
//
// This is a storytelling/communication aid only — the generated HTML confirms
// the client's idea back to them visually. Staff always build the real project
// by hand from the structured brief; the mockup is never treated as a codebase
// seed. Uses Claude Haiku 4.5 (cheapest tier) since output quality bar here is
// "recognizable sketch", not production code.
import Anthropic from '@anthropic-ai/sdk';
import { getAnthropicApiKey } from './env';
import { PAGE_TYPE_LABELS, type PageType } from './digital-pricing';

const MODEL = 'claude-haiku-4-5';
const MAX_TOKENS = 8000;

// $1 / $5 per million input/output tokens -> cents per token.
const INPUT_COST_CENTS_PER_TOKEN = 100 / 1_000_000;
const OUTPUT_COST_CENTS_PER_TOKEN = 500 / 1_000_000;

const SYSTEM_PROMPT = `You are a rapid visual-prototyping assistant for Scratch Solid Digital.
A client has described an app or website idea. Produce a single self-contained HTML file — inline CSS only, no external stylesheets/fonts/scripts, no network requests — that visually sketches what they described: a representative homepage or key screen, using their brand colors if given.

This is a communication aid to confirm you understood their idea, NOT production code. Staff will build the real thing by hand afterward, so favor a clean, believable visual layout over technical completeness.

Output ONLY the raw HTML document. No markdown code fences, no commentary before or after.`;

export interface IntakeBrief {
  name: string;
  companyName?: string;
  whoTargetUsers?: string;
  whatDescription?: string;
  whyDescription?: string;
  whenTimeline?: string;
  whereContext?: string;
  howDescription?: string;
  backendInteractionDescription?: string;
  colorTheme?: string; // JSON string: {primary, secondary, accent}
}

function briefToPrompt(brief: IntakeBrief): string {
  let colors = '';
  if (brief.colorTheme) {
    try {
      const parsed = JSON.parse(brief.colorTheme);
      colors = `\nBrand colors — primary: ${parsed.primary || 'unspecified'}, secondary: ${parsed.secondary || 'unspecified'}, accent: ${parsed.accent || 'unspecified'}.`;
    } catch {
      // ignore malformed theme JSON — mockup falls back to its own palette
    }
  }
  return `Client / company name: ${brief.companyName || brief.name}
Who it's for: ${brief.whoTargetUsers || 'not specified'}
What it does: ${brief.whatDescription || 'not specified'}
Why it's needed: ${brief.whyDescription || 'not specified'}
Timeline: ${brief.whenTimeline || 'not specified'}
Platform / reach: ${brief.whereContext || 'not specified'}
How it should work day-to-day: ${brief.howDescription || 'not specified'}
Backend / interactions: ${brief.backendInteractionDescription || 'not specified'}${colors}

Generate the mockup HTML now.`;
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:html)?\s*([\s\S]*?)\s*```$/i);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

export interface MockupGenerationResult {
  html: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostCents: number;
}

/**
 * priorTurns: alternating [assistantHtml, userChangeRequest] pairs from earlier
 * iterations, oldest first — reconstructs the refinement conversation so Claude
 * can build on what it already generated rather than starting from scratch.
 */
export async function generateMockup(
  brief: IntakeBrief,
  priorTurns: { html: string; changeRequest: string }[],
  changeRequest?: string
): Promise<MockupGenerationResult> {
  const apiKey = await getAnthropicApiKey();
  const client = new Anthropic({ apiKey });

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: briefToPrompt(brief) },
  ];

  for (const turn of priorTurns) {
    messages.push({ role: 'assistant', content: turn.html });
    if (turn.changeRequest) {
      messages.push({ role: 'user', content: turn.changeRequest });
    }
  }

  if (changeRequest) {
    messages.push({ role: 'user', content: changeRequest });
  }

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages,
  });

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
  const html = stripCodeFences(textBlock?.text || '');

  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  const estimatedCostCents =
    inputTokens * INPUT_COST_CENTS_PER_TOKEN + outputTokens * OUTPUT_COST_CENTS_PER_TOKEN;

  return { html, inputTokens, outputTokens, estimatedCostCents };
}

const PAGE_LIST_SYSTEM_PROMPT = `You are scoping a website/app build for Scratch Solid Digital from a client's brief. Break their brief down into a concrete list of pages or systems this build needs, using ONLY these page types:

${(Object.keys(PAGE_TYPE_LABELS) as PageType[]).map((t) => `- ${t}: ${PAGE_TYPE_LABELS[t]}`).join('\n')}

Rules:
- Name each concrete page separately even if they share a type (e.g. Home, About, and Services are three separate "simple_page" entries, not one).
- "auth_system" and "ecommerce" and "booking" and "blog" are whole systems - list each at most once even if they involve multiple screens.
- Use "custom" ONLY for something that genuinely doesn't fit any other type (e.g. a bespoke calculator, a real-time dashboard, a custom admin portal) - don't default to it, and don't overuse it as a catch-all.
- Every real website needs at least a Home page - always include one simple_page for it unless the brief clearly describes something else as the entry point.
- Call submit_page_list with your result. Do not explain your reasoning in text.`;

export interface InferredPage {
  type: PageType;
  label: string;
}

export interface PageListInferenceResult {
  pages: InferredPage[];
  inputTokens: number;
  outputTokens: number;
  estimatedCostCents: number;
}

const PAGE_LIST_TOOL: Anthropic.Tool = {
  name: 'submit_page_list',
  description: 'Submit the inferred list of pages/systems this project needs, each with a concrete label and a page type from the fixed set.',
  input_schema: {
    type: 'object',
    properties: {
      pages: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: Object.keys(PAGE_TYPE_LABELS) },
            label: { type: 'string', description: 'A short, concrete name for this page, e.g. "Home", "About", "Book a session"' },
          },
          required: ['type', 'label'],
        },
      },
    },
    required: ['pages'],
  },
};

/**
 * Infers a structured page/feature list from the same brief used to
 * generate the mockup. This is what pricing is actually computed from
 * (see lib/digital-pricing.ts) - a separate, forced tool-call rather than
 * asking the mockup call to also emit JSON, so a malformed mockup
 * response can never corrupt the price the client sees.
 */
export async function inferPageList(brief: IntakeBrief): Promise<PageListInferenceResult> {
  const apiKey = await getAnthropicApiKey();
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: PAGE_LIST_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: briefToPrompt(brief) }],
    tools: [PAGE_LIST_TOOL],
    tool_choice: { type: 'tool', name: 'submit_page_list' },
  });

  const toolUseBlock = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
  const rawPages = (toolUseBlock?.input as { pages?: unknown } | undefined)?.pages;
  const validTypes = new Set(Object.keys(PAGE_TYPE_LABELS));

  const pages: InferredPage[] = Array.isArray(rawPages)
    ? rawPages
        .filter((p): p is { type: string; label: string } => !!p && typeof p.type === 'string' && typeof p.label === 'string' && validTypes.has(p.type))
        .map((p) => ({ type: p.type as PageType, label: p.label.trim().slice(0, 80) }))
    : [];

  // Guarantee at least a Home page - a broken/empty inference should never
  // leave the client with a zero-page, zero-price build.
  if (pages.length === 0) {
    pages.push({ type: 'simple_page', label: 'Home' });
  }

  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  const estimatedCostCents = inputTokens * INPUT_COST_CENTS_PER_TOKEN + outputTokens * OUTPUT_COST_CENTS_PER_TOKEN;

  return { pages, inputTokens, outputTokens, estimatedCostCents };
}
