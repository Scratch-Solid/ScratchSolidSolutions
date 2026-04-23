#!/usr/bin/env node

/**
 * D1 Database Setup Script
 * Run this to create and populate the D1 database
 */

import { execSync } from 'child_process';

console.log('🚀 Setting up Cloudflare D1 database for Scratch Solid Solutions...');

try {
  // Create D1 database
  console.log('📦 Creating D1 database...');
  execSync('wrangler d1 create scratchsolid-db', { stdio: 'inherit' });
  
  // Execute schema
  console.log('🗃️ Creating database schema...');
  execSync('wrangler d1 execute scratchsolid-db --file=../database/d1-schema.sql', { stdio: 'inherit' });
  
  // Create some initial data
  console.log('🌱 Seeding initial data...');
  execSync('wrangler d1 execute scratchsolid-db --command="INSERT INTO templates (name, content, created_at) VALUES (\'Default Contract Template\', \'This is a default contract template for cleaning services.\', datetime(\'now\'))"', { stdio: 'inherit' });
  
  console.log('✅ D1 database setup complete!');
  console.log('');
  console.log('📋 Next steps:');
  console.log('1. Deploy the backend: cd backend-worker && npm run deploy');
  console.log('2. Set environment variables in Cloudflare dashboard');
  console.log('3. Deploy marketing site to Cloudflare Pages');
  
} catch (error) {
  console.error('❌ Setup failed:', error.message);
  console.log('');
  console.log('💡 Make sure you are authenticated with Cloudflare:');
  console.log('   npx wrangler auth login');
  process.exit(1);
}
