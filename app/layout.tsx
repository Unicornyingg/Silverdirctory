import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Silver Directory",
  description:
    "A verification-first directory where families connect with licensed nurses for geriatric care.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased text-[15px] md:text-[16px]">{children}</body>
    </html>
  );
}
