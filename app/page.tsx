"use client";

import Link from 'next/link';

import React, { useState, useEffect, useCallback, memo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { ArrowDownRight, ArrowUpRight, Coffee, Car, Zap, Clapperboard, ShoppingBag, Heart, MoreHorizontal, LineChart, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IconRenderer } from "@/components/IconRenderer";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const COLORS = ['#34d399', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Food & Beverage': return <Coffee className="h-3 w-3" />;
    case 'Transport': return <Car className="h-3 w-3" />;
    case 'Utilities': return <Zap className="h-3 w-3" />;
    case 'Entertainment': return <Clapperboard className="h-3 w-3" />;
    case 'Shopping': return <ShoppingBag className="h-3 w-3" />;
    case 'Health': return <Heart className="h-3 w-3" />;
    case 'Income': return <LineChart className="h-3 w-3" />;
    default: return <MoreHorizontal className="h-3 w-3" />;
  }
};

const getCategoryColor = (category: string) => {
  if (category === 'Income') return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
  switch (category) {
    case 'Food & Beverage': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    case 'Transport': return 'bg-sky-500/10 text-sky-400 border border-sky-500/20';
    case 'Utilities': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    case 'Entertainment': return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
    case 'Shopping': return 'bg-pink-500/10 text-pink-400 border border-pink-500/20';
    case 'Health': return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
    default: return 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20';
  }
};



const darkCard = "bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl";

