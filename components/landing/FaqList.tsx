import { Container } from "@/components/landing/Container";

type FaqItem = {
  question: string;
  answer: string;
};

type FaqListProps = {
  items: FaqItem[];
};

export function FaqList({ items }: Readonly<FaqListProps>) {
  return (
    <Container className="home-section-surface-soft !p-5 lg:!p-8">
      <div className="mx-auto w-full max-w-3xl rounded-[1.35rem]">
        {items.map((item) => (
          <div key={item.question} className="mb-4">
            <details className="rounded-xl border border-[var(--line)] bg-[var(--panel-strong)] shadow-[0_8px_20px_rgba(59,40,20,0.05)]">
              <summary className="flex w-full items-center justify-between rounded-xl px-5 py-4 text-left text-lg font-semibold text-gray-900 transition hover:bg-[var(--color-warm-surface-soft)]">
                <span>{item.question}</span>
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--color-warm-surface-soft)] text-indigo-500">
                  +
                </span>
              </summary>
              <p className="copy-soft px-5 pt-3 pb-5 text-base">{item.answer}</p>
            </details>
          </div>
        ))}
      </div>
    </Container>
  );
}
