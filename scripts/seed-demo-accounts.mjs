import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

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

loadEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const demoPassword = process.env.DEMO_SEED_PASSWORD ?? "SilverDemo2026!";

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const familyAccount = {
  email: "sd-demo-family@example.com",
  fullName: "Demo Family User",
  phone: "+65 8123 4567",
  location: "Bedok",
};

const caregivers = [
  {
    email: "sd-demo-caregiver01@example.com",
    fullName: "Aisha Rahman",
    location: "Tampines, Bedok, Pasir Ris",
    hourlyRate: 28,
    yearsExperience: 4,
    credentials: "HCA-trained caregiver with dementia-care workshops",
    availability: "Weekdays, 8am to 6pm",
    responseTime: "Usually replies within 1 hour",
    minimumShiftHours: 3,
    languages: ["English", "Malay"],
    specialties: [
      "Elder-Sitting / Respite Care",
      "Feeding Assistance",
      "Walking or Moving Around Assistance",
    ],
    bio: "Patient and steady caregiver focused on daily routines, meal support, companionship, and light personal care. Experienced with families who need calm daytime supervision.",
  },
  {
    email: "sd-demo-caregiver02@example.com",
    fullName: "Mei Lin Tan",
    location: "Ang Mo Kio, Bishan, Toa Payoh",
    hourlyRate: 32,
    yearsExperience: 8,
    credentials: "Former senior care assistant, first aid certified",
    availability: "Weekdays and Saturday mornings",
    responseTime: "Usually replies within 30 minutes",
    minimumShiftHours: 4,
    languages: ["English", "Mandarin", "Hokkien"],
    specialties: [
      "Transfer Assistance (Bed to Chair and Vice Versa)",
      "Washing / Bathing Assistance",
      "Diaper Change Assistance",
    ],
    bio: "Experienced with mobility support, bathing routines, and respectful personal care. Works well with elders who prefer Mandarin or Hokkien conversation.",
  },
  {
    email: "sd-demo-caregiver03@example.com",
    fullName: "Priya Nair",
    location: "Jurong East, Clementi, Bukit Batok",
    hourlyRate: 30,
    yearsExperience: 5,
    credentials: "Nursing aide certificate and CPR training",
    availability: "Afternoons and evenings",
    responseTime: "Replies same day",
    minimumShiftHours: 3,
    languages: ["English", "Tamil", "Hindi"],
    specialties: [
      "Assist with Daily Living Activities (Laundry, Light Housekeeping, and Self-Care Activities)",
      "Dressing Assistance",
      "Mental Stimulation Activities",
    ],
    bio: "Warm and organized caregiver who helps families keep routines predictable. Comfortable with simple exercises prescribed by therapists and daily living support.",
  },
  {
    email: "sd-demo-caregiver04@example.com",
    fullName: "Nur Hidayah",
    location: "Woodlands, Sembawang, Yishun",
    hourlyRate: 26,
    yearsExperience: 3,
    credentials: "Community care training, elder-sitting experience",
    availability: "Weekends and public holidays",
    responseTime: "Usually replies within 2 hours",
    minimumShiftHours: 4,
    languages: ["English", "Malay", "Indonesian"],
    specialties: [
      "Elder-Sitting / Respite Care",
      "Toileting Assistance",
      "Feeding Assistance",
    ],
    bio: "Reliable weekend caregiver for respite care, simple meals, toileting reminders, and companionship. Known for clear handovers to family members.",
  },
  {
    email: "sd-demo-caregiver05@example.com",
    fullName: "Grace Lim",
    location: "Queenstown, Redhill, Tiong Bahru",
    hourlyRate: 35,
    yearsExperience: 10,
    credentials: "Licensed nurse approved by admin review",
    availability: "Weekdays, flexible hours",
    responseTime: "Usually replies within 45 minutes",
    minimumShiftHours: 3,
    languages: ["English", "Mandarin", "Cantonese"],
    specialties: [
      "Therapist-Prescribed Maintenance Exercises",
      "Transfer Assistance (Bed to Chair and Vice Versa)",
      "Washing / Bathing Assistance",
    ],
    bio: "Detail-oriented caregiver with nursing background and strong family communication. Best suited for households needing careful observation and structured care routines.",
    licensedNurseStatus: "licensed_nurse_approved",
  },
  {
    email: "sd-demo-caregiver06@example.com",
    fullName: "Siti Aminah",
    location: "Hougang, Serangoon, Kovan",
    hourlyRate: 27,
    yearsExperience: 6,
    credentials: "Eldercare certificate, dementia communication training",
    availability: "Monday to Friday mornings",
    responseTime: "Replies within half a day",
    minimumShiftHours: 3,
    languages: ["English", "Malay"],
    specialties: [
      "Mental Stimulation Activities",
      "Elder-Sitting / Respite Care",
      "Walking or Moving Around Assistance",
    ],
    bio: "Calm caregiver who supports elders with memory changes through gentle routines, conversation, and safe movement around the home.",
  },
  {
    email: "sd-demo-caregiver07@example.com",
    fullName: "Chen Wei Jie",
    location: "Punggol, Sengkang, Hougang",
    hourlyRate: 29,
    yearsExperience: 4,
    credentials: "First aid certified, therapy assistant experience",
    availability: "Evenings and Sundays",
    responseTime: "Usually replies within 1 hour",
    minimumShiftHours: 2,
    languages: ["English", "Mandarin", "Teochew"],
    specialties: [
      "Therapist-Prescribed Maintenance Exercises",
      "Walking or Moving Around Assistance",
      "Transfer Assistance (Bed to Chair and Vice Versa)",
    ],
    bio: "Supportive caregiver for mobility practice, short walks, transfer routines, and family respite. Keeps sessions steady and paced to the elder's comfort.",
  },
  {
    email: "sd-demo-caregiver08@example.com",
    fullName: "Maria Santos",
    location: "Marine Parade, Katong, Eunos",
    hourlyRate: 31,
    yearsExperience: 7,
    credentials: "Caregiving diploma, long-term home care experience",
    availability: "Live-out daytime care",
    responseTime: "Usually replies within 2 hours",
    minimumShiftHours: 5,
    languages: ["English", "Tagalog"],
    specialties: [
      "Assist with Daily Living Activities (Laundry, Light Housekeeping, and Self-Care Activities)",
      "Feeding Assistance",
      "Dressing Assistance",
    ],
    bio: "Friendly caregiver with strong experience supporting frail elders at home. Helps with meals, grooming, light housekeeping, and daily companionship.",
  },
  {
    email: "sd-demo-caregiver09@example.com",
    fullName: "Kavitha Raj",
    location: "Little India, Farrer Park, Novena",
    hourlyRate: 33,
    yearsExperience: 9,
    credentials: "Former clinic assistant, first aid and CPR trained",
    availability: "Weekdays after 2pm",
    responseTime: "Replies same day",
    minimumShiftHours: 3,
    languages: ["English", "Tamil"],
    specialties: [
      "Toileting Assistance",
      "Diaper Change Assistance",
      "Washing / Bathing Assistance",
    ],
    bio: "Experienced with personal care tasks and respectful privacy. Good fit for families seeking a confident caregiver for afternoon or evening support.",
  },
  {
    email: "sd-demo-caregiver10@example.com",
    fullName: "Hannah Lee",
    location: "Bukit Timah, Holland Village, Clementi",
    hourlyRate: 36,
    yearsExperience: 12,
    credentials: "Licensed nurse approved by admin review",
    availability: "Weekday mornings and overnight respite by request",
    responseTime: "Usually replies within 30 minutes",
    minimumShiftHours: 4,
    languages: ["English", "Mandarin"],
    specialties: [
      "Transfer Assistance (Bed to Chair and Vice Versa)",
      "Therapist-Prescribed Maintenance Exercises",
      "Feeding Assistance",
    ],
    bio: "Senior caregiver with nursing experience, careful documentation habits, and a calm approach to families managing more complex daily routines.",
    licensedNurseStatus: "licensed_nurse_approved",
  },
  {
    email: "sd-demo-caregiver11@example.com",
    fullName: "Faridah Binte Osman",
    location: "Geylang, Aljunied, Paya Lebar",
    hourlyRate: 25,
    yearsExperience: 2,
    credentials: "Basic caregiving certificate",
    availability: "Flexible part-time slots",
    responseTime: "Replies within half a day",
    minimumShiftHours: 2,
    languages: ["English", "Malay"],
    specialties: [
      "Elder-Sitting / Respite Care",
      "Mental Stimulation Activities",
      "Assist with Daily Living Activities (Laundry, Light Housekeeping, and Self-Care Activities)",
    ],
    bio: "Gentle companion caregiver for families who need light supervision, conversation, reading activities, and short respite breaks.",
  },
  {
    email: "sd-demo-caregiver12@example.com",
    fullName: "Ong Kai Ming",
    location: "Bukit Panjang, Choa Chu Kang, Teck Whye",
    hourlyRate: 28,
    yearsExperience: 5,
    credentials: "Therapy assistant background",
    availability: "Weekends, 9am to 5pm",
    responseTime: "Usually replies within 3 hours",
    minimumShiftHours: 3,
    languages: ["English", "Mandarin", "Hokkien"],
    specialties: [
      "Walking or Moving Around Assistance",
      "Therapist-Prescribed Maintenance Exercises",
      "Transfer Assistance (Bed to Chair and Vice Versa)",
    ],
    bio: "Practical caregiver for mobility-focused support. Helps elders complete prescribed maintenance exercises and move safely around the home.",
  },
  {
    email: "sd-demo-caregiver13@example.com",
    fullName: "Anita Devi",
    location: "Serangoon, Potong Pasir, MacPherson",
    hourlyRate: 30,
    yearsExperience: 6,
    credentials: "Eldercare and dementia-care short courses",
    availability: "Weekdays, 10am to 4pm",
    responseTime: "Usually replies within 1 hour",
    minimumShiftHours: 3,
    languages: ["English", "Tamil", "Hindi"],
    specialties: [
      "Mental Stimulation Activities",
      "Feeding Assistance",
      "Dressing Assistance",
    ],
    bio: "Thoughtful caregiver who focuses on patient routines, simple activities, and respectful support for dressing and meals.",
  },
  {
    email: "sd-demo-caregiver14@example.com",
    fullName: "Rina Wijaya",
    location: "Kallang, Lavender, Bendemeer",
    hourlyRate: 27,
    yearsExperience: 4,
    credentials: "Home care aide training",
    availability: "Afternoons and evenings",
    responseTime: "Replies same day",
    minimumShiftHours: 4,
    languages: ["English", "Indonesian", "Malay"],
    specialties: [
      "Washing / Bathing Assistance",
      "Toileting Assistance",
      "Assist with Daily Living Activities (Laundry, Light Housekeeping, and Self-Care Activities)",
    ],
    bio: "Dependable personal care aide for families needing help with hygiene routines, tidying care areas, and evening supervision.",
  },
  {
    email: "sd-demo-caregiver15@example.com",
    fullName: "Lydia Wong",
    location: "Clementi, West Coast, Dover",
    hourlyRate: 34,
    yearsExperience: 9,
    credentials: "Licensed nurse approved by admin review",
    availability: "Short weekday visits",
    responseTime: "Usually replies within 2 hours",
    minimumShiftHours: 2,
    languages: ["English", "Mandarin", "Cantonese"],
    specialties: [
      "Feeding Assistance",
      "Transfer Assistance (Bed to Chair and Vice Versa)",
      "Diaper Change Assistance",
    ],
    bio: "Efficient and reassuring caregiver for short visits, meal support, transfer assistance, and family handovers.",
    licensedNurseStatus: "licensed_nurse_approved",
  },
  {
    email: "sd-demo-caregiver16@example.com",
    fullName: "James Quek",
    location: "Yishun, Canberra, Sembawang",
    hourlyRate: 26,
    yearsExperience: 3,
    credentials: "First aid certified, elder-sitting experience",
    availability: "Evenings, 6pm to 10pm",
    responseTime: "Usually replies within 1 hour",
    minimumShiftHours: 2,
    languages: ["English", "Mandarin"],
    specialties: [
      "Elder-Sitting / Respite Care",
      "Walking or Moving Around Assistance",
      "Mental Stimulation Activities",
    ],
    bio: "Evening respite caregiver who supports safe walks, conversation, games, and simple household routines while family members rest.",
  },
  {
    email: "sd-demo-caregiver17@example.com",
    fullName: "Malar Selvi",
    location: "Woodlands, Marsiling, Admiralty",
    hourlyRate: 29,
    yearsExperience: 6,
    credentials: "Caregiving certificate and hospital volunteer experience",
    availability: "Weekday afternoons",
    responseTime: "Replies within half a day",
    minimumShiftHours: 3,
    languages: ["English", "Tamil", "Malay"],
    specialties: [
      "Dressing Assistance",
      "Toileting Assistance",
      "Washing / Bathing Assistance",
    ],
    bio: "Steady caregiver for personal care and dignity-focused support. Comfortable coordinating with family members on preferred routines.",
  },
  {
    email: "sd-demo-caregiver18@example.com",
    fullName: "Elaine Chua",
    location: "Toa Payoh, Balestier, Novena",
    hourlyRate: 31,
    yearsExperience: 7,
    credentials: "Dementia-care training and first aid certification",
    availability: "Mornings and lunch coverage",
    responseTime: "Usually replies within 45 minutes",
    minimumShiftHours: 3,
    languages: ["English", "Mandarin", "Teochew"],
    specialties: [
      "Mental Stimulation Activities",
      "Feeding Assistance",
      "Elder-Sitting / Respite Care",
    ],
    bio: "Patient caregiver for elders with memory changes. Uses gentle reminders, familiar routines, and calm mealtime support.",
  },
  {
    email: "sd-demo-caregiver19@example.com",
    fullName: "Noor Azlan",
    location: "Pasir Ris, Tampines, Simei",
    hourlyRate: 28,
    yearsExperience: 5,
    credentials: "Home care support certificate",
    availability: "Weekends and weekday nights",
    responseTime: "Usually replies within 2 hours",
    minimumShiftHours: 3,
    languages: ["English", "Malay"],
    specialties: [
      "Transfer Assistance (Bed to Chair and Vice Versa)",
      "Walking or Moving Around Assistance",
      "Assist with Daily Living Activities (Laundry, Light Housekeeping, and Self-Care Activities)",
    ],
    bio: "Reliable caregiver for mobility assistance, evening supervision, and practical household support around the elder's care space.",
  },
  {
    email: "sd-demo-caregiver20@example.com",
    fullName: "Catherine Goh",
    location: "City Hall, River Valley, Orchard",
    hourlyRate: 38,
    yearsExperience: 14,
    credentials: "Licensed nurse approved by admin review",
    availability: "Premium short visits and care planning support",
    responseTime: "Usually replies within 30 minutes",
    minimumShiftHours: 2,
    languages: ["English", "Mandarin", "Cantonese"],
    specialties: [
      "Therapist-Prescribed Maintenance Exercises",
      "Transfer Assistance (Bed to Chair and Vice Versa)",
      "Feeding Assistance",
    ],
    bio: "Highly experienced caregiver with nursing background. Strong fit for families who want careful observation, concise updates, and structured care planning.",
    licensedNurseStatus: "licensed_nurse_approved",
  },
];

