import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Football Stats Agent",
  description: "Qatar 2022 World Cup statistics powered by AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
