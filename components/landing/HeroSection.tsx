import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/landing/Container";
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
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-gray-900 lg:text-4xl lg:leading-tight xl:text-6xl xl:leading-tight">
              Find trusted eldercare support directly in your neighborhood
            </h1>
            <p className="copy-soft py-6 text-xl lg:text-xl xl:text-2xl">
              Silver Directory helps families browse caregiver profiles, compare rates, and start
              in-app chat without auto-matching or agency lock-in.
            </p>

            <div className="flex flex-col items-start space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
              <Link
                href="/directory"
                className="primary-btn px-8 py-4 text-center text-lg"
              >
                Find a Caregiver
              </Link>
              <Link
                href="/for-nurses"
                className="primary-btn px-8 py-4 text-center text-lg"
              >
                List Your Care Services
              </Link>
            </div>
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
            />
          </div>
        </div>
      </Container>
      <Container>
        <div className="flex flex-col justify-center">
          <div className="text-center text-xl font-medium text-gray-800">
            Built for <span className="text-indigo-600">families and independent caregivers</span>{" "}
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
