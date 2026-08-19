const { execSync } = require('child_process');

const envs = {
  GEMINI_API_KEY: "00000000000000000000000000000000000000000000000000000",
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
