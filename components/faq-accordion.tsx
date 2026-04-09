"use client";

import { useState, type ReactNode } from "react";

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
  const [openBySection, setOpenBySection] = useState<Record<string, string | null>>(() => {
    const initial: Record<string, string | null> = {};
    for (const section of sections) {
      initial[section.id] = section.items[0]?.id ?? null;
    }
    return initial;
  });

  function toggleItem(sectionId: string, itemId: string) {
    setOpenBySection((previous) => ({
      ...previous,
      [sectionId]: previous[sectionId] === itemId ? null : itemId,
    }));
  }

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <section key={section.id} className="space-y-3">
          <h2 className="text-xl font-bold text-[#10243b]">{section.title}</h2>
          <div className="space-y-3">
            {section.items.map((item) => {
              const panelId = `faq-panel-${section.id}-${item.id}`;
              const triggerId = `faq-trigger-${section.id}-${item.id}`;
              const isOpen = openBySection[section.id] === item.id;

              return (
                <div
                key={item.id}
                className="group overflow-hidden rounded-xl border border-[#d8e3eb] bg-white/92 shadow-[0_8px_20px_rgba(15,36,58,0.06)]"
              >
                  <button
                    id={triggerId}
                    type="button"
                    onClick={() => toggleItem(section.id, item.id)}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className="faq-summary w-full text-left transition hover:bg-[#f7fbff]"
                  >
                    <span>{item.question}</span>
                    <span className="faq-summary-icon" aria-hidden="true">
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>
                  {isOpen && (
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={triggerId}
                      className="border-t border-[#e4ecf2] bg-white/86 px-4 py-3 text-sm leading-7 text-[#3a536d]"
                    >
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
