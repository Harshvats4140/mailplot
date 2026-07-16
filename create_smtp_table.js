const { Client } = require('pg');

const dbUser = process.env.SUPABASE_DB_USER;
const dbPassword = process.env.SUPABASE_DB_PASSWORD;

if (!dbUser || !dbPassword) {
  console.error('Set SUPABASE_DB_USER and SUPABASE_DB_PASSWORD before running this script.');
  process.exit(1);
}

const regions = [
  'ap-south-1',
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
    console.log(`Connected to ${region}:${port}`);
    console.log('Creating table public.smtp_settings...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.smtp_settings (
        user_id TEXT PRIMARY KEY,
        smtp_host TEXT,
        smtp_port INTEGER,
        smtp_secure TEXT,
        smtp_from_name TEXT,
        smtp_from_email TEXT,
        smtp_user TEXT,
        smtp_pass TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
    `);
    console.log('Enabling Row Level Security...');
    await client.query(`ALTER TABLE public.smtp_settings ENABLE ROW LEVEL SECURITY;`);
    console.log('Table created successfully!');
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
  console.log('Scanning pooler regions...');
  for (const region of regions) {
    for (const port of [6543, 5432]) {
      const success = await tryConnect(region, port);
      if (success) {
        console.log('Script execution finished successfully.');
        return;
      }
    }
  }
  console.log('Could not connect to any pooler region.');
}

main();
