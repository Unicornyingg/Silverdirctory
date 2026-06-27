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
  const cardStyles = [
    "bg-[var(--pink-soft)]",
    "bg-[var(--signal)]",
    "bg-[var(--peach-soft)]",
  ];

  return (
    <Container className="py-7 lg:py-9">
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {items.map((item, index) => (
          <div
            key={item.name}
            className={index === 0 ? "lg:col-span-2 xl:col-auto" : ""}
          >
            <div className={`flex h-full w-full flex-col justify-between rounded-lg border border-[var(--line)] px-6 py-7 shadow-[var(--shadow-soft)] sm:px-8 sm:py-9 lg:px-9 lg:py-10 ${cardStyles[index % cardStyles.length]}`}>
              <div className="font-display text-4xl leading-none text-[var(--accent)]" aria-hidden="true">
                &ldquo;
              </div>
              <p className="mt-3 font-display text-lg leading-[1.5] text-[var(--foreground)] sm:text-xl">{item.quote}</p>
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
      <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full border-2 border-white">
        <Image src={image} width={56} height={56} alt={`${name} avatar`} placeholder="blur" />
      </div>
      <div>
        <div className="text-base font-extrabold text-[var(--foreground)]">{name}</div>
        <div className="text-sm font-semibold text-[var(--muted)]">{title}</div>
      </div>
    </div>
  );
}

export function Mark({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <mark className="rounded bg-white/70 text-[var(--brand)] ring-4 ring-white/70">
      {children}
    </mark>
  );
}
