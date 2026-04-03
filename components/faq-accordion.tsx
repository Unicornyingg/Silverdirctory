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
            {section.items.map((item) => (
              <details
                key={item.id}
                className="group overflow-hidden rounded-xl border border-[#d8e3eb] bg-white/92"
              >
                <summary className="cursor-pointer px-4 py-3 text-base font-semibold text-[#1c3652]">
                  {item.question}
                </summary>
                <div className="border-t border-[#e4ecf2] px-4 py-3 text-sm leading-7 text-[#4e637c]">
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
