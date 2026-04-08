import type { ReactNode } from "react";
import { Container } from "@/components/landing/Container";

type SectionTitleProps = {
  preTitle?: string;
  title?: string;
  align?: "left" | "center";
  children?: ReactNode;
};

export function SectionTitle({
  preTitle,
  title,
  align = "center",
  children,
}: Readonly<SectionTitleProps>) {
  return (
    <Container
      className={`mt-4 flex w-full flex-col ${
        align === "left" ? "" : "items-center justify-center text-center"
      }`}
    >
      {preTitle ? (
        <div className="rounded-full border border-[var(--line)] bg-[var(--panel)] px-4 py-1.5 text-xs font-bold tracking-[0.14em] text-indigo-600 uppercase shadow-[0_6px_16px_rgba(59,40,20,0.05)]">
          {preTitle}
        </div>
      ) : null}

      {title ? (
        <h2 className="mt-4 max-w-2xl text-3xl font-extrabold leading-[1.18] tracking-tight text-gray-900 lg:text-4xl lg:leading-[1.14]">
          {title}
        </h2>
      ) : null}

      {children ? (
        <p className="copy-soft max-w-2xl py-5 text-lg lg:text-xl xl:text-xl">
          {children}
        </p>
      ) : null}
    </Container>
  );
}
