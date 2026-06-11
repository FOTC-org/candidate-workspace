import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UserHub",
  description: "User management and analytics platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-gray-50 antialiased">{children}</body>
    </html>
  );
}
