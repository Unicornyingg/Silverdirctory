import { Container } from "@/components/landing/Container";
import { BannerCta } from "@/components/landing/LandingCta";

export function CtaBanner() {
  return (
    <Container>
      <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-5 rounded-[1.7rem] border border-indigo-300/55 bg-gradient-to-br from-indigo-700 to-indigo-600 px-7 py-7 text-white shadow-[0_18px_36px_rgba(67,56,202,0.3)] lg:flex-nowrap lg:px-12 lg:py-12">
        <div className="flex-grow text-center lg:text-left">
          <h2 className="text-2xl font-semibold lg:text-3xl">
            Ready to find or offer eldercare support?
          </h2>
          <p className="mt-2 text-white lg:text-xl">
            Join Silver Directory and connect directly without agency lock-in.
          </p>
        </div>
        <BannerCta />
      </div>
    </Container>
  );
}
