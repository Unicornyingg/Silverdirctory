import type { ReactElement } from "react";
import SiteHeader from "@/components/site-header";
import { HeroSection } from "@/components/landing/HeroSection";
import { SectionTitle } from "@/components/landing/SectionTitle";
import { Benefits } from "@/components/landing/Benefits";
import { Testimonials, Mark } from "@/components/landing/Testimonials";
import { FaqList } from "@/components/landing/FaqList";
import { CtaBanner } from "@/components/landing/CtaBanner";
import { SiteFooter } from "@/components/layout/site-footer";

import benefitOneImg from "@/public/images/direct-caregiver-discovery.png";
import benefitTwoImg from "@/public/images/caregiver-marketplace-rules.png";
import userOneImg from "@/public/img/user1.jpg";
import userTwoImg from "@/public/img/user2.jpg";
import userThreeImg from "@/public/img/user3.jpg";

const benefitOne = {
  title: "Built for direct caregiver discovery",
  desc: "Families can browse profiles, compare hourly rates, and shortlist caregivers based on region and care services before starting a chat.",
  image: benefitOneImg,
  imageAlt:
    "Family and caregiver discussing care options in a Singapore home living room",
  bullets: [
    {
      title: "Filter by real care needs",
      desc: "Use service and max-rate filters to quickly find relevant caregiver listings.",
      icon: <HeartIcon />,
    },
    {
      title: "Start in-app chat first",
      desc: "Discuss tasks, schedule needs, and expectations safely before sharing personal details.",
      icon: <ChatIcon />,
    },
    {
      title: "No matching delays",
      desc: "There is no coordinator queue or algorithmic assignment. Families choose directly.",
      icon: <LightningIcon />,
    },
  ],
};

const benefitTwo = {
  title: "Fair marketplace rules for caregivers",
  desc: "Independent caregivers keep control over their profiles, rates, and availability while retaining 100% of wage payments.",
  image: benefitTwoImg,
  imageAlt:
    "Independent caregiver managing her service listings and schedule on a laptop",
  bullets: [
    {
      title: "Zero wage commission",
      desc: "Silver Directory does not deduct wage percentages from caregiver earnings.",
      icon: <WalletIcon />,
    },
    {
      title: "Profile visibility controls",
      desc: "Caregivers can maintain profile details, services, languages, and preferred service regions.",
      icon: <ProfileIcon />,
    },
    {
      title: "Direct arrangements",
      desc: "Families and caregivers agree care scope, payment method, and shift timing directly.",
      icon: <CalendarIcon />,
    },
  ],
};

const testimonialItems = [
  {
    quote: (
      <>
        We found a caregiver in two days by comparing profiles and starting chat directly.
        <Mark> The process felt clear and fast.</Mark>
      </>
    ),
    name: "Family Caregiver Coordinator",
    title: "Daughter arranging home support",
    image: userOneImg,
  },
  {
    quote: (
      <>
        The platform lets me explain my services upfront, so families who contact me are
        usually a <Mark>stronger fit</Mark> for my scope.
      </>
    ),
    name: "Independent Caregiver",
    title: "Home personal care provider",
    image: userTwoImg,
  },
  {
    quote: (
      <>
        No agency lock-in and no auto-matching made the process simpler.
        <Mark> We stayed in control</Mark> from search to first shift.
      </>
    ),
    name: "Family Member",
    title: "Primary decision-maker for eldercare",
    image: userThreeImg,
  },
];

const faqItems = [
  {
    question: "How does Silver Directory match families with caregivers?",
    answer:
      "It does not auto-match. Families browse caregiver listings and decide who to contact directly.",
  },
  {
    question: "Does the platform process wages between families and caregivers?",
    answer:
      "No. Wage payment method and timing are discussed and agreed directly between both parties.",
  },
  {
    question: "Can caregivers keep all their earnings?",
    answer:
      "Yes. Silver Directory does not take matching commission from caregiver wages.",
  },
  {
    question: "What should families do before the first home visit?",
    answer:
      "Arrange a short video call first, confirm identity details, and align care scope and escalation steps.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <SiteHeader />

      <HeroSection />

      <SectionTitle
        preTitle="Silver Directory Benefits"
        title="A caregiving marketplace shaped around direct, transparent connection"
      >
        Families can discover local caregivers quickly, and caregivers can present their services
        clearly with no hidden matching logic.
      </SectionTitle>

      <Benefits data={benefitOne} />
      <Benefits imgPos="right" data={benefitTwo} />

      <SectionTitle preTitle="Community Feedback" title="What users value about Silver Directory">
        Real experiences from families and caregivers using a direct listing model.
      </SectionTitle>

      <Testimonials items={testimonialItems} />

      <SectionTitle preTitle="FAQ" title="Frequently Asked Questions">
        Core guidance on matching, payments, and first-visit safety.
      </SectionTitle>

      <FaqList items={faqItems} />
      <CtaBanner />
      <SiteFooter />
    </div>
  );
}

function iconWrapper(path: ReactElement): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#ffffff"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {path}
    </svg>
  );
}

function HeartIcon() {
  return iconWrapper(<path d="M12 21s-7-4.4-9-9a5.5 5.5 0 0 1 9-6 5.5 5.5 0 0 1 9 6c-2 4.6-9 9-9 9Z" />);
}

function ChatIcon() {
  return iconWrapper(
    <>
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" />
      <path d="M8 9h8M8 13h6" />
    </>
  );
}

function LightningIcon() {
  return iconWrapper(<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />);
}

function WalletIcon() {
  return iconWrapper(
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M16 12h5" />
    </>
  );
}

function ProfileIcon() {
  return iconWrapper(
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>
  );
}

function CalendarIcon() {
  return iconWrapper(
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </>
  );
}
