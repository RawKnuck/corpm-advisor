import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Machiavelli Advisories",
  description: "Strategic counsel grounded in Machiavellian realism and power dynamics.",
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
