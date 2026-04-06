import FAQAccordion, { type FAQSection } from "@/components/faq-accordion";
import SiteHeader from "@/components/site-header";

const CAREGIVER_FAQ_SECTIONS: FAQSection[] = [
  {
    id: "registration-verification",
    title: "Registration",
    items: [
      {
        id: "caregiver-1",
        question: "1. Who can register as a caregiver on the platform?",
        answer: (
          <p>
            Caregivers can register with an email/password account and complete their public profile details.
          </p>
        ),
      },
      {
        id: "caregiver-3",
        question: "3. Is my SNB certificate or student ID shown to the public?",
        answer: (
          <p>
            No. If you upload supporting documents, they remain private and are not shown on your public profile.
          </p>
        ),
      },
      {
        id: "caregiver-4",
        question:
          "4. I am a foreign nurse in Singapore on EP, S Pass, or Work Permit. Can I register for weekend care?",
        answer: (
          <p>
            No. Under MOM regulations, EP, S Pass, and Work Permit holders are tied to sponsoring employers and are not allowed to moonlight as freelancers. Silver Directory cannot sponsor work visas or LOC.
          </p>
        ),
      },
      {
        id: "caregiver-5",
        question:
          "5. Can Dependant's Pass (DP) or Student's Pass holders offer freelance caregiving?",
        answer: (
          <p>
            No. Freelancing without an employer-sponsored work arrangement is heavily restricted in Singapore. To offer independent caregiving on this platform, you must be a Singapore Citizen or Permanent Resident (PR).
          </p>
        ),
      },
      {
        id: "caregiver-6",
        question: "6. What happens if I hide my work pass status to accept jobs?",
        answer: (
          <p>
            Falsifying residency or work pass status is a serious violation. Accounts found bypassing rules will be permanently banned. Illegal freelancing can also result in MOM penalties, including fines and pass revocation.
          </p>
        ),
      },
    ],
  },
  {
    id: "fees-payments",
    title: "Fees & Payments",
    items: [
      {
        id: "caregiver-7",
        question: "7. How much commission does the platform take from my earnings?",
        answer: (
          <p>
            Zero commission. We do not take matching fees, agency fees, or wage percentages. You keep 100% of your earnings.
          </p>
        ),
      },
      {
        id: "caregiver-8",
        question: "8. How and when do I get paid?",
        answer: (
          <p>
            We do not hold or process wages. You agree directly with each family on payment method (for example: PayNow, cash) and timing (for example: end of shift, weekly) before work starts.
          </p>
        ),
      },
      {
        id: "caregiver-9",
        question: "9. Do I have to pay anything to use the platform?",
        answer: (
          <p>
            Yes. A sign up fee of S$9.99 is required for caregiver accounts. An optional
            &quot;Profile Boost&quot; feature is available at S$5 to raise visibility for 7 days.
          </p>
        ),
      },
    ],
  },
  {
    id: "jobs-scheduling",
    title: "Jobs & Scheduling",
    items: [
      {
        id: "caregiver-10",
        question: "10. Do I need to pay a sign up fee?",
        answer: (
          <p>
            Yes. A sign up fee of S$9.99 is required.
          </p>
        ),
      },
      {
        id: "caregiver-11",
        question: "11. Am I required to accept every inquiry I receive?",
        answer: (
          <p>
            No. You are an independent freelancer with full control over your availability and preferred care scope.
          </p>
        ),
      },
      {
        id: "caregiver-12",
        question: "12. Does the platform assign or match me to jobs automatically?",
        answer: (
          <p>
            No. We do not auto-assign shifts. Families browse and choose caregivers themselves, and both sides coordinate dates and arrangements directly.
          </p>
        ),
      },
    ],
  },
  {
    id: "trust-safety",
    title: "Trust & Safety",
    items: [
      {
        id: "caregiver-13",
        question: "13. What should I do before visiting a client's house for the first time?",
        answer: (
          <p>
            For safety, conduct a short video call before accepting the assignment. This helps verify identity, environment, and patient condition before travel.
          </p>
        ),
      },
      {
        id: "caregiver-15",
        question: "15. What if I face an emergency or medical dispute during a shift?",
        answer: (
          <p>
            As an independent contractor, you are responsible for care provided. In emergencies, follow standard medical protocols (for example: call 995). The platform does not provide medical liability coverage.
          </p>
        ),
      },
    ],
  },
];

export default function CaregiversFAQPage() {
  return (
    <div className="site-shell">
      <SiteHeader />

      <section className="surface-panel page-enter p-6 md:p-8">
        <div>
          <div>
            <p className="eyebrow">FAQ</p>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#10233b] md:text-4xl">
              Frequently Asked Questions (For Caregivers)
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#56677c]">
              Guidance on registration, payments, platform rules, and safety.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <FAQAccordion sections={CAREGIVER_FAQ_SECTIONS} />
        </div>
      </section>
    </div>
  );
}
