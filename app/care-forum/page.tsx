import Link from "next/link";
import CareForumPostCard, {
  type CaregiverAuthor,
  type ForumPost,
} from "@/app/care-forum/care-forum-post-card";
import SiteHeader from "@/components/site-header";

type ForumSection = {
  title: string;
  description: string;
  posts: ForumPost[];
};

const FALLBACK_AUTHORS: CaregiverAuthor[] = [
  { full_name: "Aisha Rahman", profile_photo_url: "/img/user1.jpg" },
  { full_name: "Mei Lin Tan", profile_photo_url: "/img/user2.jpg" },
  { full_name: "Priya Nair", profile_photo_url: "/img/user3.jpg" },
  { full_name: "Grace Lim", profile_photo_url: "/img/user1.jpg" },
  { full_name: "Maria Santos", profile_photo_url: "/img/user2.jpg" },
];

const TRENDING_POSTS: ForumPost[] = [
  {
    title: "5 things to prepare before a caregiver's first visit",
    category: "Home Safety",
    summary:
      "A quick checklist for emergency contacts, access instructions, routines, and home hazards before care begins.",
    readTime: "4 min read",
    comments: [
      {
        name: "Daniel Koh",
        body: "This helped us prepare a one-page handover before our first caregiver visit. It made the first day much less stressful.",
      },
      {
        name: "Mdm Lim",
        body: "I would add the Wi-Fi password and where spare keys are kept. Small details save a lot of back-and-forth.",
      },
      {
        name: "Rachel Tan",
        body: "The emergency contact list is so important. We now keep one copy near the fridge and one in the care notebook.",
      },
    ],
  },
  {
    title: "How to help someone out of bed without pulling their arms",
    category: "Mobility & Transfers",
    summary:
      "Simple body-positioning reminders that make morning transfers safer for both the elder and the helper.",
    readTime: "5 min read",
    comments: [
      {
        name: "Joanna Seah",
        body: "Very useful reminder not to pull the arms. We started using a clear countdown and it helped my dad feel less rushed.",
      },
      {
        name: "Mr Ong",
        body: "A stable chair beside the bed also helps when the person needs to pause halfway through standing.",
      },
    ],
  },
  {
    title: "A simple medication list every family should keep updated",
    category: "Medication Basics",
    summary:
      "What to record in one shared list so caregivers can quickly understand timing, dosage notes, and recent changes.",
    readTime: "3 min read",
    comments: [
      {
        name: "Samantha Lee",
        body: "We added a 'last updated' date at the top of the list. That made it clearer for weekend caregivers.",
      },
      {
        name: "Vincent Goh",
        body: "Helpful post. I also keep a photo of the medicine packaging in case the printed label is hard to read.",
      },
      {
        name: "Nur Izzati",
        body: "Good point about recent changes. That is often what gets missed during handover.",
      },
    ],
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
        readTime: "3 min read",
        comments: [
          {
            name: "Elaine Ng",
            body: "We removed the bathroom mat after reading similar advice. It felt minor, but it really reduced slipping.",
          },
          {
            name: "Jason Teo",
            body: "Grab bars made a big difference for my grandmother. Towel racks are definitely not strong enough.",
          },
        ],
      },
      {
        title: "How to set up a night-time walking path",
        category: "Home Safety",
        summary:
          "A clear path from bed to toilet can reduce confusion and lower the chance of tripping after dark.",
        readTime: "3 min read",
        comments: [
          {
            name: "Farah Ahmad",
            body: "Night lights helped my mum a lot. We placed one near the bed and one just outside the bathroom.",
          },
          {
            name: "Kelvin Chua",
            body: "We also moved a small side table that was always in the walkway. Simple but effective.",
          },
          {
            name: "Anita Menon",
            body: "Clear slippers with non-slip soles are another useful thing to check before bedtime.",
          },
        ],
      },
      {
        title: "What to check before leaving an elder alone for an hour",
        category: "Home Safety",
        summary:
          "A calm routine for water, phone access, mobility aids, door safety, and reachable essentials.",
        readTime: "4 min read",
        comments: [
          {
            name: "Hui Min",
            body: "The reachable essentials point is very practical. My father gets anxious when his phone is not within reach.",
          },
          {
            name: "Syafiq Rahman",
            body: "We added a whiteboard note saying when we will be back. It helps reduce repeated calls.",
          },
        ],
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
        readTime: "4 min read",
        comments: [
          {
            name: "Clara Wong",
            body: "The countdown is such a good tip. It lets everyone move together instead of guessing.",
          },
          {
            name: "Mr Tan",
            body: "We changed to a chair with firm armrests. It made standing much easier for my wife.",
          },
          {
            name: "Nadia Lim",
            body: "Helpful and easy to understand. I shared this with my siblings who rotate caregiving duties.",
          },
        ],
      },
      {
        title: "Bed-to-wheelchair transfer basics",
        category: "Mobility & Transfers",
        summary:
          "Prepare the wheelchair position, clear the floor, lock brakes, and pause if the person feels dizzy.",
        readTime: "5 min read",
        comments: [
          {
            name: "Terence Foo",
            body: "Locking the brakes sounds obvious, but it is exactly the step people forget when rushing.",
          },
          {
            name: "Priya S.",
            body: "The pause for dizziness is important. My mum needs a few seconds after sitting up.",
          },
        ],
      },
      {
        title: "When not to move a loved one without help",
        category: "Mobility & Transfers",
        summary:
          "Warning signs such as sudden pain, new weakness, confusion, or a recent fall should be handled with proper support.",
        readTime: "4 min read",
        comments: [
          {
            name: "Benjamin Low",
            body: "This is a good reminder that not every situation should be handled at home by family alone.",
          },
          {
            name: "Michelle Yeo",
            body: "I like that it tells people when to stop and ask for help. That is just as important as transfer technique.",
          },
          {
            name: "Arun Kumar",
            body: "After a fall, we now call for advice first instead of trying to lift immediately.",
          },
        ],
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
        readTime: "4 min read",
        comments: [
          {
            name: "Pei Shan",
            body: "Separating old medicine from current medicine prevented a lot of confusion in our home.",
          },
          {
            name: "Ravi Nair",
            body: "We use a simple notebook to record the last dose. It works better than relying on memory.",
          },
        ],
      },
      {
        title: "What medicines should be reviewed before hiring care",
        category: "Medication Basics",
        summary:
          "Prepare a current list for the caregiver and check unclear instructions with a pharmacist or doctor.",
        readTime: "3 min read",
        comments: [
          {
            name: "Lydia Koh",
            body: "I brought the full list to our pharmacist and they helped us spot duplicate items.",
          },
          {
            name: "Marcus Lee",
            body: "Good advice. Caregivers can support routines better when the instructions are clear from the start.",
          },
          {
            name: "Fatimah Noor",
            body: "We also include allergies and food restrictions beside the medicine list.",
          },
        ],
      },
      {
        title: "Questions to ask when a new medicine is added",
        category: "Medication Basics",
        summary:
          "Ask about timing, food instructions, missed doses, side effects to watch for, and who to contact with concerns.",
        readTime: "4 min read",
        comments: [
          {
            name: "Janice Ho",
            body: "The missed dose question is one I always forget to ask. Adding it to my clinic notes now.",
          },
          {
            name: "Wei Lun",
            body: "Very helpful for families with multiple caregivers. Everyone should know who to call if unsure.",
          },
        ],
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
        readTime: "4 min read",
        comments: [
          {
            name: "Olivia Chan",
            body: "Lowering TV volume in the evening really helped my grandfather settle down.",
          },
          {
            name: "Hafiz Rahim",
            body: "Warm lighting and a fixed tea-time routine worked well for us too.",
          },
          {
            name: "Serene Lim",
            body: "This post is gentle and practical. Avoiding rush makes such a big difference.",
          },
        ],
      },
      {
        title: "How to reduce repeated questions without arguing",
        category: "Dementia Care",
        summary:
          "Use short reassurance, visible reminders, and gentle redirection instead of correcting every repeated question.",
        readTime: "5 min read",
        comments: [
          {
            name: "Charmaine Tan",
            body: "The reminder card idea helped my aunt. We wrote the day's plan in large text.",
          },
          {
            name: "Rajesh Pillai",
            body: "I used to correct every question. Redirection is much calmer for everyone.",
          },
        ],
      },
      {
        title: "Simple routines that make care calmer",
        category: "Dementia Care",
        summary:
          "Consistent wake times, meals, activities, and rest periods can help the day feel more predictable.",
        readTime: "3 min read",
        comments: [
          {
            name: "Melissa Aw",
            body: "A simple daily routine reduced a lot of afternoon restlessness for my mum.",
          },
          {
            name: "Eugene Tan",
            body: "We printed the routine and placed it near the dining table. Caregivers and family all follow the same plan.",
          },
          {
            name: "Siti H.",
            body: "Predictable meal times have been the most helpful part for our family.",
          },
        ],
      },
    ],
  },
];

