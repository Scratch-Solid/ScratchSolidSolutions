#!/usr/bin/env node
/**
 * n8n Setup Automation Script
 * Imports workflows, creates credentials, and activates everything.
 *
 * Prerequisites:
 * 1. n8n owner account created (you have credentials)
 * 2. Node.js 18+ installed
 *
 * Usage:
 *   node n8n-setup.js
 *
 * It will:
 *   - Log into n8n and get a session
 *   - Create the "Portal Webhook Secret" credential
 *   - Import all 6 workflows from ../n8n-workflows/
 *   - Activate them
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const N8N_URL = 'https://n8n.scratchsolidsolutions.org';
const WORKFLOWS_DIR = path.resolve(__dirname, '../n8n-workflows');

// Default generated secret (change if you already set one in wrangler)
const PORTAL_WEBHOOK_SECRET = '1413dd0fd4bff83c47ef17a3d7fa24a18c15aef6b20bd7f7e90b7de0b1baac0d';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function ask(q) { return new Promise(r => rl.question(q, r)); }

function req(method, urlPath, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, N8N_URL);
    const opts = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...headers,
      },
    };

    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function login(email, password) {
  console.log('[1/5] Logging into n8n...');
  const res = await req('POST', '/rest/login', { email, password });
  if (res.status !== 200) {
    console.error('Login failed:', res.status, res.body);
    throw new Error('n8n login failed');
  }
  // Extract session cookie
  const setCookie = res.headers['set-cookie'];
  if (!setCookie) {
    console.error('No session cookie returned');
    throw new Error('No session cookie');
  }
  const sessionCookie = Array.isArray(setCookie)
    ? setCookie.find(c => c.includes('n8n-auth'))
    : setCookie;
  if (!sessionCookie) {
    console.error('No n8n-auth cookie found');
    throw new Error('Missing auth cookie');
  }
  const cookieValue = sessionCookie.split(';')[0];
  console.log('   -> Logged in successfully');
  return cookieValue;
}

async function createCredential(cookie, name, type, data) {
  console.log(`[2/5] Creating credential: ${name}...`);
  const payload = {
    name,
    type,
    data,
  };
  const res = await req('POST', '/rest/credentials', payload, { Cookie: cookie });
  if (res.status === 200 || res.status === 201) {
    console.log(`   -> Created: ${res.body.id || res.body.data?.id || 'OK'}`);
    return res.body;
  }
  // If it already exists, n8n might return a different response
  if (res.body?.message?.includes('already exists')) {
    console.log('   -> Already exists, fetching existing...');
    const list = await req('GET', '/rest/credentials', null, { Cookie: cookie });
    const existing = list.body?.data?.find(c => c.name === name);
    if (existing) return existing;
  }
  console.warn('   -> Credential create returned:', res.status, res.body);
  return null;
}

async function importWorkflow(cookie, filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const workflow = JSON.parse(raw);
  const name = workflow.name || path.basename(filePath, '.json');
  console.log(`[3/5] Importing workflow: ${name}...`);

  // n8n expects workflow data wrapped in a specific structure for import
  const payload = {
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: workflow.settings || { executionOrder: 'v1' },
    tags: workflow.tags || [],
    staticData: workflow.staticData || null,
  };

  const res = await req('POST', '/rest/workflows', payload, { Cookie: cookie });
  if (res.status === 200 || res.status === 201) {
    console.log(`   -> Imported: ${name} (ID: ${res.body.id || res.body.data?.id})`);
    return res.body;
  }
  console.error(`   -> Failed to import ${name}:`, res.status, res.body);
  return null;
}

async function activateWorkflow(cookie, workflowId) {
  console.log(`[4/5] Activating workflow ${workflowId}...`);
  const res = await req('PATCH', `/rest/workflows/${workflowId}`, { active: true }, { Cookie: cookie });
  if (res.status === 200) {
    console.log('   -> Activated');
    return true;
  }
  console.warn('   -> Activation returned:', res.status, res.body);
  return false;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  n8n Setup Automation for ScratchSolidSolutions');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const email = await ask('n8n email [it@scratchsolidsolutions.org]: ');
  const n8nEmail = email.trim() || 'it@scratchsolidsolutions.org';
  const password = await ask('n8n password: ');
  if (!password.trim()) {
    console.error('Password is required');
    process.exit(1);
  }

  const secretInput = await ask(`Portal Webhook Secret [${PORTAL_WEBHOOK_SECRET}]: `);
  const portalSecret = secretInput.trim() || PORTAL_WEBHOOK_SECRET;

  console.log('\n');

  try {
    const cookie = await login(n8nEmail, password.trim());

    // Create credentials
    await createCredential(cookie, 'Portal Webhook Secret', 'httpHeaderAuth', {
      name: 'Authorization',
      value: `Bearer ${portalSecret}`,
    });

    // Note: Cal.com API credential should be created manually in n8n UI
    // because it requires the Cal.com API key which the user said they have
    console.log('[!] Skipping Cal.com API credential — create it manually in n8n:');
    console.log('    Settings -> Credentials -> New -> "Cal.com API" -> paste your API key');

    // Import workflows
    const workflowFiles = [
      'calcom-booking-ingestion.json',
      'zoho-create-invoice.json',
      'create-shift.json',
      'send-whatsapp.json',
      'zoho-payment-webhook.json',
      'data-retention-cleanup.json',
    ];

    const importedIds = [];
    for (const wfFile of workflowFiles) {
      const filePath = path.join(WORKFLOWS_DIR, wfFile);
      if (!fs.existsSync(filePath)) {
        console.warn(`   -> File not found: ${filePath}`);
        continue;
      }
      const result = await importWorkflow(cookie, filePath);
      if (result?.id || result?.data?.id) {
        importedIds.push(result.id || result.data.id);
      }
    }

    // Activate workflows
    for (const id of importedIds) {
      await activateWorkflow(cookie, id);
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Setup Complete');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\nNext steps:');
    console.log('1. Set INTERNAL_PORTAL_N8N_WEBHOOK_SECRET in Cloudflare:');
    console.log(`   npx wrangler secret put INTERNAL_PORTAL_N8N_WEBHOOK_SECRET`);
    console.log(`   Value: ${portalSecret}`);
    console.log('2. Redeploy the portal worker');
    console.log('3. In Cal.com admin, add webhook URL from the booking-ingestion workflow');
    console.log('4. Create the "Cal.com API" credential in n8n manually');
    console.log('5. Create Zoho Books, WhatsApp, and Email credentials as needed');

  } catch (err) {
    console.error('\nSetup failed:', err.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
