"use client";

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Search, Filter, ReceiptText, ArrowDownRight, ArrowUpRight, Zap, Coffee, Car, Clapperboard, ShoppingBag, Heart, LineChart, MoreHorizontal, FileText, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

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

const formatFullDateTime = (timestamp: string) => {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date);
};

const TransactionRow = memo(({ 
  tx, 
  isExpanded, 
  txItems, 
  onToggleExpand, 
  onDelete 
}: { 
  tx: any, 
  isExpanded: boolean, 
  txItems: any[] | undefined, 
  onToggleExpand: (id: number) => void, 
  onDelete: (tx: any) => void 
}) => {
  const walletName = tx.wallets ? tx.wallets.name : 'Unknown';
  return (
    <React.Fragment>
      <TableRow onClick={() => onToggleExpand(tx.id)} className="border-b border-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
        <TableCell className="py-5 align-middle pl-0">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-zinc-200 font-bold text-sm border border-white/10 shadow-sm shrink-0">
              {tx.merchant_name.charAt(0)}
            </div>
            <div className="flex flex-col justify-center">
              <p className="font-semibold text-sm text-zinc-100 leading-none mb-1.5">{tx.merchant_name}</p>
              <p className="text-xs text-zinc-500 leading-none">{formatFullDateTime(tx.transaction_date)}</p>
            </div>
          </div>
        </TableCell>
        <TableCell className="py-4 align-middle">
          <div className="inline-flex items-center justify-center text-[11px] font-semibold text-zinc-300 border border-white/20 bg-white/5 px-3 py-1.5 rounded-full shadow-sm tracking-wide">
            {walletName}
          </div>
        </TableCell>
        <TableCell className="py-4 align-middle">
          <div className={"inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-sm tracking-wide " + getCategoryColor(tx.category)}>
            {getCategoryIcon(tx.category)}
            <span>{tx.category}</span>
          </div>
        </TableCell>
        <TableCell className="py-5 align-middle text-center">
          <div className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full shadow-sm text-[11px] font-semibold tracking-wide backdrop-blur-md ${tx.type === 'income' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
            {tx.type === 'income' ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            <span className="capitalize">{tx.type}</span>
          </div>
        </TableCell>
        <TableCell className={"py-5 align-middle text-right font-bold text-[14px] tracking-tight " + (tx.type === 'income' ? 'text-emerald-400' : 'text-zinc-100')}>
          {tx.type === 'income' ? '+' : '-'} Rp {tx.amount.toLocaleString('id-ID')}
        </TableCell>
        <TableCell className="py-5 align-middle text-center">
          {tx.receipt_url ? (
            <a href={tx.receipt_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group-hover:bg-white/10">
              <FileText className="h-4 w-4 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
            </a>
          ) : (
            <span className="text-xs text-zinc-600">-</span>
          )}
        </TableCell>
        <TableCell className="py-5 align-middle text-right pr-0">
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(tx); }}
            className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 group/btn transition-colors inline-flex items-center justify-center"
            title="Delete Transaction"
          >
            <Trash2 size={16} className="text-zinc-500 group-hover/btn:text-red-500 transition-colors" />
          </button>
        </TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow className="bg-black/20 border-white/5 hover:bg-black/20 transition-all duration-300">
          <TableCell colSpan={7} className="p-0 border-b border-white/5 relative">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-white/5 to-transparent"></div>
            <div className="border-l-2 border-dashed border-zinc-700/50 ml-11 pl-8 py-6 my-2">
               <h4 className="text-xs font-semibold text-zinc-500/80 mb-3 uppercase tracking-[0.2em]">Purchased Items</h4>
               {txItems === undefined ? (
                 <div className="text-sm text-zinc-500 animate-pulse flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-zinc-500"></div> Loading items...
                 </div>
               ) : txItems.length === 0 ? (
                 <div className="text-sm text-zinc-600 italic">No specific line items recorded.</div>
               ) : (
                 <div className="space-y-2.5 max-w-2xl">
                   {txItems.map((item: any, idx: number) => (
                     <div key={idx} className="flex justify-between items-center text-sm py-1 group/item hover:bg-white/[0.02] -mx-3 px-3 rounded-lg transition-colors">
                       <div className="flex items-center gap-3">
                         <div className="w-1.5 h-1.5 rounded-full border border-zinc-600 group-hover/item:border-zinc-400 transition-colors"></div>
                         <span className="text-zinc-300">{item.item_name} <span className="text-xs text-zinc-500 ml-1.5 font-medium">x{item.quantity}</span></span>
                       </div>
                       <span className="font-medium text-zinc-300 tracking-tight">Rp {item.price.toLocaleString('id-ID')}</span>
                     </div>
                   ))}
                 </div>
               )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </React.Fragment>
  );
});
TransactionRow.displayName = 'TransactionRow';

export default function TransactionsPage() {
  const [mounted, setMounted] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState('');
  const [walletFilter, setWalletFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  
  // Accordion state
  const [expandedTx, setExpandedTx] = useState<number | null>(null);
  const [txItems, setTxItems] = useState<Record<number, any[]>>({});

  const deleteSingleTransaction = useCallback(async (transaction: any) => {
    if (window.confirm("Delete this transaction?")) {
      try {
        // Revert wallet balance
        setWallets(currentWallets => {
          const wallet = currentWallets.find(w => w.id === transaction.wallet_id);
          if (wallet) {
            const balanceChange = transaction.type === 'expense' ? transaction.amount : -transaction.amount;
            const newBalance = wallet.current_balance + balanceChange;
            
            supabase
              .from('wallets')
              .update({ current_balance: newBalance })
              .eq('id', wallet.id)
              .then();
              
            return currentWallets.map(w => w.id === wallet.id ? { ...w, current_balance: newBalance } : w);
          }
          return currentWallets;
        });

        // Delete transaction
        await supabase
          .from('transactions')
          .delete()
          .eq('id', transaction.id);

        // Update local transaction state
        setTransactions(currentTxs => currentTxs.filter(tx => tx.id !== transaction.id));
      } catch (err) {
        console.error("Error deleting transaction:", err);
      }
    }
  }, []);

  const toggleExpand = useCallback((txId: number) => {
    setExpandedTx(currentExpanded => {
      if (currentExpanded === txId) return null;
      return txId;
    });
    
    // Fetch items if not already fetched using functional update trick to avoid dependencies
    setTxItems(currentItems => {
      if (!currentItems[txId]) {
        supabase
          .from('transaction_items')
          .select('id, item_name, price, quantity')
          .eq('transaction_id', txId)
          .order('id', { ascending: true })
          .then(({ data, error }) => {
            if (!error && data) {
              setTxItems(prev => ({ ...prev, [txId]: data }));
            }
          });
      }
      return currentItems;
    });
  }, []);

  const clearAllHistory = async () => {
    if (window.confirm("WARNING: Are you sure you want to delete ALL transaction history? Your current wallet balances will NOT be modified.")) {
      try {
        // Wipe all transactions from the table
        await supabase.from('transactions').delete().not('id', 'is', null);
        
        setTransactions([]);
      } catch (err) {
        console.error("Error clearing history:", err);
      }
    }
  };

  useEffect(() => {
    setMounted(true);
    fetch('/api/dashboard-data')
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
  }, []);

  const categories = Array.from(new Set(transactions.map(tx => tx.category)));

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchesSearch = tx.merchant_name.toLowerCase().includes(search.toLowerCase());
      const matchesWallet = walletFilter === 'All' || tx.wallet_id === walletFilter;
      const matchesType = typeFilter === 'All' || tx.type === typeFilter;
      const matchesCategory = categoryFilter === 'All' || tx.category === categoryFilter;
      return matchesSearch && matchesWallet && matchesType && matchesCategory;
    });
  }, [transactions, search, walletFilter, typeFilter, categoryFilter]);

  if (!mounted) return null;

  return (
    <main className="w-full max-w-6xl mx-auto flex-1 overflow-y-auto p-8 z-10 scrollbar-hide">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-zinc-100 tracking-tight">All Transactions</h2>
        <p className="text-zinc-400 text-sm mt-1">Review, search, and filter your complete financial history.</p>
      </header>

      {/* Filter Bar */}
      <div className={`${darkCard} p-4 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between`}>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Search merchants..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
          />
        </div>
        
        <div className="flex flex-wrap gap-3 w-full md:w-auto items-center">
          <button 
            onClick={clearAllHistory}
            className="text-xs text-red-500 hover:text-red-400 font-medium px-3 py-2 border border-red-500/30 hover:border-red-400/50 rounded-xl bg-red-500/10 hover:bg-red-500/20 transition-all mr-2 whitespace-nowrap flex items-center gap-1.5"
          >
            <Trash2 size={14} /> Clear All History
          </button>
          
          <select 
            value={walletFilter} 
            onChange={(e) => setWalletFilter(e.target.value)}
            className="bg-black/20 border border-white/10 rounded-xl py-2 px-3 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none min-w-[120px]"
          >
            <option value="All">All Wallets</option>
            {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          
          <select 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-black/20 border border-white/10 rounded-xl py-2 px-3 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none min-w-[120px]"
          >
            <option value="All">All Types</option>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>

          <select 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-black/20 border border-white/10 rounded-xl py-2 px-3 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none min-w-[140px]"
          >
            <option value="All">All Categories</option>
            {categories.map(c => <option key={c as string} value={c as string}>{c as string}</option>)}
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl overflow-hidden px-6 sm:px-8 py-4 rounded-3xl">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-zinc-500 font-medium text-[10px] h-10 uppercase tracking-widest pl-0">Merchant</TableHead>
              <TableHead className="text-zinc-500 font-medium text-[10px] h-10 uppercase tracking-widest">Wallet</TableHead>
              <TableHead className="text-zinc-500 font-medium text-[10px] h-10 uppercase tracking-widest">Category</TableHead>
              <TableHead className="text-zinc-500 font-medium text-[10px] h-10 uppercase tracking-widest text-center">Type</TableHead>
              <TableHead className="text-right text-zinc-500 font-medium text-[10px] h-10 uppercase tracking-widest">Amount</TableHead>
              <TableHead className="text-center text-zinc-500 font-medium text-[10px] h-10 uppercase tracking-widest">Receipt</TableHead>
              <TableHead className="text-right text-zinc-500 font-medium text-[10px] h-10 uppercase tracking-widest pr-0"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.map((tx) => (
              <TransactionRow 
                key={tx.id} 
                tx={tx} 
                isExpanded={expandedTx === tx.id} 
                txItems={txItems[tx.id]} 
                onToggleExpand={toggleExpand} 
                onDelete={deleteSingleTransaction} 
              />
            ))}
          </TableBody>
        </Table>
        {filteredTransactions.length === 0 && !isLoading && (
          <div className="p-12 text-center flex flex-col items-center">
            <ReceiptText className="h-12 w-12 text-zinc-600 mb-3 opacity-50" />
            <p className="text-zinc-400 text-sm font-medium">No transactions found matching your filters.</p>
          </div>
        )}
      </div>
    </main>
  );
}
