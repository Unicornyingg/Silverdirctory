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
        <div className={`eyebrow ${align === "center" ? "justify-center" : ""}`}>
          {preTitle}
        </div>
      ) : null}

      {title ? (
        <h2 className="mt-5 max-w-4xl font-display text-4xl font-semibold leading-[1.04] tracking-normal text-[var(--foreground)] lg:text-[4.25rem]">
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
