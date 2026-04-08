import Image, { type StaticImageData } from "next/image";
import { cloneElement, type ReactElement, type ReactNode } from "react";
import { Container } from "@/components/landing/Container";

type BenefitBullet = {
  title: string;
  desc: string;
  icon: ReactElement<{ className?: string }>;
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
  return (
    <Container className="mb-20 flex flex-wrap lg:flex-nowrap lg:gap-10">
      <div
        className={`flex w-full items-center justify-center lg:w-1/2 ${
          imgPos === "right" ? "lg:order-1" : ""
        }`}
      >
        <Image
          src={data.image}
          width={data.image.width}
          height={data.image.height}
          alt={data.imageAlt}
          className="h-auto w-full max-w-[560px] rounded-2xl object-contain"
          placeholder="blur"
        />
      </div>

      <div className="flex w-full flex-wrap items-center lg:w-1/2">
        <div>
          <div className="mt-4 flex w-full flex-col">
            <h3 className="mt-3 max-w-2xl text-3xl font-extrabold leading-snug tracking-tight text-gray-900 lg:text-4xl lg:leading-tight">
              {data.title}
            </h3>
            <p className="max-w-2xl py-4 text-lg leading-normal text-gray-700 lg:text-xl xl:text-xl">
              {data.desc}
            </p>
          </div>

          <div className="mt-5 w-full">
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
  icon: ReactElement<{ className?: string }>;
  children: ReactNode;
};

function Benefit({ title, icon, children }: Readonly<BenefitProps>) {
  return (
    <div className="mt-8 flex items-start space-x-3">
      <div className="mt-1 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md bg-indigo-500">
        {cloneElement(icon, {
          className: "h-7 w-7 text-white",
        })}
      </div>
      <div>
        <h4 className="text-xl font-semibold text-gray-900">{title}</h4>
        <p className="mt-1 text-gray-700">{children}</p>
      </div>
    </div>
  );
}
