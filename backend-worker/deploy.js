#!/usr/bin/env node

/**
 * Production Deployment Script
 * Handles D1 setup and Workers deployment
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

console.log('🚀 Starting Cloudflare Production Deployment for Scratch Solid Solutions');

// Read environment variables
try {
  const envContent = readFileSync('.env', 'utf8');
  console.log('📋 Environment variables loaded');
} catch (error) {
  console.log('⚠️  No .env file found, using defaults');
}

const steps = [
  {
    name: 'Create D1 Database',
    command: 'wrangler d1 create scratchsolid-db',
    skip: process.env.SKIP_D1 === 'true'
  },
  {
    name: 'Execute D1 Schema',
    command: 'wrangler d1 execute scratchsolid-db --file=../database/d1-schema.sql',
    skip: process.env.SKIP_D1 === 'true'
  },
  {
    name: 'Deploy Cloudflare Worker',
    command: 'wrangler deploy --env production',
    skip: false
  }
];

for (const step of steps) {
  if (step.skip) {
    console.log(`⏭️  Skipping: ${step.name}`);
    continue;
  }
  
  try {
    console.log(`🔄 Executing: ${step.name}...`);
    execSync(step.command, { stdio: 'inherit', cwd: __dirname });
    console.log(`✅ Completed: ${step.name}`);
  } catch (error) {
    console.error(`❌ Failed: ${step.name}`);
    console.error('Error:', error.message);
    
    if (step.name.includes('D1')) {
      console.log('');
      console.log('💡 D1 Setup Tips:');
      console.log('1. Ensure you are authenticated: npx wrangler auth login');
      console.log('2. Check if database already exists: wrangler d1 list');
      console.log('3. If exists, set SKIP_D1=true and retry');
    }
    
    process.exit(1);
  }
}

console.log('');
console.log('🎉 Backend deployment complete!');
console.log('');
console.log('📋 Next Steps:');
console.log('1. Set production secrets in Cloudflare dashboard:');
console.log('   - JWT_SECRET (strong random string)');
console.log('   - ZOHO_ORG_ID (if using Zoho)');
console.log('   - ZOHO_BOOKS_API_KEY (if using Zoho)');
console.log('');
console.log('2. Deploy marketing site to Cloudflare Pages');
console.log('3. Update frontend API URLs to point to Workers endpoint');
console.log('');
console.log('🌐 Your API will be available at:');
console.log('   https://cleaning-service-backend-prod.your-subdomain.workers.dev');
