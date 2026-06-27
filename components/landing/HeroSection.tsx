import Image from "next/image";
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
    <section className="relative">
      {/* Full-bleed hero photo — spans the entire page width, no frame */}
      <div className="paper-edge relative overflow-hidden">
        <Image
          src={heroImg}
          alt="Caregiver supporting an elderly woman in a Singapore park while a family member coordinates home care"
          fill
          priority
          className="object-cover object-[50%_45%]"
          placeholder="blur"
          sizes="100vw"
        />
        {/* Left-side plum scrim keeps the headline readable without dimming the people. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(100deg,rgba(48,3,31,0.82)_0%,rgba(48,3,31,0.64)_24%,rgba(48,3,31,0.28)_43%,rgba(48,3,31,0.08)_62%,rgba(48,3,31,0.02)_100%)]"
        />
        {/* Top scrim so the overlaid navigation stays legible */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-44 bg-[linear-gradient(to_bottom,rgba(48,3,31,0.42),rgba(48,3,31,0.12)_55%,transparent)]"
        />

        <div className="relative z-10 flex min-h-[640px] max-w-none flex-col justify-between gap-10 px-6 pb-12 pt-28 text-white sm:min-h-[700px] sm:px-10 sm:pt-32 lg:min-h-[780px] lg:px-16 lg:pb-16 lg:pt-36 2xl:px-20">
          <div className="max-w-[34rem] xl:max-w-[36rem]">
            <span className="inline-flex rounded-full border border-white/25 bg-white/12 px-3 py-1 text-xs font-extrabold uppercase tracking-normal text-[var(--signal)]">
              Care starts with clarity
            </span>
            <h1 className="mt-7 font-display text-[3rem] font-semibold leading-[0.98] tracking-normal text-white sm:text-[4.2rem] lg:text-[4.65rem]">
              Helping care find its best{" "}
              <span
                className="inline-flex translate-y-[0.04em] items-center align-middle text-[var(--accent)]"
                aria-hidden="true"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-[0.7em] w-[0.7em]">
                  <path d="M9.5 2h5v7h7v5h-7v7h-5v-7h-7V9h7z" />
                </svg>
              </span>{" "}
              match
            </h1>
            <p className="mt-6 max-w-lg text-base font-medium leading-7 text-white/90 sm:text-lg">
              Browse eldercare profiles, compare rates, and message independent caregivers
              directly before arranging care.
            </p>

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

          <div className="grid gap-3 sm:ml-auto sm:w-[27rem] sm:grid-cols-2">
            <div className="rounded-lg border border-white/25 bg-white/92 p-4 text-[var(--brand)] shadow-[var(--shadow-soft)] backdrop-blur">
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
      </div>

      {/* Intro strip on the cream background, below the photo */}
      <div className="mx-auto max-w-7xl px-5 pb-2 pt-10 sm:px-6 lg:px-8">
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
    </section>
  );
}
