"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Wallet, PieChart as PieChartIcon, Settings, LogOut, Receipt, Zap } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Sidebar() {
  const pathname = usePathname();

  const getLinkClasses = (path: string) => {
    const isActive = pathname === path;
    if (isActive) {
      return "flex items-center gap-3 px-4 py-3 bg-emerald-500/10 text-emerald-400 rounded-xl font-medium text-sm transition-colors";
    }
    return "flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-zinc-100 rounded-xl font-medium text-sm transition-colors";
  };

  return (
    <aside className="w-[20%] min-w-[240px] border-r border-white/10 bg-zinc-900/30 backdrop-blur-3xl flex flex-col justify-between p-6 z-10 relative">
      <div>
        <div className="flex items-center gap-3 mb-12 px-2">
          <div className="p-1.5 bg-emerald-500 rounded-lg shadow-lg shadow-emerald-500/20">
            <Receipt className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">MaMoneeeyy</h1>
        </div>
        <nav className="space-y-2">
          <Link href="/" className={getLinkClasses('/')}>
            <Home className="h-4 w-4" /> Dashboard
          </Link>
          <Link href="/transactions" className={getLinkClasses('/transactions')}>
            <Wallet className="h-4 w-4" /> Transactions
          </Link>
          <Link href="/analytics" className={getLinkClasses('/analytics')}>
            <PieChartIcon className="h-4 w-4" /> Analytics
          </Link>
          <Link href="/shortcuts" className={getLinkClasses('/shortcuts')}>
            <Zap className="h-4 w-4" /> Command
          </Link>
          <Link href="/settings" className={getLinkClasses('/settings')}>
            <Settings className="h-4 w-4" /> Settings
          </Link>
        </nav>
      </div>
      
      {/* User Profile Snippet */}
      <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors cursor-pointer">
        <Avatar className="h-9 w-9 border border-white/10">
          <AvatarImage src="https://github.com/shadcn.png" />
          <AvatarFallback>RR</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-100 truncate">Raka Ramdhani</p>
          <p className="text-xs text-zinc-500 truncate">Pro Workspace</p>
        </div>
        <LogOut className="h-4 w-4 text-zinc-500 hover:text-zinc-300" />
      </div>
    </aside>
  );
}
