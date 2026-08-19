const { execSync } = require('child_process');

const envs = {
  DATABASE_URL: "postgresql://postgres.qhcdojiqfyvawirywwuf:itsMAZIK%2A22@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10&pool_timeout=15",
  DIRECT_URL: "postgresql://postgres.qhcdojiqfyvawirywwuf:itsMAZIK%2A22@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres",
};

for (const [key, value] of Object.entries(envs)) {
  try {
    console.log(`Adding ${key}...`);
    // Delete existing to avoid conflicts
    try {
      execSync(`npx vercel env rm ${key} production -y`);
    } catch (e) {}
    
    // Add new
    execSync(`npx vercel env add ${key} production`, {
      input: value,
      stdio: ['pipe', 'inherit', 'inherit']
    });
  } catch (error) {
    console.error(`Failed to add ${key}`);
  }
}

console.log("Done adding env variables!");
