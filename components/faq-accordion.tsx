import type { ReactNode } from "react";

export type FAQItem = {
  id: string;
  question: string;
  answer: ReactNode;
};

export type FAQSection = {
  id: string;
  title: string;
  items: FAQItem[];
};

export default function FAQAccordion({ sections }: { sections: FAQSection[] }) {
  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <section key={section.id} className="space-y-3">
          <h2 className="text-xl font-bold text-[#10243b]">{section.title}</h2>
          <div className="space-y-3">
            {section.items.map((item, index) => (
              <details
                key={item.id}
                open={index === 0}
                className="group overflow-hidden rounded-xl border border-[#d8e3eb] bg-white/92 shadow-[0_8px_20px_rgba(15,36,58,0.06)]"
              >
                <summary className="faq-summary transition hover:bg-[#f7fbff]">
                  <span>{item.question}</span>
                  <span className="faq-summary-icon" aria-hidden="true">
                    +
                  </span>
                </summary>
                <div className="border-t border-[#e4ecf2] bg-white/86 px-4 py-3 text-sm leading-7 text-[#3a536d]">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