async function listAllUsers() {
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

async function upsertAuthUser(existingUsersByEmail, account) {
  const email = account.email.toLowerCase();
  const existing = existingUsersByEmail.get(email);
  const userMetadata = {
    account_type: account.accountType,
    full_name: account.fullName,
    phone: account.phone ?? "",
    location: account.location ?? "",
  };
  const appMetadata = {
    account_type: account.accountType,
  };

  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: demoPassword,
      user_metadata: userMetadata,
      app_metadata: appMetadata,
      email_confirm: true,
    });

    if (error) throw error;
    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: demoPassword,
    email_confirm: true,
    user_metadata: userMetadata,
    app_metadata: appMetadata,
  });

  if (error) throw error;
  return data.user;
}

function getLastActiveAt(index) {
  const date = new Date();
  date.setHours(date.getHours() - index * 5);
  return date.toISOString();
}

async function seed() {
  console.log("Loading existing Supabase Auth users...");
  const existingUsers = await listAllUsers();
  const existingUsersByEmail = new Map(
    existingUsers
      .filter((user) => user.email)
      .map((user) => [user.email.toLowerCase(), user])
  );

  console.log("Creating or updating family account...");
  const familyUser = await upsertAuthUser(existingUsersByEmail, {
    ...familyAccount,
    accountType: "client",
  });

  const { error: familyProfileError } = await supabase
    .from("client_profiles")
    .upsert(
      {
        user_id: familyUser.id,
        full_name: familyAccount.fullName,
        phone: familyAccount.phone,
        location: familyAccount.location,
      },
      { onConflict: "user_id" }
    );

  if (familyProfileError) throw familyProfileError;

  console.log("Creating or updating caregiver accounts...");
  const caregiverProfiles = [];
  for (const [index, caregiver] of caregivers.entries()) {
    const user = await upsertAuthUser(existingUsersByEmail, {
      ...caregiver,
      accountType: "caregiver",
    });

    caregiverProfiles.push({
      user_id: user.id,
      full_name: caregiver.fullName,
      service_category: "home_personal_care",
      service_categories: ["home_personal_care"],
      bio: caregiver.bio,
      years_experience: caregiver.yearsExperience,
      credentials_summary: caregiver.credentials,
      availability_summary: caregiver.availability,
      response_time_summary: caregiver.responseTime,
      minimum_shift_hours: caregiver.minimumShiftHours,
      last_active_at: getLastActiveAt(index),
      hourly_rate: caregiver.hourlyRate,
      home_nursing_rate: null,
      home_personal_care_rate: caregiver.hourlyRate,
      location: caregiver.location,
      care_specialties: caregiver.specialties,
      languages_spoken: caregiver.languages,
      profile_photo_url: "",
      licensed_nurse_status:
        caregiver.licensedNurseStatus ?? "no_licence_uploaded",
      is_verified: true,
      is_boosted: index < 4,
      boost_expires_at:
        index < 4
          ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
          : null,
    });
  }

  const { error: caregiverProfileError } = await supabase
    .from("profiles")
    .upsert(caregiverProfiles, { onConflict: "user_id" });

  if (caregiverProfileError) throw caregiverProfileError;

  console.log("");
  console.log("Demo seed complete.");
  console.log("");
  console.log("Family browsing account:");
  console.log(`  Email: ${familyAccount.email}`);
  console.log(`  Password: ${demoPassword}`);
  console.log("");
  console.log("Caregiver accounts:");
  console.log("  Emails: sd-demo-caregiver01@example.com to sd-demo-caregiver20@example.com");
  console.log(`  Password: ${demoPassword}`);
  console.log("");
  console.log("Open /directory after signing in as the family account.");
}

seed().catch((error) => {
  console.error("");
  console.error("Demo seed failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
