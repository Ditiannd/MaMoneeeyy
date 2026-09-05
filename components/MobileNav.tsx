"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Wallet, Zap, PieChart as PieChartIcon } from 'lucide-react';

export default function MobileNav() {
  const pathname = usePathname();

  const getLinkClasses = (path: string) => {
    const isActive = pathname === path;
    return `flex flex-col items-center justify-center gap-1 p-2 transition-colors ${
      isActive ? "text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
    }`;
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-zinc-900/90 backdrop-blur-xl border-t border-white/10 flex items-center justify-around z-50">
      <Link href="/" className={getLinkClasses('/')}>
        <Home className="h-5 w-5" />
        <span className="text-[10px] font-medium">Home</span>
      </Link>
      <Link href="/transactions" className={getLinkClasses('/transactions')}>
        <Wallet className="h-5 w-5" />
        <span className="text-[10px] font-medium">Txns</span>
      </Link>
      <Link href="/analytics" className={getLinkClasses('/analytics')}>
        <PieChartIcon className="h-5 w-5" />
        <span className="text-[10px] font-medium">Stats</span>
      </Link>
      <Link href="/shortcuts" className={getLinkClasses('/shortcuts')}>
        <Zap className="h-5 w-5" />
        <span className="text-[10px] font-medium">Cmds</span>
      </Link>
    </nav>
  );
}
