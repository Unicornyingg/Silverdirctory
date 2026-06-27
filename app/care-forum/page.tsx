import Link from "next/link";
import SiteHeader from "@/components/site-header";

type ForumPost = {
  title: string;
  category: string;
  summary: string;
  author: string;
  readTime: string;
  tags: string[];
};

type ForumSection = {
  title: string;
  description: string;
  posts: ForumPost[];
};

const TRENDING_POSTS: ForumPost[] = [
  {
    title: "5 things to prepare before a caregiver's first visit",
    category: "Home Safety",
    summary:
      "A quick checklist for emergency contacts, access instructions, routines, and home hazards before care begins.",
    author: "Caregiver note",
    readTime: "4 min read",
    tags: ["First visit", "Checklist"],
  },
  {
    title: "How to help someone out of bed without pulling their arms",
    category: "Mobility & Transfers",
    summary:
      "Simple body-positioning reminders that make morning transfers safer for both the elder and the helper.",
    author: "Caregiver note",
    readTime: "5 min read",
    tags: ["Transfers", "Bed care"],
  },
  {
    title: "A simple medication list every family should keep updated",
    category: "Medication Basics",
    summary:
      "What to record in one shared list so caregivers can quickly understand timing, dosage notes, and recent changes.",
    author: "Caregiver note",
    readTime: "3 min read",
    tags: ["Medicine list", "Handover"],
  },
];

const FORUM_SECTIONS: ForumSection[] = [
  {
    title: "Home Safety",
    description: "Practical ways to make the home easier to move through, rest in, and supervise.",
    posts: [
      {
        title: "Bathroom fall risks families often miss",
        category: "Home Safety",
        summary:
          "Look for loose mats, slippery thresholds, low lighting, and towel racks that are being used like grab bars.",
        author: "Caregiver note",
        readTime: "3 min read",
        tags: ["Falls", "Bathroom"],
      },
      {
        title: "How to set up a night-time walking path",
        category: "Home Safety",
        summary:
          "A clear path from bed to toilet can reduce confusion and lower the chance of tripping after dark.",
        author: "Caregiver note",
        readTime: "3 min read",
        tags: ["Night care", "Lighting"],
      },
      {
        title: "What to check before leaving an elder alone for an hour",
        category: "Home Safety",
        summary:
          "A calm routine for water, phone access, mobility aids, door safety, and reachable essentials.",
        author: "Caregiver note",
        readTime: "4 min read",
        tags: ["Routine", "Supervision"],
      },
    ],
  },
  {
    title: "Mobility & Transfers",
    description: "Gentle movement tips for beds, chairs, wheelchairs, and short walks around the home.",
    posts: [
      {
        title: "How to help someone stand from a chair safely",
        category: "Mobility & Transfers",
        summary:
          "Use stable footwear, count down clearly, and encourage pushing from the chair instead of pulling from the arms.",
        author: "Caregiver note",
        readTime: "4 min read",
        tags: ["Chair transfer", "Balance"],
      },
      {
        title: "Bed-to-wheelchair transfer basics",
        category: "Mobility & Transfers",
        summary:
          "Prepare the wheelchair position, clear the floor, lock brakes, and pause if the person feels dizzy.",
        author: "Caregiver note",
        readTime: "5 min read",
        tags: ["Wheelchair", "Bed care"],
      },
      {
        title: "When not to move a loved one without help",
        category: "Mobility & Transfers",
        summary:
          "Warning signs such as sudden pain, new weakness, confusion, or a recent fall should be handled with proper support.",
        author: "Caregiver note",
        readTime: "4 min read",
        tags: ["Safety", "Red flags"],
      },
    ],
  },
  {
    title: "Medication Basics",
    description: "Non-clinical tips for organizing medicines and communicating clearly with caregivers.",
    posts: [
      {
        title: "How to organize morning and evening medicines",
        category: "Medication Basics",
        summary:
          "Keep medicine timing visible, separate current medicines from old ones, and record who gave the last dose.",
        author: "Caregiver note",
        readTime: "4 min read",
        tags: ["Timing", "Organization"],
      },
      {
        title: "What medicines should be reviewed before hiring care",
        category: "Medication Basics",
        summary:
          "Prepare a current list for the caregiver and check unclear instructions with a pharmacist or doctor.",
        author: "Caregiver note",
        readTime: "3 min read",
        tags: ["Handover", "Review"],
      },
      {
        title: "Questions to ask when a new medicine is added",
        category: "Medication Basics",
        summary:
          "Ask about timing, food instructions, missed doses, side effects to watch for, and who to contact with concerns.",
        author: "Caregiver note",
        readTime: "4 min read",
        tags: ["Questions", "Care notes"],
      },
    ],
  },
  {
    title: "Dementia Care",
    description: "Communication and routine ideas for families supporting memory changes at home.",
    posts: [
      {
        title: "What to do when evenings become confusing",
        category: "Dementia Care",
        summary:
          "Reduce noise, keep lighting warm, avoid rushing, and use familiar routines to make evenings calmer.",
        author: "Caregiver note",
        readTime: "4 min read",
        tags: ["Evening care", "Calm routines"],
      },
      {
        title: "How to reduce repeated questions without arguing",
        category: "Dementia Care",
        summary:
          "Use short reassurance, visible reminders, and gentle redirection instead of correcting every repeated question.",
        author: "Caregiver note",
        readTime: "5 min read",
        tags: ["Communication", "Patience"],
      },
      {
        title: "Simple routines that make care calmer",
        category: "Dementia Care",
        summary:
          "Consistent wake times, meals, activities, and rest periods can help the day feel more predictable.",
        author: "Caregiver note",
        readTime: "3 min read",
        tags: ["Routine", "Daily care"],
      },
    ],
  },
];

