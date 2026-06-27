import Image from "next/image";
import { Container } from "@/components/landing/Container";
import { HeroCta } from "@/components/landing/LandingCta";
import heroImg from "@/public/images/eldercare-hero.png";

export function HeroSection() {
  const featureChips = [
    "Verified profile cues",
    "Direct family chat",
    "No agency commission",
    "Singapore neighbourhoods",
  ];

  return (
    <section className="plum-frame mt-1">
      <div className="overflow-hidden rounded-lg bg-[var(--background)]">
        <Container className="paper-edge relative grid min-h-[660px] items-stretch gap-0 overflow-hidden !px-0 !py-0 lg:grid-cols-[0.96fr_1.04fr]">
          <div className="relative z-10 flex flex-col justify-between bg-[var(--brand-strong)] px-7 py-8 text-white sm:px-10 lg:absolute lg:inset-y-0 lg:left-0 lg:w-[52%] lg:bg-[linear-gradient(90deg,rgba(48,3,31,0.92),rgba(48,3,31,0.62),rgba(48,3,31,0))] lg:px-12 lg:py-12">
            <div className="max-w-[40rem]">
              <span className="inline-flex rounded-full border border-white/25 bg-white/12 px-3 py-1 text-xs font-extrabold uppercase tracking-normal text-[var(--signal)]">
                Care starts with clarity
              </span>
              <h1 className="mt-8 font-display text-[3.35rem] font-semibold leading-[0.98] tracking-normal text-white sm:text-[4.6rem] lg:text-[5.35rem]">
                Helping care find its best{" "}
                <span className="text-[var(--signal)]">match</span>
              </h1>
              <p className="mt-7 max-w-lg text-base font-medium leading-7 text-white/88 sm:text-lg">
                Browse eldercare profiles, compare rates, and message independent caregivers
                directly before arranging care.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-center">
              <HeroCta />
              <div className="hidden items-center gap-3 text-sm font-bold text-white/90 xl:flex">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--signal)] text-[var(--brand)]">
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                    <path d="M8 5v14l11-7-11-7Z" />
                  </svg>
                </span>
                Review caregiver profiles first
              </div>
            </div>
          </div>

          <div className="relative min-h-[360px] lg:col-span-2 lg:min-h-[660px]">
            <Image
              src={heroImg}
              alt="Caregiver supporting an elderly man while a family member coordinates home care in Singapore"
              fill
              priority
              className="object-cover object-center"
              placeholder="blur"
              sizes="(max-width: 1024px) 100vw, 92vw"
            />
            <div className="absolute right-5 bottom-8 left-5 z-10 grid gap-3 sm:grid-cols-2 lg:right-10 lg:left-auto lg:w-[28rem]">
              <div className="rounded-lg border border-white/25 bg-white/90 p-4 text-[var(--brand)] shadow-[var(--shadow-soft)] backdrop-blur">
                <div className="text-3xl font-black leading-none">0%</div>
                <p className="mt-1 text-sm font-bold leading-5 text-[var(--muted)]">
                  wage commission taken from caregivers
                </p>
              </div>
              <div className="rounded-lg border border-white/25 bg-[var(--signal)] p-4 text-[var(--brand)] shadow-[var(--shadow-soft)]">
                <div className="text-3xl font-black leading-none">1:1</div>
                <p className="mt-1 text-sm font-bold leading-5">
                  family-to-caregiver conversations
                </p>
              </div>
            </div>
          </div>
        </Container>

        <Container className="bg-[var(--background)] !pt-9 !pb-10">
          <div className="flex flex-col justify-center">
            <div className="text-center font-display text-2xl font-semibold leading-tight text-[var(--brand)] sm:text-3xl">
              Built for families and independent caregivers across Singapore
            </div>

            <div className="mt-7 flex flex-wrap justify-center gap-3 md:gap-4">
              {featureChips.map((chip) => (
                <span key={chip} className="hero-chip">
                  <span className="hero-chip-dot" aria-hidden="true" />
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </Container>
      </div>
    </section>
  );
}
