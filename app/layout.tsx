import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "News Video Maker",
  description: "Create engaging news videos with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
