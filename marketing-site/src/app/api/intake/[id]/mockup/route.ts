export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { sanitizeText } from '@/lib/sanitization';
import { withRateLimit, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { getDb, getIntakeRequest, getIntakeIterations, addMockupIteration, updateIntakeStatus, updateIntakeRequest } from '@/lib/db';
import { generateMockup, inferPageList, type IntakeBrief } from '@/lib/intake-ai';
import { computeDigitalPriceBreakdown } from '@/lib/digital-pricing';

// Hard server-side cap — this is what actually bounds cost, not the client's
// own iteration counter. See project_scratchsolid intake plan: at ~$0.03-0.05
// per Haiku generation, 8 rounds keeps a single intake well under $0.50.
const MAX_ITERATIONS = 8;

// POST /api/intake/[id]/mockup — public, guest-submittable. First call (no
// change_request) generates from the full brief; later calls refine the
// existing mockup with a change_request, replaying the prior rounds as
// conversation history so Claude builds on what it already produced.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);

  // Tighter than the standard guest-write limit — this is the route that
  // spends real Anthropic API cost per call.
  const rateLimitResult = await withRateLimit(request, { windowMs: 3600000, maxRequests: 20 });
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(
      NextResponse.json({ error: 'Too many mockup requests. Please try again later.' }, { status: 429 }),
      traceId
    );
  }

  try {
    const db = await getDb();
    if (!db) {
      return withSecurityHeaders(NextResponse.json({ error: 'Database not available' }, { status: 500 }), traceId);
    }

    const { id } = await params;
    const intakeId = Number(id);
    const intake = await getIntakeRequest(db, intakeId) as Record<string, any> | null;
    if (!intake) {
      return withSecurityHeaders(NextResponse.json({ error: 'Intake request not found' }, { status: 404 }), traceId);
    }
    if (intake.status === 'converted' || intake.status === 'abandoned') {
      return withSecurityHeaders(NextResponse.json({ error: 'This request can no longer generate mockups' }, { status: 400 }), traceId);
    }

    const iterations = await getIntakeIterations(db, intakeId) as Record<string, any>[];
    if (iterations.length >= MAX_ITERATIONS) {
      return withSecurityHeaders(
        NextResponse.json({ error: `You've reached the ${MAX_ITERATIONS}-round limit for mockup refinements on this request. A member of our team will follow up directly.` }, { status: 400 }),
        traceId
      );
    }

    const body = await request.json().catch(() => ({})) as { change_request?: string };
    const changeRequest = body.change_request ? sanitizeText(body.change_request) : undefined;
    if (iterations.length > 0 && !changeRequest) {
      return withSecurityHeaders(NextResponse.json({ error: 'change_request is required to refine an existing mockup' }, { status: 400 }), traceId);
    }

    const brief: IntakeBrief = {
      name: intake.name,
      companyName: intake.company_name,
      whoTargetUsers: intake.who_target_users,
      whatDescription: intake.what_description,
      whyDescription: intake.why_description,
      whenTimeline: intake.when_timeline,
      whereContext: intake.where_context,
      howDescription: intake.how_description,
      backendInteractionDescription: intake.backend_interaction_description,
      colorTheme: intake.color_theme,
    };

    const priorTurns = iterations.map((iter, idx) => ({
      html: iter.generated_html as string,
      changeRequest: idx + 1 < iterations.length ? (iterations[idx + 1].prompt_text as string) : '',
    }));

    await updateIntakeStatus(db, intakeId, 'generating');

    let result;
    try {
      result = await generateMockup(brief, priorTurns, iterations.length > 0 ? changeRequest : undefined);
    } catch (genError) {
      // Revert to the last stable status so the client can retry.
      await updateIntakeStatus(db, intakeId, iterations.length > 0 ? 'awaiting_confirmation' : 'draft');
      throw genError;
    }

    const iterationNumber = iterations.length + 1;
    await addMockupIteration(db, {
      intake_id: intakeId,
      iteration_number: iterationNumber,
      prompt_text: iterations.length > 0 ? (changeRequest as string) : '',
      generated_html: result.html,
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
      estimated_cost_cents: result.estimatedCostCents,
    });
    await updateIntakeStatus(db, intakeId, 'awaiting_confirmation');

    // Page list only needs inferring once, from the brief itself - it
    // doesn't change across visual refinement rounds, only the mockup's
    // look does. Best-effort: a failure here shouldn't block the mockup
    // the client is actually waiting on.
    let pricing = null;
    if (iterations.length === 0) {
      try {
        const inference = await inferPageList(brief);
        pricing = await computeDigitalPriceBreakdown(db, {
          pageList: inference.pages,
          supportTier: intake.support_tier,
        });
        await updateIntakeRequest(db, intakeId, {
          page_list: JSON.stringify(inference.pages),
          base_fee: pricing.baseFee,
          pages_subtotal: pricing.pagesSubtotal,
          has_custom_items: pricing.hasCustomItems ? 1 : 0,
          total_price: pricing.totalPrice,
          deposit_amount: pricing.depositAmount,
          final_amount: pricing.finalAmount,
        });
      } catch (pricingError) {
        logger.error('Failed to infer page list / compute pricing for intake', pricingError as Error);
      }
    } else {
      // Refinement round - return whatever pricing was already computed on
      // the first round rather than nothing, so the client's price panel
      // doesn't blank out on a change request.
      const refreshed = await getIntakeRequest(db, intakeId) as Record<string, any> | null;
      if (refreshed?.page_list) {
        pricing = await computeDigitalPriceBreakdown(db, {
          pageList: JSON.parse(refreshed.page_list),
          promoCode: refreshed.promo_code,
          supportTier: refreshed.support_tier,
        });
      }
    }

    const response = NextResponse.json({
      html: result.html,
      iteration_number: iterationNumber,
      iterations_used: iterationNumber,
      iterations_remaining: MAX_ITERATIONS - iterationNumber,
      pricing,
    }, { status: 201 });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error generating intake mockup', error as Error);
    const response = NextResponse.json({ error: `Failed to generate mockup: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
