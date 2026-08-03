import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Space Krafters Finance Tracker",
  description: "Personal and business finance visibility for Owner and Accountant.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
