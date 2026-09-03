"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from "recharts";
import { Loader2, TrendingUp } from "lucide-react";

// Initialize Supabase client
// Note: For client-side fetching, NEXT_PUBLIC_SUPABASE_ANON_KEY is required in .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Fallback to avoid immediate crash if anon key is missing
const supabase = createClient(supabaseUrl, supabaseKey || 'dummy-key');

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
const darkCard = "bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl";

interface Transaction {
  id: string;
  amount: number;
  category: string;
  merchant_name: string;
  transaction_date: string;
  type: 'income' | 'expense';
  wallet_id: string;
}

export default function AnalyticsPage() {
  const [mounted, setMounted] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const fetchTransactions = async () => {
      try {
        if (!supabaseKey) {
          throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing in .env.local");
        }
        
        // Fetch all transactions for accurate analytics
        const { data, error: fetchError } = await supabase
          .from('transactions')
          .select('*')
          .order('transaction_date', { ascending: false });

        if (fetchError) throw fetchError;
        setTransactions(data || []);
      } catch (err: any) {
        console.error('Data Fetch Error:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  // --- Data Aggregation Logic ---

  // 1. Monthly Cashflow (Last 6 Months)
  const monthlyCashflow = useMemo(() => {
    const map: Record<string, { month: string; income: number; expense: number; sortKey: string }> = {};
    
    // Initialize the last 6 months to ensure they appear even if empty
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStr = d.toLocaleString('default', { month: 'short' });
      const yearStr = d.getFullYear().toString().slice(-2);
      const key = `${monthStr} '${yearStr}`;
      const sortKey = d.toISOString().slice(0, 7); // YYYY-MM
      map[sortKey] = { month: key, income: 0, expense: 0, sortKey };
    }

    transactions.forEach(tx => {
      if (!tx.transaction_date) return;
      const sortKey = tx.transaction_date.slice(0, 7);
      
      // Only include if it falls within our 6 month window (or exists in the initialized map)
      if (map[sortKey]) {
        if (tx.type === 'income') {
          map[sortKey].income += tx.amount;
        } else if (tx.type === 'expense') {
          map[sortKey].expense += tx.amount;
        }
      }
    });

    return Object.values(map).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [transactions]);

  // 2. Expense by Category
  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    transactions
      .filter(tx => tx.type === 'expense')
      .forEach(tx => {
        map[tx.category] = (map[tx.category] || 0) + tx.amount;
      });

    return Object.keys(map)
      .map(key => ({ category: key, amount: map[key] }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  // 3. Top Merchants
  const topMerchants = useMemo(() => {
    const map: Record<string, number> = {};
    transactions
      .filter(tx => tx.type === 'expense')
      .forEach(tx => {
        const name = tx.merchant_name || 'Unknown';
        map[name] = (map[name] || 0) + tx.amount;
      });

    return Object.keys(map)
      .map(key => ({ merchant: key, amount: map[key] }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5); // Top 5
  }, [transactions]);


  if (!mounted) return null;

  return (
    <main className="flex-1 overflow-y-auto p-8 z-10 scrollbar-hide relative w-full h-full bg-transparent">
      {/* Background Gradient Orbs */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-emerald-600/20 rounded-full mix-blend-screen filter blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-blue-600/20 rounded-full mix-blend-screen filter blur-[100px] animate-pulse" style={{ animationDelay: '3s' }}></div>

      <header className="mb-10 flex justify-between items-center relative z-10">
        <div>
          <h2 className="text-3xl font-bold text-zinc-100 tracking-tight flex items-center gap-3">
            Deep Analytics <TrendingUp className="h-6 w-6 text-emerald-400" />
          </h2>
          <p className="text-zinc-400 text-sm mt-1">Visualize your financial habits and find opportunities to save.</p>
        </div>
        {isLoading && <Loader2 className="h-6 w-6 text-emerald-400 animate-spin" />}
      </header>

      {error && (
        <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm relative z-10">
          Failed to load data: {error}. Please make sure NEXT_PUBLIC_SUPABASE_ANON_KEY is set in .env.local.
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 mb-8 relative z-10">
        {/* Top Row: Monthly Cashflow */}
        <div className={`${darkCard} p-6 h-[400px]`}>
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-zinc-100">Monthly Cashflow Comparison</h3>
            <p className="text-xs text-zinc-400">Income vs Expenses over the last 6 months</p>
          </div>
          
          {isLoading ? (
            <div className="w-full h-[300px] bg-white/5 animate-pulse rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyCashflow} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" strokeOpacity={0.5} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} tickFormatter={(val) => "Rp " + (val/1000000).toFixed(1) + "M"} />
                <Tooltip 
                  cursor={{fill: '#ffffff', opacity: 0.05}}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #3f3f46', background: '#18181b', color: '#f4f4f5', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                  formatter={(val) => ["Rp " + Number(val ?? 0).toLocaleString('id-ID')]}
                  labelStyle={{ marginBottom: '8px', color: '#a1a1aa' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-2 gap-8 relative z-10">
        {/* Left Column: Category Breakdown */}
        <div className={`${darkCard} p-6 flex flex-col`}>
          <div className="mb-2">
            <h3 className="text-lg font-semibold text-zinc-100">Expense by Category</h3>
            <p className="text-xs text-zinc-400">Total spending breakdown</p>
          </div>
          
          <div className="flex-1 min-h-[300px] relative">
            {isLoading ? (
              <div className="absolute inset-0 bg-white/5 animate-pulse rounded-xl mt-4" />
            ) : expenseByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <filter id="pie-shadow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#000" floodOpacity="0.4" />
                    </filter>
                  </defs>
                  <Pie
                    data={expenseByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="amount"
                    nameKey="category"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth={2}
                    cornerRadius={6}
                    filter="url(#pie-shadow)"
                  >
                    {expenseByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val) => "Rp " + Number(val ?? 0).toLocaleString('id-ID')}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #3f3f46', background: '#18181b', color: '#f4f4f5' }}
                    itemStyle={{ fontWeight: 'bold' }}
                  />
                  <Legend 
                    layout="vertical" 
                    verticalAlign="middle" 
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-500 text-sm">
                No expense data available.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Top Merchants */}
        <div className={`${darkCard} p-6 flex flex-col`}>
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-zinc-100">Top Merchants</h3>
            <p className="text-xs text-zinc-400">Where you spent the most money</p>
          </div>
          
          <div className="flex-1 flex flex-col justify-center">
            {isLoading ? (
              <div className="space-y-4">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="h-12 w-full bg-white/5 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : topMerchants.length > 0 ? (
              <div className="space-y-5">
                {topMerchants.map((item, index) => (
                  <div key={index} className="flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-lg font-bold text-zinc-300 shadow-sm group-hover:bg-white/10 group-hover:scale-105 transition-all">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-zinc-100 text-sm">{item.merchant}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-rose-400 text-sm">
                        Rp {item.amount.toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-500 text-sm">
                No merchant data available.
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
