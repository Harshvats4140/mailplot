process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');

const dbUser = process.env.SUPABASE_DB_USER;
const dbPassword = process.env.SUPABASE_DB_PASSWORD;

if (!dbUser || !dbPassword) {
  console.error('Set SUPABASE_DB_USER and SUPABASE_DB_PASSWORD before running this script.');
  process.exit(1);
}

const regions = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'ca-central-1',
  'sa-east-1',
  'eu-central-1',
  'eu-central-2',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-north-1',
  'ap-south-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ap-northeast-2'
];

async function tryConnect(region, port) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  const connectionString = `postgresql://${encodeURIComponent(dbUser)}:${encodeURIComponent(dbPassword)}@${host}:${port}/postgres`;
  
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    console.log(`CONNECTED SUCCESSFULLY TO ${region}:${port}!`);
    console.log('Running ALTER TABLE command...');
    await client.query('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;');
    console.log('Successfully added is_deleted column!');
    await client.end();
    return true;
  } catch (err) {
    if (!err.message.includes('tenant/user') && !err.message.includes('ENOTFOUND')) {
      console.log(`Region ${region}:${port} - Error: ${err.message}`);
    }
    try { await client.end(); } catch (e) {}
    return false;
  }
}

async function main() {
  console.log('Scanning all Supabase regions for pooler...');
  for (const region of regions) {
    for (const port of [6543, 5432]) {
      const success = await tryConnect(region, port);
      if (success) {
        console.log('Completed alteration successfully!');
        return;
      }
    }
  }
  console.log('Scan finished. No region succeeded.');
}

main();
