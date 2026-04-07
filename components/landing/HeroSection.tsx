import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/landing/Container";
import heroImg from "@/public/img/hero.png";

export function HeroSection() {
  return (
    <>
      <Container className="flex flex-wrap">
        <div className="flex w-full items-center lg:w-1/2">
          <div className="mb-8 max-w-2xl">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-gray-800 lg:text-4xl lg:leading-tight xl:text-6xl xl:leading-tight">
              Find trusted eldercare support directly in your neighborhood
            </h1>
            <p className="py-5 text-xl leading-normal text-gray-500 lg:text-xl xl:text-2xl">
              Silver Directory helps families browse caregiver profiles, compare rates, and start
              in-app chat without auto-matching or agency lock-in.
            </p>

            <div className="flex flex-col items-start space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
              <Link
                href="/directory"
                className="rounded-md bg-indigo-600 px-8 py-4 text-center text-lg font-medium text-white"
              >
                Find a Caregiver
              </Link>
              <Link href="/for-nurses" className="flex items-center space-x-2 text-gray-500">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                  +
                </span>
                <span>List Your Care Services</span>
              </Link>
            </div>
          </div>
        </div>
        <div className="flex w-full items-center justify-center lg:w-1/2">
          <Image
            src={heroImg}
            width={616}
            height={617}
            className="object-cover"
            alt="Caregiver directory illustration"
            loading="eager"
            placeholder="blur"
          />
        </div>
      </Container>
      <Container>
        <div className="flex flex-col justify-center">
          <div className="text-center text-xl text-gray-700">
            Built for <span className="text-indigo-600">families and independent caregivers</span>{" "}
            across Singapore
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-3 md:justify-around">
            <span className="rounded-full bg-gray-100 px-4 py-2 text-sm text-gray-600">
              In-app chat first
            </span>
            <span className="rounded-full bg-gray-100 px-4 py-2 text-sm text-gray-600">
              Zero wage commission
            </span>
            <span className="rounded-full bg-gray-100 px-4 py-2 text-sm text-gray-600">
              No auto-matching
            </span>
            <span className="rounded-full bg-gray-100 px-4 py-2 text-sm text-gray-600">
              Hyper-local listings
            </span>
          </div>
        </div>
      </Container>
    </>
  );
}
