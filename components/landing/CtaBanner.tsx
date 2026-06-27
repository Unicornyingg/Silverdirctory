import { Container } from "@/components/landing/Container";
import { BannerCta } from "@/components/landing/LandingCta";

export function CtaBanner() {
  return (
    <Container>
      <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-5 rounded-[1.4rem] bg-[var(--brand)] px-7 py-8 text-[#f3ece0] shadow-[var(--shadow-soft-lg)] lg:flex-nowrap lg:px-12 lg:py-12">
        <div className="flex-grow text-center lg:text-left">
          <h2 className="font-display text-2xl font-semibold leading-tight lg:text-[2rem]">
            Ready to find or offer eldercare support?
          </h2>
          <p className="mt-2.5 text-[#e3ddd0] lg:text-lg">
            Join Silver Directory and connect directly &mdash; without agency lock-in.
          </p>
        </div>
        <BannerCta />
      </div>
    </Container>
  );
}
