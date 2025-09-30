"use client";
import { ReactNode, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Image from "next/image";

export function PoolShell({
  address,
  headerRight,
  swap,
  provide,
}: {
  address: `0x${string}`;
  headerRight?: ReactNode;
  swap: ReactNode;
  provide: ReactNode;
}) {
  const [tab, setTab] = useState("swap");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-cyan-300/15 border border-cyan-300/30 flex items-center justify-center p-2">
            <Image
              src="/iso-logo.svg"
              alt="LUNARYS"
              width={40}
              height={40}
              className="object-contain"
            />
          </div>
          <div>
            <div className="text-xl font-extrabold bg-gradient-to-r from-cyan-300 to-sky-300 bg-clip-text text-transparent">
              LUNARYS Pool
            </div>
            <div className="text-[10px] text-slate-500">{address}</div>
          </div>
        </div>
        {headerRight}
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="swap">Swap</TabsTrigger>
          <TabsTrigger value="provide">Provide Liquidity</TabsTrigger>
        </TabsList>
        <TabsContent value="swap" className="mt-4">
          {swap}
        </TabsContent>
        <TabsContent value="provide" className="mt-4">
          {provide}
        </TabsContent>
      </Tabs>
    </div>
  );
}
