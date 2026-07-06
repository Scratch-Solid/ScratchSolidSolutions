const https = require('https');
const fs = require('fs');
const path = require('path');

const N8N_URL = 'https://n8n.scratchsolidsolutions.org';
const EMAIL = 'it@scratchsolidsolutions.org';
const PASSWORD = 'JinR-236#@09)';
const PORTAL_WEBHOOK_SECRET = '1413dd0fd4bff83c47ef17a3d7fa24a18c15aef6b20bd7f7e90b7de0b1baac0d';
const WORKFLOW_FILE = path.resolve(__dirname, '../n8n-workflows/create-shift.json');

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

    const request = https.request(opts, (res) => {
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
    request.on('error', reject);
    if (body) request.write(typeof body === 'string' ? body : JSON.stringify(body));
    request.end();
  });
}

async function login() {
  console.log('[1/4] Logging into n8n...');
  const res = await req('POST', '/rest/login', { email: EMAIL, password: PASSWORD });
  if (res.status !== 200) {
    console.error('Login failed:', res.status, res.body);
    throw new Error('n8n login failed');
  }
  const setCookie = res.headers['set-cookie'];
  if (!setCookie) throw new Error('No session cookie');
  const sessionCookie = Array.isArray(setCookie)
    ? setCookie.find(c => c.includes('n8n-auth'))
    : setCookie;
  if (!sessionCookie) throw new Error('Missing auth cookie');
  const cookieValue = sessionCookie.split(';')[0];
  console.log('   -> Logged in successfully');
  return cookieValue;
}

async function getCredentials(cookie) {
  console.log('[2/4] Checking credentials...');
  const res = await req('GET', '/rest/credentials', null, { Cookie: cookie });
  const creds = res.body?.data || [];
  const portalCred = creds.find(c => c.name === 'Portal Webhook Secret');
  if (portalCred) {
    console.log('   -> Portal Webhook Secret already exists:', portalCred.id);
    return portalCred.id;
  }

  console.log('   -> Creating Portal Webhook Secret credential...');
  const createRes = await req('POST', '/rest/credentials', {
    name: 'Portal Webhook Secret',
    type: 'httpHeaderAuth',
    data: { name: 'Authorization', value: `Bearer ${PORTAL_WEBHOOK_SECRET}` },
  }, { Cookie: cookie });

  if (createRes.status === 200 || createRes.status === 201) {
    const id = createRes.body.id || createRes.body.data?.id;
    console.log('   -> Created:', id);
    return id;
  }
  console.warn('   -> Create returned:', createRes.status, createRes.body);
  return null;
}

async function importWorkflow(cookie) {
  console.log('[3/4] Importing create-shift workflow...');
  const raw = fs.readFileSync(WORKFLOW_FILE, 'utf-8');
  const workflow = JSON.parse(raw);

  const payload = {
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: workflow.settings || { executionOrder: 'v1' },
    tags: workflow.tags || [],
    staticData: workflow.staticData || null,
    active: false,
  };

  const res = await req('POST', '/rest/workflows', payload, { Cookie: cookie });
  if (res.status === 200 || res.status === 201) {
    const id = res.body.id || res.body.data?.id;
    console.log('   -> Imported (ID:', id, ')');
    return id;
  }
  if (res.body?.message?.includes?.('already exists') || res.body?.message?.includes?.('name')) {
    console.log('   -> Might already exist, fetching list...');
    const list = await req('GET', '/rest/workflows', null, { Cookie: cookie });
    const existing = list.body?.data?.find(w => w.name === workflow.name);
    if (existing) {
      console.log('   -> Found existing:', existing.id);
      return existing.id;
    }
  }
  console.error('   -> Failed:', res.status, res.body);
  return null;
}

async function activateWorkflow(cookie, workflowId) {
  console.log('[4/4] Activating workflow...');
  const res = await req('PATCH', `/rest/workflows/${workflowId}`, { active: true }, { Cookie: cookie });
  if (res.status === 200) {
    console.log('   -> Activated successfully');
    return true;
  }
  console.warn('   -> Activation returned:', res.status, res.body);
  return false;
}

async function main() {
  try {
    const cookie = await login();
    await getCredentials(cookie);
    const workflowId = await importWorkflow(cookie);
    if (workflowId) {
      await activateWorkflow(cookie, workflowId);
    } else {
      console.error('Could not get workflow ID, skipping activation');
      process.exit(1);
    }
    console.log('\nDone!');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