function getPostAuthor(authors: CaregiverAuthor[], index: number): CaregiverAuthor {
  return authors[(index * 7 + 3) % authors.length] ?? FALLBACK_AUTHORS[0];
}

export default function CareForumPage() {
  const authors = FALLBACK_AUTHORS;

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
                Community posts for families and caregivers, focused on safer homes, clearer handovers, and calmer daily
                routines.
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
            {TRENDING_POSTS.map((post, index) => (
              <CareForumPostCard key={post.title} post={post} author={getPostAuthor(authors, index)} featured />
            ))}
          </div>
        </section>

        {FORUM_SECTIONS.map((section, sectionIndex) => (
          <section key={section.title} className="page-enter">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="eyebrow">Section</p>
                <h2 className="mt-3 text-3xl font-extrabold text-[var(--foreground)]">{section.title}</h2>
              </div>
              <p className="max-w-xl text-sm leading-6 text-[var(--muted)]">{section.description}</p>
            </div>

            <div className="stagger mt-5 grid gap-4 md:grid-cols-3">
              {section.posts.map((post, postIndex) => (
                <CareForumPostCard
                  key={post.title}
                  post={post}
                  author={getPostAuthor(authors, TRENDING_POSTS.length + sectionIndex * 3 + postIndex)}
                />
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
