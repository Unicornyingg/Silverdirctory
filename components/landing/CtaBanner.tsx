import Image from "next/image";
import { Container } from "@/components/landing/Container";
import { BannerCta } from "@/components/landing/LandingCta";
import caregiverImg from "@/public/images/direct-caregiver-discovery.png";

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

        <div className="grid items-center gap-7 md:grid-cols-[0.9fr_1fr]">
          <div className="relative min-h-[260px] overflow-hidden rounded-lg border border-white/15 bg-white/10">
            <Image
              src={caregiverImg}
              alt="Family reviewing caregiver options together"
              fill
              className="object-cover object-center"
              placeholder="blur"
              sizes="(max-width: 768px) 100vw, 38vw"
            />
          </div>
          <div>
            <h2 className="font-display text-4xl font-semibold leading-[1.04] tracking-normal text-white lg:text-5xl">
              Helping every care conversation start with trust.
            </h2>
            <div className="mt-8 grid grid-cols-2 gap-5">
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
        </div>
      </Container>
    </section>
  );
}
