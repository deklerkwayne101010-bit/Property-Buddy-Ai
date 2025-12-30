// Vercel Environment Variables Setup Script
// Run this script to configure environment variables in Vercel
// Usage: node vercel-env-setup.js

const { execSync } = require('child_process');

const envVars = [
  {
    key: 'HF_API_TOKEN',
    value: process.env.HF_API_TOKEN || 'your_hugging_face_token_here',
    type: 'encrypted'
  },
  {
    key: 'REPLICATE_API_TOKEN',
    value: process.env.REPLICATE_API_TOKEN || 'your_replicate_token_here',
    type: 'encrypted'
  },
  {
    key: 'NEXT_PUBLIC_SUPABASE_URL',
    value: process.env.NEXT_PUBLIC_SUPABASE_URL || 'your_supabase_url_here',
    type: 'plain'
  },
  {
    key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your_supabase_anon_key_here',
    type: 'plain'
  },
  {
    key: 'SUPABASE_SERVICE_ROLE_KEY',
    value: process.env.SUPABASE_SERVICE_ROLE_KEY || 'your_supabase_service_role_key_here',
    type: 'encrypted'
  }
];

console.log('Setting up Vercel environment variables...');
console.log('Make sure you have Vercel CLI installed and are logged in.');
console.log('Run: npm install -g vercel && vercel login');
console.log('');

envVars.forEach(({ key, value, type }) => {
  try {
    const command = `vercel env add ${key} ${type === 'encrypted' ? '--sensitive' : ''}`;
    console.log(`Setting ${key}...`);
    console.log(`Command: ${command}`);
    console.log(`Value: ${value}`);
    console.log('');
  } catch (error) {
    console.error(`Failed to set ${key}:`, error.message);
  }
});

console.log('After running the above commands, deploy with: vercel --prod');