import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const PROFILE_BUCKET = "caregiver-profile-photos";

function loadEnvLocal() {
  const envPath = path.join(projectRoot, ".env.local");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] ??= value;
  }
}

function parseArgs(argv) {
  const options = {
    manifest: path.join(projectRoot, "supabase", "caregiver-photo-manifest.json"),
    photosDir: path.join(projectRoot, "supabase", "caregiver-photos"),
    version: "v4",
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--manifest") {
      options.manifest = path.resolve(projectRoot, argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg === "--photos-dir") {
      options.photosDir = path.resolve(projectRoot, argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg === "--version") {
      options.version = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function readManifest(manifestPath) {
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  throw new Error(`Unsupported image type for ${filePath}`);
}

async function listAllUsers(supabase) {
  const users = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < perPage) break;
    page += 1;
  }

  return users;
}

async function main() {
  loadEnvLocal();
  const options = parseArgs(process.argv.slice(2));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local."
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const manifest = readManifest(options.manifest);
  const existingUsers = await listAllUsers(supabase);
  const usersByEmail = new Map(
    existingUsers
      .filter((user) => user.email)
      .map((user) => [user.email.toLowerCase(), user])
  );
  const usersByFullName = new Map(
    existingUsers
      .filter((user) => user.user_metadata?.full_name)
      .map((user) => [user.user_metadata.full_name, user])
  );

  const uploaded = [];
  for (const entry of manifest) {
    const user =
      usersByEmail.get(entry.email.toLowerCase()) ?? usersByFullName.get(entry.fullName);
    if (!user) {
      throw new Error(`No auth user found for ${entry.email} (${entry.fullName})`);
    }

    const absolutePhotoPath = path.resolve(options.photosDir, entry.file);
    if (!fs.existsSync(absolutePhotoPath)) {
      throw new Error(`Missing photo file: ${absolutePhotoPath}`);
    }

    const extension = path.extname(entry.file).replace(/^\./, "").toLowerCase();
    const uploadPath = `${user.id}/avatar_${options.version}.${extension}`;
    const contentType = getContentType(absolutePhotoPath);
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${PROFILE_BUCKET}/${uploadPath}`;

    uploaded.push({
      email: entry.email,
      fullName: entry.fullName,
      source: absolutePhotoPath,
      uploadPath,
      publicUrl,
      notes: entry.notes,
    });

    if (options.dryRun) continue;

    const fileBuffer = fs.readFileSync(absolutePhotoPath);
    const { error: uploadError } = await supabase.storage
      .from(PROFILE_BUCKET)
      .upload(uploadPath, fileBuffer, {
        upsert: true,
        contentType,
      });

    if (uploadError) throw uploadError;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ profile_photo_url: publicUrl })
      .eq("user_id", user.id);

    if (updateError) throw updateError;
  }

  console.log(
    JSON.stringify(
      {
        bucket: PROFILE_BUCKET,
        version: options.version,
        dryRun: options.dryRun,
        total: uploaded.length,
        uploaded,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
