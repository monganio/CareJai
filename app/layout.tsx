import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Care-Jai | Azure AI Wellness Demo",
  description: "Thai-first proactive wellness agent demo powered by Microsoft Azure AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
