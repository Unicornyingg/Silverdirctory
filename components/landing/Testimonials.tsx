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
    <Container className="home-section-surface-soft py-6 lg:py-8">
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {items.map((item, index) => (
          <div
            key={item.name}
            className={index === 0 ? "lg:col-span-2 xl:col-auto" : ""}
          >
            <div className="flex h-full w-full flex-col justify-between rounded-[1.4rem] border border-[var(--line)] bg-[var(--panel-strong)] px-8 py-8 shadow-[0_10px_26px_rgba(59,40,20,0.07)] lg:px-10 lg:py-10">
              <p className="text-2xl leading-[1.48] text-gray-900">{item.quote}</p>
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
    <mark className="rounded-md bg-indigo-100 text-indigo-800 ring-4 ring-indigo-100/80">
      {children}
    </mark>
  );
}
