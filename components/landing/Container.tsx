import type { ReactNode } from "react";

type ContainerProps = {
  children: ReactNode;
  className?: string;
};

export function Container({ children, className = "" }: Readonly<ContainerProps>) {
  return <div className={`container mx-auto p-8 xl:px-0 ${className}`}>{children}</div>;
}
