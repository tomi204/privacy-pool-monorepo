import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import Image from "next/image";
import { AppKit } from "./Reown";

export const metadata: Metadata = {
  title: "Zama FHEVM SDK Quickstart",
  description: "Zama FHEVM SDK Quickstart app",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`lunarys-bg text-foreground antialiased`}>
        <AppKit>
          <div className="fixed inset-0 w-full h-full lunarys-bg z-[-20] min-w-[850px]"></div>
          <main className="flex flex-col max-w-screen-lg mx-auto pb-20 min-w-[850px]">
            <nav className="flex w-full px-3 md:px-0 h-fit py-10 justify-between items-center">
              <Image
                src="/iso-logo.svg"
                alt="Lunarys"
                width={120}
                height={120}
              />
            </nav>
            <Providers>{children}</Providers>
          </main>
        </AppKit>
      </body>
    </html>
  );
}
