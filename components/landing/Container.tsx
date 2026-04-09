import type { ReactNode } from "react";

type ContainerProps = {
  children: ReactNode;
  className?: string;
};

export function Container({ children, className = "" }: Readonly<ContainerProps>) {
  return (
    <div className={`container mx-auto px-4 py-6 sm:px-6 lg:px-8 xl:px-10 ${className}`}>
      {children}
    </div>
  );
}
