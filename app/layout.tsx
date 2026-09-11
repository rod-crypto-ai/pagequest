import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PageQuest — Reading becomes an adventure",
  description: "A calm, visual reading-comprehension experience for young readers and the adults who support them.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
