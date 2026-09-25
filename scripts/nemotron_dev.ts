import { askGemini } from "../src/lib/aiClient";
import * as fs from "fs";
import * as path from "path";

const DEV_SYSTEM_PROMPT = `You are a Gemini AI acting as an elite Full-Stack Staff Software Engineer and Architect.
Specialties:
- Next.js (App Router, Server Actions, Server Components)
- TypeScript (Strict, Robust Typing)
- Tailwind CSS & Vanilla CSS (Polished, Premium Design)
- SQLite / PostgreSQL with Prisma ORM
- High-performance, clean, modular enterprise ERP architectures

Provide clear, precise, production-grade code without placeholders or shortcuts.`;

export async function askGeminiDev(
  prompt: string,
  contextFiles: string[] = []
): Promise<string> {
  let fileContext = "";
  for (const filePath of contextFiles) {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      fileContext += `\n--- FILE: ${filePath} ---\n${content}\n`;
    }
  }

  const fullPrompt = `${fileContext}\n\nTask:\n${prompt}`;
  return await askGemini(fullPrompt, {
    systemPrompt: DEV_SYSTEM_PROMPT,
  });
}

// CLI runner if executed directly
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const query = process.argv.slice(2).join(" ");
  if (!query) {
    console.log("Usage: npx tsx --env-file=.env scripts/nemotron_dev.ts \"<task prompt>\"");
    process.exit(0);
  }

  askGeminiDev(query)
    .then((res) => {
      console.log("\n=== Gemini Dev Output ===\n");
      console.log(res);
    })
    .catch((err) => {
      console.error("Gemini Dev Error:", err);
      process.exit(1);
    });
}
