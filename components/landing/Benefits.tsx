import Image, { type StaticImageData } from "next/image";
import { type ReactElement, type ReactNode } from "react";
import { Container } from "@/components/landing/Container";

type BenefitBullet = {
  title: string;
  desc: string;
  icon: ReactElement;
};

type BenefitData = {
  title: string;
  desc: string;
  image: StaticImageData;
  imageAlt: string;
  bullets: BenefitBullet[];
};

type BenefitsProps = {
  imgPos?: "left" | "right";
  data: BenefitData;
};

export function Benefits({ imgPos, data }: Readonly<BenefitsProps>) {
  const imageRight = imgPos === "right";

  return (
    <Container className="mb-6 grid items-center gap-10 py-12 lg:mb-10 lg:grid-cols-2 lg:py-16">
      <div
        className={`flex w-full items-center justify-center ${
          imageRight ? "lg:order-1" : ""
        }`}
      >
        <div className="w-full max-w-[560px]">
          <Image
            src={data.image}
            width={data.image.width}
            height={data.image.height}
            alt={data.imageAlt}
            className="h-auto w-full rounded-lg object-contain shadow-[var(--shadow-soft)]"
            placeholder="blur"
          />
        </div>
      </div>

      <div className="flex w-full flex-wrap items-center">
        <div>
          <div className="mt-2 flex w-full flex-col">
            <span className="eyebrow w-fit">
              {imageRight ? "Caregiver control" : "Family confidence"}
            </span>
            <h3 className="mt-5 max-w-2xl font-display text-4xl font-semibold leading-[1.03] tracking-normal text-[var(--foreground)] lg:text-[4rem]">
              {data.title}
            </h3>
            <p className="copy-soft max-w-2xl py-6 text-lg lg:text-xl xl:text-xl">
              {data.desc}
            </p>
          </div>

          <div className="mt-2 w-full border-y border-[var(--line)]">
            {data.bullets.map((item) => (
              <Benefit key={item.title} title={item.title} icon={item.icon}>
                {item.desc}
              </Benefit>
            ))}
          </div>
        </div>
      </div>
    </Container>
  );
}

type BenefitProps = {
  title: string;
  icon: ReactElement;
  children: ReactNode;
};

function Benefit({ title, icon, children }: Readonly<BenefitProps>) {
  return (
    <div className="flex items-start gap-4 border-b border-[var(--line)] py-5 last:border-b-0">
      <div className="mt-0.5 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--panel-strong)] text-[var(--accent-strong)] shadow-[var(--shadow-soft)] [&_svg]:h-6 [&_svg]:w-6 [&_svg]:fill-none [&_svg]:stroke-current">
        {icon}
      </div>
      <div>
        <h4 className="text-lg font-extrabold text-[var(--foreground)]">{title}</h4>
        <p className="copy-soft mt-1.5">{children}</p>
      </div>
    </div>
  );
}
