import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { AppKit } from "./Reown";
import Navbar from "@/components/navbar";

export const metadata: Metadata = {
  title: "Zama FHEVM SDK Quickstart",
  description: "Zama FHEVM SDK Quickstart app",
  icons: {
    icon: "/iso-logo.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`bg-black text-foreground antialiased`}>
        <AppKit>
          <Providers>
            <Navbar />
            {children}
          </Providers>
        </AppKit>
      </body>
    </html>
  );
}
