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
        <h2 className="mt-4 max-w-2xl font-display text-3xl font-semibold leading-[1.14] tracking-[-0.01em] text-[var(--foreground)] lg:text-[2.6rem] lg:leading-[1.1]">
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
