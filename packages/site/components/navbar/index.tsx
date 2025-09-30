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

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-black/70 backdrop-blur supports-[backdrop-filter]:bg-black/40">
      <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/iso-logo.svg"
              alt="Lunarys"
              width={28}
              height={28}
              className="rounded-md"
              priority
            />
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-cyan-300 to-sky-400 bg-clip-text text-transparent">
              LUNARYS
            </span>
          </Link>
          <nav className="ml-6 hidden md:flex items-center gap-1">
            <Link
              href="/pool"
              className={cn(
                "px-3 py-2 rounded-lg text-sm font-medium transition",
                isActive("/pool")
                  ? "bg-slate-900 text-cyan-300"
                  : "text-slate-300 hover:text-white hover:bg-slate-900"
              )}
            >
              Pool
            </Link>
            <Link
              href="/pool/positions"
              className={cn(
                "px-3 py-2 rounded-lg text-sm font-medium transition",
                isActive("/pool/positions")
                  ? "bg-slate-900 text-cyan-300"
                  : "text-slate-300 hover:text-white hover:bg-slate-900"
              )}
            >
              Positions
            </Link>
          </nav>
        </div>

        {/* Right: Faucet */}
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="secondary"
            className="bg-cyan-600 hover:bg-cyan-500 text-white"
          >
            <a href={FAUCET_URL} target="_blank" rel="noreferrer">
              Faucet
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}
