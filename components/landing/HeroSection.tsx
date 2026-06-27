import Image from "next/image";
import { Container } from "@/components/landing/Container";
import { HeroCta } from "@/components/landing/LandingCta";
import heroImg from "@/public/images/eldercare-hero.png";

export function HeroSection() {
  const featureChips = [
    "In-app chat first",
    "Zero wage commission",
    "No auto-matching",
    "Hyper-local listings",
  ];

  return (
    <>
      <Container className="flex flex-wrap items-center">
        <div className="flex w-full items-center lg:w-1/2">
          <div className="mb-8 max-w-2xl lg:pr-8">
            <h1 className="font-display text-4xl font-semibold leading-[1.08] tracking-[-0.01em] text-[var(--foreground)] lg:text-5xl lg:leading-[1.06] xl:text-6xl xl:leading-[1.04]">
              Find trusted eldercare support, right in your neighbourhood
            </h1>
            <p className="copy-soft py-6 text-lg lg:text-xl">
              Browse caregiver profiles, compare rates, and message directly. No auto-matching,
              no agency lock-in, no commission skimmed from wages.
            </p>

            <HeroCta />
          </div>
        </div>
        <div className="flex w-full items-center justify-center lg:w-1/2">
          <div className="image-frame w-full max-w-[640px]">
            <Image
              src={heroImg}
              width={heroImg.width}
              height={heroImg.height}
              className="h-auto w-full rounded-[1.45rem] object-contain"
              alt="Nurse supporting an elderly man while a family member coordinates home care in Singapore"
              loading="eager"
              placeholder="blur"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>
      </Container>
      <Container>
        <div className="flex flex-col justify-center">
          <div className="text-center text-lg font-medium text-[var(--muted)]">
            Built for <span className="font-semibold text-[var(--accent-strong)]">families and independent caregivers</span>{" "}
            across Singapore
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3 md:gap-4">
            {featureChips.map((chip) => (
              <span key={chip} className="hero-chip">
                <span className="hero-chip-dot" aria-hidden="true" />
                {chip}
              </span>
            ))}
          </div>
        </div>
      </Container>
    </>
  );
}
