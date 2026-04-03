import Link from "next/link";
import FAQAccordion, { type FAQSection } from "@/components/faq-accordion";
import SiteHeader from "@/components/site-header";

const FAMILY_FAQ_SECTIONS: FAQSection[] = [
  {
    id: "finding-hiring",
    title: "Finding & Hiring a Caregiver",
    items: [
      {
        id: "family-1",
        question: "1. How do I request or find a caregiver?",
        answer: (
          <p>
            Unlike traditional agencies where you wait for a coordinator to assign someone to you, Silver Directory puts you in control. Browse the directory, use filters to find a caregiver who meets your needs (for example: location and rate), then contact them directly off-platform.
          </p>
        ),
      },
      {
        id: "family-2",
        question: "2. How does Silver Directory match patients with caregivers?",
        answer: (
          <p>
            We do not auto-match. Silver Directory is a direct-contact digital notice board. You can read caregiver bios, compare rates, and decide who is the best fit for your loved one.
          </p>
        ),
      },
      {
        id: "family-3",
        question: "3. What are the qualifications of the caregivers on the platform?",
        answer: (
          <p>
            Caregivers on Silver Directory are independent professionals who provide their own profile details, experience, and service scope for families to review directly.
          </p>
        ),
      },
      {
        id: "family-4",
        question: "4. Does Silver Directory manually verify caregiver qualifications?",
        answer: (
          <p>
            We currently do not run manual qualification verification before listing. Families should perform their own checks before confirming care arrangements, including identity checks and reviewing relevant credentials directly with the caregiver.
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
        id: "family-5",
        question: "5. Do I have to pay any agency or matching fees?",
        answer: (
          <p>
            No. Silver Directory is 100% free for families. We do not charge matching fees and we do not take commission on caregiver wages. You pay caregivers directly.
          </p>
        ),
      },
      {
        id: "family-6",
        question: "6. How much are caregiver rates?",
        answer: (
          <p>
            Silver Directory does not set rates. Caregivers are independent freelancers and set their own rates based on experience and care complexity. For general pricing context, refer to our{" "}
            <Link href="#estimated-market-rate-guide" className="font-semibold text-[#1f6b93]">
              Estimated Market Rate Guide (Coming soon)
            </Link>
            .
          </p>
        ),
      },
      {
        id: "family-7",
        question: "7. How and when do I make payment to the caregiver?",
        answer: (
          <p>
            Payments are not processed through our website. Method (for example: PayNow, cash) and payment timing (for example: end of shift, weekly) are agreed directly between you and the caregiver before care starts.
          </p>
        ),
      },
      {
        id: "family-8",
        question: "8. Is advance payment required?",
        answer: (
          <p>
            Silver Directory does not require deposits or advance payment. Independent caregivers may have their own policies. A practical approach is to pay at the end of each completed shift until trust is established.
          </p>
        ),
      },
    ],
  },
  {
    id: "arrangements-trust",
    title: "Care Arrangements & Trust",
    items: [
      {
        id: "family-9",
        question: "9. Is there a binding contract between me and the caregiver?",
        answer: (
          <p>
            No. Silver Directory does not impose a minimum contract or lock-in period. You hire caregivers as independent freelancers and can coordinate directly with them if plans change.
          </p>
        ),
      },
      {
        id: "family-10",
        question: "10. Can I change the caregiver if I am dissatisfied?",
        answer: (
          <p>
            Yes. Since there is no lock-in contract from Silver Directory, you can end the private arrangement and contact another caregiver who better fits your needs.
          </p>
        ),
      },
      {
        id: "family-11",
        question: "11. What should I do before the caregiver comes for the first time?",
        answer: (
          <p>
            Before granting home access, do a short 3-minute video call first. This helps you introduce yourself, share the patient condition, and check communication fit before finalizing details.
          </p>
        ),
      },
      {
        id: "family-12",
        question: "12. How do I give feedback or report a caregiver?",
        answer: (
          <p>
            Reach out to platform support if a caregiver is unresponsive, unprofessional, or appears to provide false credentials. Our trust and safety team can review and take action when needed.
          </p>
        ),
      },
    ],
  },
];

export default function FamiliesFAQPage() {
  return (
    <div className="site-shell">
      <SiteHeader />

      <section className="surface-panel page-enter p-6 md:p-8">
        <div>
          <div>
            <p className="eyebrow">FAQ</p>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#10233b] md:text-4xl">
              Frequently Asked Questions (For Families)
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#56677c]">
              Guidance on hiring, payments, and safety when arranging eldercare.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <FAQAccordion sections={FAMILY_FAQ_SECTIONS} />
        </div>

        <div
          id="estimated-market-rate-guide"
          className="mt-8 rounded-xl border border-[#d8e3eb] bg-white/88 p-4 text-sm text-[#52657d]"
        >
          <div className="flex items-center gap-2">
            <p className="font-semibold text-[#1b3753]">Estimated Market Rate Guide</p>
            <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
              Coming soon
            </span>
          </div>
          <p className="mt-2">This guide is not published yet.</p>
        </div>
      </section>
    </div>
  );
}