const DashboardWalletCard = memo(({
  wallet,
  isSelected,
  onSelect
}: {
  wallet: any,
  isSelected: boolean,
  onSelect: (id: string) => void
}) => {
  return (
    <div 
      onClick={() => onSelect(wallet.id)}
      className={`relative p-5 rounded-2xl overflow-hidden flex flex-col justify-between min-h-[120px] mb-4 text-white shadow-lg transition-all duration-300 cursor-pointer ${isSelected ? 'ring-2 ring-white/50 scale-105 shadow-white/10' : 'hover:scale-105'}`}
      style={{
        background: wallet.gradient_from && wallet.gradient_to 
          ? `linear-gradient(to bottom right, ${wallet.gradient_from}, ${wallet.gradient_to})`
          : '#27272a'
      }}
    >
      <div className="absolute -right-6 -bottom-6 opacity-20 text-white pointer-events-none">
        <Zap className="w-28 h-28" />
      </div>
      <div className="relative z-10 flex justify-between items-start mb-6">
        <div>
          <p className="text-white/80 text-xs font-medium mb-1">{wallet.type === 'bank' ? 'Bank Account' : wallet.type === 'ewallet' ? 'E-Wallet' : 'Cash'}</p>
          <p className="font-bold text-sm tracking-wide">{wallet.name}</p>
        </div>
        <IconRenderer name={wallet.icon} className="h-5 w-5 text-white/90" />
      </div>
      <div className="relative z-10">
        <p className="text-white/80 text-xs font-medium mb-1">Balance</p>
        <p className="text-xl font-extrabold tracking-tight">Rp {(wallet.current_balance || 0).toLocaleString('id-ID')}</p>
      </div>
    </div>
  );
});
DashboardWalletCard.displayName = 'DashboardWalletCard';

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [wallets, setWallets] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    fetch('/api/dashboard-data?limit=5')
      .then(res => res.json())
      .then(data => {
        if (data.wallets) setWallets(data.wallets);
        if (data.transactions) setTransactions(data.transactions);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });

    // Supabase Realtime Subscription for new transactions
    const channel = supabase
      .channel('public:transactions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions' },
        (payload) => {
          setTransactions((prev) => [payload.new, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'wallets' },
        (payload) => {
          setWallets((currentWallets) =>
            currentWallets.map((wallet) =>
              wallet.id === payload.new.id ? { ...wallet, ...payload.new } : wallet
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSelectWallet = useCallback((id: string) => {
    setSelectedWalletId(prev => prev === id ? null : id);
  }, []);

  if (!mounted) return null;

  // --- Derived State ---
  const filteredTransactions = selectedWalletId 
    ? transactions.filter(tx => tx.wallet_id === selectedWalletId) 
    : transactions;

  const totalBalance = wallets.reduce((acc, w) => acc + (w.current_balance || 0), 0);
  
  const currentMonth = new Date().toISOString().slice(0, 7);
  const totalSpent = filteredTransactions
    .filter(tx => tx.type === 'expense' && tx.transaction_date.startsWith(currentMonth))
    .reduce((acc, tx) => acc + tx.amount, 0);

  const pieMap = filteredTransactions
    .filter(tx => tx.type === 'expense')
    .reduce((acc, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
      return acc;
    }, {} as Record<string, number>);
  const pieData = Object.keys(pieMap).map(key => ({ name: key, value: pieMap[key] }));

  const areaMap: Record<string, { income: number, expense: number }> = {};
  filteredTransactions.forEach(tx => {
    const d = tx.transaction_date.slice(5, 10); // MM-DD
    if (!areaMap[d]) areaMap[d] = { income: 0, expense: 0 };
    if (tx.type === 'expense') areaMap[d].expense += tx.amount;
    else areaMap[d].income += tx.amount;
  });
  const areaData = Object.keys(areaMap).sort().map(d => ({ date: d, ...areaMap[d] })).slice(-7);
  if (areaData.length === 0) areaData.push({ date: 'No Data', income: 0, expense: 0 });
  if (pieData.length === 0) pieData.push({ name: 'No Expenses', value: 1 });

  return (
    <>
      {/* CENTER COLUMN (55%) */}
      <main className="w-full md:w-[55%] flex-1 overflow-y-auto p-4 md:p-8 z-10 scrollbar-hide">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">Financial Overview</h2>
            <p className="text-zinc-400 text-sm mt-1">Track your daily cashflow across all wallets.</p>
          </div>
          {isLoading && <Loader2 className="h-5 w-5 text-emerald-400 animate-spin" />}
        </header>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className={`${darkCard} p-5`}>
            <p className="text-xs font-medium text-zinc-400 mb-2">Total Balance</p>
            <div className="text-xl font-bold text-zinc-100 mb-2">Rp {totalBalance.toLocaleString('id-ID')}</div>
            <p className="text-[10px] text-emerald-400 font-medium">All connected wallets</p>
          </div>
          <div className={`${darkCard} p-5`}>
            <p className="text-xs font-medium text-zinc-400 mb-2">Total Spent (This Month)</p>
            <div className="text-xl font-bold text-zinc-100 mb-2">Rp {totalSpent.toLocaleString('id-ID')}</div>
            <p className="text-[10px] text-zinc-500 font-medium flex items-center">
              <ArrowDownRight className="h-3 w-3 mr-0.5 text-rose-400" /> Based on recorded expenses
            </p>
          </div>
          <div className={`${darkCard} p-5 relative overflow-hidden`}>
            <div className="absolute -top-4 -right-4 p-4 opacity-5 transform rotate-12">
              <Zap className="h-24 w-24 text-zinc-100" />
            </div>
            <p className="text-xs font-medium text-emerald-400 mb-2">AI & Webhooks</p>
            <div className="text-xl font-bold text-zinc-100 mb-2">Standby</div>
            <p className="text-[10px] text-zinc-400 flex items-center font-medium gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Listening for Telegram...
            </p>
          </div>
        </div>

        {/* Multi-Line Area Chart */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-zinc-100 mb-1">Cashflow Trend</h3>
          <p className="text-xs text-zinc-500 mb-4">Income vs Expenses over recent transactions.</p>
          
          <div className={`${darkCard} p-5 h-[300px] w-full`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" strokeOpacity={0.5} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 10}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 10}} dx={0} tickFormatter={(val) => "Rp " + (val/1000) + "k"} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: '1px solid #3f3f46', background: '#18181b', color: '#f4f4f5' }}
                  itemStyle={{ fontSize: '12px' }}
                  labelStyle={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '4px' }}
                  formatter={(val) => ["Rp " + Number(val ?? 0).toLocaleString('id-ID')]}
                />
                <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Transactions */}
        <div>
          <h3 className="text-sm font-semibold text-zinc-100 mb-4">
            {selectedWalletId 
              ? `Recent Transactions - ${wallets.find(w => w.id === selectedWalletId)?.name || 'Wallet'}` 
              : 'Recent Transactions - All Wallets'}
          </h3>
          <div className={`${darkCard} overflow-x-auto`}>
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-zinc-500 font-medium text-[10px] h-10 uppercase tracking-widest">Merchant</TableHead>
                  <TableHead className="text-zinc-500 font-medium text-[10px] h-10 uppercase tracking-widest">Wallet</TableHead>
                  <TableHead className="text-zinc-500 font-medium text-[10px] h-10 uppercase tracking-widest">Category</TableHead>
                  <TableHead className="text-zinc-500 font-medium text-[10px] h-10 uppercase tracking-widest text-center">Type</TableHead>
                  <TableHead className="text-right text-zinc-500 font-medium text-[10px] h-10 uppercase tracking-widest">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((tx) => {
                  const walletName = tx.wallets ? tx.wallets.name : 'Unknown';
                  return (
                  <TableRow key={tx.id} className="border-white/5 hover:bg-white/10 transition-colors">
                    <TableCell className="py-3.5 align-middle">
                      <div className="flex items-center gap-3.5">
                        <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-zinc-200 font-semibold text-sm border border-white/10 shadow-sm">
                          {tx.merchant_name.charAt(0)}
                        </div>
                        <div className="flex flex-col justify-center">
                          <p className="font-semibold text-[13px] text-zinc-100 leading-none mb-1.5">{tx.merchant_name}</p>
                          <p className="text-[11px] text-zinc-500 leading-none">
                            {tx.transaction_date 
                              ? new Intl.DateTimeFormat('id-ID', {
                                  day: '2-digit', month: 'short', year: 'numeric',
                                  hour: '2-digit', minute: '2-digit'
                                }).format(new Date(tx.transaction_date)).replace(/\./g, ':')
                              : '-'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3.5 align-middle">
                      <div className="inline-flex items-center justify-center text-[10px] font-semibold text-zinc-300 border border-white/20 bg-white/5 px-2.5 py-1 rounded-full shadow-sm tracking-wide">
                        {walletName}
                      </div>
                    </TableCell>
                    <TableCell className="py-3.5 align-middle">
                      <div className={"inline-flex items-center justify-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full shadow-sm tracking-wide " + getCategoryColor(tx.category)}>
                        {getCategoryIcon(tx.category)}
                        <span>{tx.category}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3.5 align-middle text-center">
                      <div className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full shadow-sm text-[10px] font-semibold tracking-wide backdrop-blur-md ${tx.type === 'income' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                        {tx.type === 'income' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        <span className="capitalize">{tx.type}</span>
                      </div>
                    </TableCell>
                    <TableCell className={"py-3.5 align-middle text-right font-bold text-[13px] tracking-tight " + (tx.type === 'income' ? 'text-emerald-400' : 'text-zinc-100')}>
                      {tx.type === 'income' ? '+' : '-'} Rp {tx.amount.toLocaleString('id-ID')}
                    </TableCell>
                  </TableRow>
                )})}
              </TableBody>
            </Table>
            {filteredTransactions.length === 0 && !isLoading && (
              <div className="p-8 text-center text-zinc-500 text-sm">No recent transactions found.</div>
            )}
          </div>
        </div>
      </main>

      {/* RIGHT COLUMN (25%) */}
      <aside className="w-full md:w-[25%] md:min-w-[280px] border-t md:border-t-0 border-l-0 md:border-l border-white/10 bg-zinc-900/30 backdrop-blur-3xl p-4 md:p-8 overflow-y-auto scrollbar-hide z-10">
        
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-sm font-bold text-zinc-100">My Wallets</h3>
          <Link href="/settings"><button className="text-emerald-400 text-xs font-semibold hover:text-emerald-300">See More</button></Link>
        </div>
        
        {/* Virtual Cards Stack */}
        <div className="space-y-4 mb-12">
          {wallets.slice(0, 4).map((wallet) => (
            <DashboardWalletCard 
              key={wallet.id}
              wallet={wallet}
              isSelected={selectedWalletId === wallet.id}
              onSelect={handleSelectWallet}
            />
          ))}
          {wallets.length === 0 && !isLoading && (
            <div className="text-center text-zinc-500 text-xs">No wallets found. Add a wallet in database.</div>
          )}
        </div>

        <h3 className="text-sm font-bold text-zinc-100 mb-6">Spending Distribution</h3>
        
        {/* Pie Chart */}
        <div className={`${darkCard} p-5 mb-6 relative overflow-hidden flex flex-col items-center justify-center`}>
          <div className="h-[180px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs>
                  <filter id="glass-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.5" />
                    <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#ffffff" floodOpacity="0.1" />
                  </filter>
                </defs>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth={1}
                  cornerRadius={8}
                  filter="url(#glass-glow)"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={"cell-" + index} fill={COLORS[index % COLORS.length]} fillOpacity={0.8} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val) => "Rp " + Number(val ?? 0).toLocaleString('id-ID')}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #3f3f46', background: '#18181b', fontSize: '12px', color: '#f4f4f5' }}
                  itemStyle={{ color: '#f4f4f5' }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Inner Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-zinc-400 font-medium">Total Spent</span>
              <span className="text-lg font-bold text-zinc-100">Rp {(totalSpent / 1000).toLocaleString('id-ID')}k</span>
            </div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="space-y-3 px-2">
          {pieData.filter(d => d.name !== 'No Expenses').map((item, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-xs font-medium text-zinc-300">{item.name}</span>
              </div>
              <span className="text-xs text-zinc-500">Rp {(item.value/1000).toLocaleString('id-ID')}k</span>
            </div>
          ))}
        </div>

      </aside>
    </>
  );
}
