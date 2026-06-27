import { Container } from "@/components/landing/Container";
import { BannerCta } from "@/components/landing/LandingCta";

export function CtaBanner() {
  return (
    <section className="mt-10 bg-[var(--brand-strong)] text-white">
      <Container className="grid items-center gap-8 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:py-16">
        <div>
          <p className="max-w-sm text-sm font-bold leading-6 text-white/72">
            At the heart of Silver Directory is a simple promise: make care easier to
            compare, safer to discuss, and fairer for independent caregivers.
          </p>
          <div className="mt-7">
            <BannerCta />
          </div>
        </div>

        <div>
          <h2 className="max-w-2xl font-display text-4xl font-semibold leading-[1.04] tracking-normal text-white lg:text-5xl">
            Helping every care conversation start with trust.
          </h2>
          <div className="mt-8 grid max-w-lg grid-cols-2 gap-5">
            <div>
              <div className="text-4xl font-black text-[var(--signal)]">100%</div>
              <p className="mt-1 text-sm font-bold text-white/72">direct arrangements</p>
            </div>
            <div>
              <div className="text-4xl font-black text-[var(--signal)]">0</div>
              <p className="mt-1 text-sm font-bold text-white/72">wage commissions</p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