function PostCard({ post, featured = false }: { post: ForumPost; featured?: boolean }) {
  return (
    <article
      className={`flex h-full flex-col rounded-lg border p-5 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-medium)] ${
        featured
          ? "border-[var(--btn-secondary-border)] bg-[var(--signal)] text-[var(--foreground)]"
          : "border-[var(--line)] bg-[var(--panel-strong)] text-[var(--foreground)]"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold uppercase">
        <span
          className={`rounded-full px-3 py-1 ${
            featured ? "bg-white text-[var(--brand)]" : "bg-[var(--accent-soft)] text-[var(--brand)]"
          }`}
        >
          {post.category}
        </span>
        <span className={featured ? "text-[var(--brand)]" : "text-[var(--muted)]"}>{post.readTime}</span>
      </div>

      <h3 className="mt-4 text-xl font-extrabold leading-snug">{post.title}</h3>
      <p className={`mt-3 flex-1 text-sm leading-6 ${featured ? "text-[var(--brand)]" : "text-[var(--muted)]"}`}>
        {post.summary}
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {post.tags.map((tag) => (
          <span
            key={tag}
            className={`rounded-full border px-3 py-1 text-xs font-bold ${
              featured
                ? "border-[var(--btn-secondary-border)] bg-white text-[var(--brand)]"
                : "border-[var(--line)] bg-white text-[var(--muted)]"
            }`}
          >
            {tag}
          </span>
        ))}
      </div>

      <p className={`mt-5 text-xs font-bold ${featured ? "text-[var(--brand)]" : "text-[var(--muted)]"}`}>
        {post.author}
      </p>
    </article>
  );
}

export default function CareForumPage() {
  return (
    <div className="site-shell">
      <SiteHeader />

      <main className="space-y-8">
        <section className="surface-panel page-enter p-6 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <p className="eyebrow">Care Forum</p>
              <h1 className="mt-4 max-w-4xl font-display text-4xl font-semibold leading-tight text-[var(--foreground)] md:text-6xl">
                Practical eldercare tips from people who care every day
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--muted)] md:text-lg">
                A static preview of community posts for families and caregivers, focused on safer homes, clearer handovers,
                and calmer daily routines.
              </p>
            </div>

            <div className="rounded-lg border border-[var(--line)] bg-[var(--panel-strong)] p-5">
              <p className="text-sm font-extrabold text-[var(--foreground)]">Safety note</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Posts are general caregiving guidance, not medical advice. For urgent symptoms or emergencies in Singapore,
                call 995 and contact a healthcare professional.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/directory" className="primary-btn">
                  Browse Caregivers
                </Link>
                <Link href="/signup" className="secondary-btn">
                  Join the Community
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="page-enter">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Trending</p>
              <h2 className="mt-3 text-3xl font-extrabold text-[var(--foreground)]">Most useful this week</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-[var(--muted)]">
              The three posts families are most likely to need before arranging care at home.
            </p>
          </div>

          <div className="stagger mt-5 grid gap-4 md:grid-cols-3">
            {TRENDING_POSTS.map((post) => (
              <PostCard key={post.title} post={post} featured />
            ))}
          </div>
        </section>

        {FORUM_SECTIONS.map((section) => (
          <section key={section.title} className="page-enter">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="eyebrow">Section</p>
                <h2 className="mt-3 text-3xl font-extrabold text-[var(--foreground)]">{section.title}</h2>
              </div>
              <p className="max-w-xl text-sm leading-6 text-[var(--muted)]">{section.description}</p>
            </div>

            <div className="stagger mt-5 grid gap-4 md:grid-cols-3">
              {section.posts.map((post) => (
                <PostCard key={post.title} post={post} />
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
