import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const sourcesPath = path.join(projectRoot, "supabase", "caregiver-photo-sources.json");
const outputDir = path.join(projectRoot, "supabase", "caregiver-photos");

async function main() {
  const sources = JSON.parse(fs.readFileSync(sourcesPath, "utf8"));
  fs.mkdirSync(outputDir, { recursive: true });

  for (const source of sources) {
    const response = await fetch(source.sourceUrl);
    if (!response.ok) {
      throw new Error(`Failed to download ${source.file}: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(path.join(outputDir, source.file), Buffer.from(arrayBuffer));
    console.log(`Saved ${source.file}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
