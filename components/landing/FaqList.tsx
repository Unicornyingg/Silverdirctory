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
    <Container className="!pt-2 !pb-12">
      <div className="mx-auto w-full max-w-4xl">
        {items.map((item) => (
          <div key={item.question} className="mb-4">
            <details className="rounded-lg border border-[var(--line)] bg-[var(--panel-strong)] shadow-[var(--shadow-soft)]">
              <summary className="flex w-full items-center justify-between gap-4 rounded-lg px-6 py-4 text-left text-lg font-extrabold text-[var(--foreground)] transition hover:bg-[var(--color-warm-surface-soft)]">
                <span>{item.question}</span>
                <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--signal)] text-[var(--brand)]">
                  +
                </span>
              </summary>
              <p className="px-6 pt-3 pb-5 text-base leading-7 text-[var(--muted)]">{item.answer}</p>
            </details>
          </div>
        ))}
      </div>
    </Container>
  );
}
