import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HyperDash",
  description: "Your reactive personal dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-mono">
        {children}
      </body>
    </html>
  );
}

