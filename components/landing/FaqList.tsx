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
              <summary className="flex w-full items-center justify-between rounded-lg bg-gray-50 px-4 py-4 text-left text-lg text-gray-800 hover:bg-gray-100">
                <span>{item.question}</span>
                <span className="text-indigo-500">+</span>
              </summary>
              <p className="px-4 pt-4 pb-2 text-gray-500">{item.answer}</p>
            </details>
          </div>
        ))}
      </div>
    </Container>
  );
}
