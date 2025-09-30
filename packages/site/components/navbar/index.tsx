"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FAUCET_URL = "https://faucet.circle.com/";

export default function Navbar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(`${href}/`);

  const navItems = [
    { href: "/pools", label: "Pools" },
    { href: "/pool/positions", label: "Positions" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-900/80 bg-black/60 backdrop-blur-xl supports-[backdrop-filter]:bg-black/40">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/iso-logo.svg"
              alt="Lunarys"
              width={28}
              height={28}
              className="rounded-lg border border-slate-800/80"
              priority
            />
            <span className="text-lg font-semibold tracking-tight text-white">
              LUNARYS
            </span>
          </Link>

          <nav className="hidden items-center gap-1 rounded-full border border-slate-900/80 bg-slate-950/70 px-1 py-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-4 py-1.5 text-sm font-medium transition",
                  "rounded-full",
                  isActive(item.href)
                    ? "bg-cyan-600 text-white shadow-[0_0_12px_rgba(8,145,178,0.35)]"
                    : "text-slate-300 hover:text-white hover:bg-slate-900"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: Faucet */}
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="secondary"
            className="bg-cyan-600/90 text-white transition hover:bg-cyan-500"
          >
            <a href={FAUCET_URL} target="_blank" rel="noreferrer">
              Faucet
            </a>
          </Button>
        </div>
      </div>
      <nav className="border-t border-slate-900/80 bg-black/80 px-4 py-2 md:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 rounded-full px-3 py-2 text-center text-sm font-medium transition",
                isActive(item.href)
                  ? "bg-cyan-600 text-white shadow-[0_0_12px_rgba(8,145,178,0.35)]"
                  : "text-slate-300 hover:text-white hover:bg-slate-900"
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
