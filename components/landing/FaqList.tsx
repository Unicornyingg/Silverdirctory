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
    <Container className="!p-0">
      <div className="mx-auto w-full max-w-2xl rounded-2xl p-2">
        {items.map((item) => (
          <div key={item.question} className="mb-5">
            <details>
              <summary className="flex w-full items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--panel-strong)] px-4 py-4 text-left text-lg font-semibold text-gray-900 hover:bg-[var(--color-warm-surface-soft)]">
                <span>{item.question}</span>
                <span className="text-indigo-500">+</span>
              </summary>
              <p className="px-4 pt-4 pb-2 text-base text-gray-700">{item.answer}</p>
            </details>
          </div>
        ))}
      </div>
    </Container>
  );
}
