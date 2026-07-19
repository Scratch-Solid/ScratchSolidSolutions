export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';
import { withAdminOrServiceAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { getCloudflareContext } from '@/lib/runtime-context';
import {
  getIntakeRequest,
  getIntakeIterations,
  getUserByEmail,
  createProject,
  addProjectFile,
  addProjectUpdate,
  markIntakeConverted,
} from '@/lib/db';

const PUBLIC_BASE = (process.env.R2_PUBLIC_BASE || 'https://uploads.scratchsolidsolutions.org').replace(/\/$/, '');

const SUPPORT_TIER_LABELS: Record<string, string> = {
  warranty: 'Warranty only (30 days, included)',
  standard: 'Standard support (3-month minimum)',
  growth: 'Growth support (6-month minimum)',
  partner: 'Partner retainer (12-month, or month-to-month after)',
};

function buildBriefMessage(intake: Record<string, any>): string {
  const tier = SUPPORT_TIER_LABELS[intake.support_tier] || intake.support_tier;
  return [
    `Digital intake brief for ${intake.company_name || intake.name} (${intake.email})`,
    '',
    `Who: ${intake.who_target_users || 'n/a'}`,
    `What: ${intake.what_description || 'n/a'}`,
    `Why: ${intake.why_description || 'n/a'}`,
    `When: ${intake.when_timeline || 'n/a'}`,
    `Where: ${intake.where_context || 'n/a'}`,
    `How: ${intake.how_description || 'n/a'}`,
    '',
    `Backend & interactions: ${intake.backend_interaction_description || 'n/a'}`,
    '',
    `Support & pricing selected: ${tier} — R${intake.support_monthly_rate}/month.`,
  ].join('\n');
}

// POST /api/intake/[id]/convert — staff-only. Creates the real `projects` row
// (same createProject path as POST /api/projects) seeded from the confirmed
// intake, attaches the confirmed mockup as a reference file and the full
// brief as the first project update. The mockup is reference-only — staff
// still build the entire project by hand from the brief.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);
  const auth = await withAdminOrServiceAuth(request);
  if (auth instanceof NextResponse) return withSecurityHeaders(auth, traceId);
  const { db } = auth;

  try {
    const { id } = await params;
    const intakeId = Number(id);
    const intake = await getIntakeRequest(db, intakeId) as Record<string, any> | null;
    if (!intake) {
      return withSecurityHeaders(NextResponse.json({ error: 'Intake request not found' }, { status: 404 }), traceId);
    }
    if (intake.status === 'converted') {
      return withSecurityHeaders(NextResponse.json({ error: 'This request has already been converted', converted_project_id: intake.converted_project_id }, { status: 400 }), traceId);
    }
    if (intake.status !== 'confirmed') {
      return withSecurityHeaders(NextResponse.json({ error: 'Only a client-confirmed request can be converted. Ask them to confirm a mockup first.' }, { status: 400 }), traceId);
    }

    const client = await getUserByEmail(db, intake.email);
    if (!client) {
      return withSecurityHeaders(
        NextResponse.json({ error: `No account found for ${intake.email}. Ask the client to sign up, then convert this request again.` }, { status: 404 }),
        traceId
      );
    }

    const project = await createProject(db, {
      client_id: (client as any).id,
      name: intake.company_name ? `${intake.company_name} — Digital project` : `${intake.name}'s project`,
      description: intake.what_description || '',
      status: 'active',
    }) as Record<string, any>;

    // Attach the confirmed mockup as a reference file (never a build starting point).
    const iterations = await getIntakeIterations(db, intakeId) as Record<string, any>[];
    const latestMockup = iterations[iterations.length - 1];
    if (latestMockup?.generated_html) {
      try {
        const { env } = await getCloudflareContext({ async: true }) as unknown as { env: any };
        const bucket = env?.UPLOADS_BUCKET;
        if (bucket) {
          const key = `project-mockups/${uuidv4()}-intake-${intakeId}-mockup.html`;
          await bucket.put(key, latestMockup.generated_html, { httpMetadata: { contentType: 'text/html' } });
          await addProjectFile(db, {
            project_id: project.id,
            file_name: `${intake.company_name || intake.name} — confirmed AI mockup (reference only).html`,
            file_url: `${PUBLIC_BASE}/${key}`,
            file_type: 'text/html',
          });
        } else {
          logger.error('UPLOADS_BUCKET binding not found while attaching intake mockup — skipping file attach');
        }
      } catch (uploadError) {
        // Non-fatal — the project itself is still created; staff can still see
        // the mockup via the intake record if this upload step fails.
        logger.error('Failed to store confirmed mockup as a project file', uploadError as Error);
      }
    }

    await addProjectUpdate(db, {
      project_id: project.id,
      message: buildBriefMessage(intake),
    });

    await markIntakeConverted(db, intakeId, project.id);

    return withSecurityHeaders(NextResponse.json({ project, converted: true }, { status: 201 }), traceId);
  } catch (error) {
    logger.error('Error converting intake request to project', error as Error);
    const response = NextResponse.json({ error: `Failed to convert request: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
