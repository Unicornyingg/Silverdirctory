import Image, { type StaticImageData } from "next/image";
import type { ReactNode } from "react";
import { Container } from "@/components/landing/Container";

type TestimonialItem = {
  quote: ReactNode;
  name: string;
  title: string;
  image: StaticImageData;
};

type TestimonialsProps = {
  items: TestimonialItem[];
};

export function Testimonials({ items }: Readonly<TestimonialsProps>) {
  return (
    <Container className="home-section-surface-soft py-7 lg:py-9">
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {items.map((item, index) => (
          <div
            key={item.name}
            className={index === 0 ? "lg:col-span-2 xl:col-auto" : ""}
          >
            <div className="flex h-full w-full flex-col justify-between rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--panel-strong)] px-6 py-7 shadow-[var(--shadow-soft)] sm:px-8 sm:py-9 lg:px-10 lg:py-10">
              <p className="font-display text-lg leading-[1.55] text-[var(--foreground)] sm:text-xl">{item.quote}</p>
              <Avatar image={item.image} name={item.name} title={item.title} />
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
}

type AvatarProps = {
  image: StaticImageData;
  name: string;
  title: string;
};

function Avatar({ image, name, title }: Readonly<AvatarProps>) {
  return (
    <div className="mt-8 flex items-center space-x-3">
      <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-full">
        <Image src={image} width={56} height={56} alt={`${name} avatar`} placeholder="blur" />
      </div>
      <div>
        <div className="text-lg font-semibold text-gray-900">{name}</div>
        <div className="text-gray-700">{title}</div>
      </div>
    </div>
  );
}

export function Mark({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <mark className="rounded bg-[var(--accent-soft)] text-[var(--accent-strong)] ring-4 ring-[var(--accent-soft)]">
      {children}
    </mark>
  );
}
