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
        <div className="text-sm font-bold tracking-wider text-indigo-600 uppercase">{preTitle}</div>
      ) : null}

      {title ? (
        <h2 className="mt-3 max-w-2xl text-3xl font-bold leading-snug tracking-tight text-gray-800 lg:text-4xl lg:leading-tight">
          {title}
        </h2>
      ) : null}

      {children ? (
        <p className="max-w-2xl py-4 text-lg leading-normal text-gray-500 lg:text-xl xl:text-xl">
          {children}
        </p>
      ) : null}
    </Container>
  );
}
