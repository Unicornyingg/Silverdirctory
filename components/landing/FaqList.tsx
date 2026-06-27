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
    <Container className="home-section-surface-soft !p-6 lg:!p-9">
      <div className="mx-auto w-full max-w-3xl rounded-[1.35rem]">
        {items.map((item) => (
          <div key={item.question} className="mb-4">
            <details className="rounded-xl border border-[var(--line)] bg-[var(--panel-strong)]">
              <summary className="flex w-full items-center justify-between rounded-xl px-6 py-4 text-left text-lg font-semibold text-[var(--foreground)] transition hover:bg-[var(--color-warm-surface-soft)]">
                <span>{item.question}</span>
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--color-warm-surface-soft)] text-[var(--accent-strong)]">
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
