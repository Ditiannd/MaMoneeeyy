"use client";

import React, { useState, useEffect } from "react";
import {
  Zap,
  Plus,
  Trash2,
  Terminal,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Loader2,
  Sparkles,
  Tag,
  DollarSign,
  Store,
  FolderOpen,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  X,
  Pencil,
  Command as CommandIcon,
  Bot
} from "lucide-react";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// =============================================================================
// Types
// =============================================================================
interface WalletItem {
  id: string;
  name: string;
}

interface Shortcut {
  id: string;
  command: string;
  type: "expense" | "income";
  amount: number;
  wallet_id: string;
  merchant_name: string;
  category: string;
  created_at: string;
  wallets?: { name: string };
}

// =============================================================================
// Constants
// =============================================================================
const CATEGORIES = [
  "Food & Beverage",
  "Transport",
  "Utilities",
  "Entertainment",
  "Health",
  "Shopping",
  "Income",
  "Others",
];

const darkCard =
  "bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl";

// =============================================================================
// Component
// =============================================================================
export default function ShortcutsPage() {
  const [mounted, setMounted] = useState(false);
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [wallets, setWallets] = useState<WalletItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [command, setCommand] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [walletId, setWalletId] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [category, setCategory] = useState("Others");

  // Salary Modal State
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [salaryAmount, setSalaryAmount] = useState<number | string>("");
  const [salaryWalletId, setSalaryWalletId] = useState("");
  const [isSavingSalary, setIsSavingSalary] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // =========================================================================
  // Fetch data
  // =========================================================================
  const fetchData = async () => {
    try {
      const res = await fetch("/api/shortcuts");
      const data = await res.json();
      if (data.shortcuts) setShortcuts(data.shortcuts);
      if (data.wallets) {
        setWallets(data.wallets);
        if (!walletId && data.wallets.length > 0) {
          setWalletId(data.wallets[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch shortcuts:", err);
      showToast("Failed to load data", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('salary_amount, salary_wallet_id')
        .single();
      if (data && !error) {
        setSalaryAmount(data.salary_amount || "");
        setSalaryWalletId(data.salary_wallet_id || "");
      }
    } catch (err) {
      console.error("Failed to fetch preferences", err);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchData();
    fetchPreferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =========================================================================
  // Toast helper
  // =========================================================================
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // =========================================================================
  // Salary Preferences Save
  // =========================================================================
  const saveSalarySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salaryAmount || !salaryWalletId) {
      showToast("Please fill all fields", "error");
      return;
    }
    setIsSavingSalary(true);
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({ id: 1, salary_amount: Number(salaryAmount), salary_wallet_id: salaryWalletId });
      
      if (error) throw error;
      showToast("Salary settings updated!", "success");
      setIsSalaryModalOpen(false);
    } catch (error) {
      console.error(error);
      showToast("Failed to save settings.", "error");
    } finally {
      setIsSavingSalary(false);
    }
  };

  // =========================================================================
  // Create shortcut
  // =========================================================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || !amount || !walletId || !merchantName.trim()) {
      showToast("Please fill in all required fields.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/shortcuts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: command.trim(),
          type,
          amount: Number(amount),
          wallet_id: walletId,
          merchant_name: merchantName.trim(),
          category,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || "Failed to create shortcut", "error");
        return;
      }

      // Reset form
      setCommand("");
      setAmount("");
      setMerchantName("");
      setCategory("Others");
      setType("expense");

      showToast(
        `Shortcut "${data.shortcut.command}" created successfully!`,
        "success"
      );
      fetchData();
    } catch (err) {
      console.error("Failed to create shortcut:", err);
      showToast("Network error. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================================================
  // Delete shortcut
  // =========================================================================
  const handleDelete = async (id: string, cmdName: string) => {
    try {
      const res = await fetch(`/api/shortcuts?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || "Failed to delete", "error");
        return;
      }
      showToast(`Shortcut "${cmdName}" deleted.`, "success");
      fetchData();
    } catch (err) {
      console.error("Failed to delete shortcut:", err);
      showToast("Network error. Please try again.", "error");
    }
  };

  if (!mounted) return null;

  return (
    <main className="flex-1 overflow-y-auto p-8 z-10 scrollbar-hide relative w-full h-full bg-transparent">
      {/* Background Gradient Orbs */}
      <div className="absolute top-[-10%] right-[10%] w-96 h-96 bg-violet-600/15 rounded-full mix-blend-screen filter blur-[100px] animate-pulse pointer-events-none" />
      <div
        className="absolute bottom-[-15%] left-[-5%] w-96 h-96 bg-emerald-600/15 rounded-full mix-blend-screen filter blur-[100px] animate-pulse pointer-events-none"
        style={{ animationDelay: "3s" }}
      />

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl border shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${
            toast.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-red-500/10 border-red-500/30 text-red-300"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 hover:opacity-70 transition-opacity"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <header className="mb-10 flex justify-between items-center relative z-10">
        <div>
          <h2 className="text-3xl font-bold text-zinc-100 tracking-tight flex items-center gap-3">
            Commands <CommandIcon className="h-6 w-6 text-violet-400" />
          </h2>
          <p className="text-zinc-400 text-sm mt-1.5">
            Manage your built-in Telegram bot commands and custom shortcuts.
          </p>
        </div>
        {isLoading && (
          <Loader2 className="h-6 w-6 text-violet-400 animate-spin" />
        )}
      </header>

      {/* Section 1: Built-in Commands */}
      <section className="mb-12 relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <Bot className="h-5 w-5 text-emerald-400" />
          <h3 className="text-lg font-semibold text-zinc-100">Built-in Commands</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* /in */}
          <div className={`${darkCard} p-5 flex flex-col justify-between`}>
            <div>
              <code className="text-emerald-400 font-mono font-bold text-lg bg-emerald-500/10 px-2 py-1 rounded-md">/in &lt;text&gt;</code>
              <p className="text-sm text-zinc-400 mt-3">Catat pemasukan dengan AI secara otomatis.</p>
            </div>
          </div>
          
          {/* /out */}
          <div className={`${darkCard} p-5 flex flex-col justify-between`}>
            <div>
              <code className="text-red-400 font-mono font-bold text-lg bg-red-500/10 px-2 py-1 rounded-md">/out &lt;text&gt;</code>
              <p className="text-sm text-zinc-400 mt-3">Catat pengeluaran dengan AI secara otomatis.</p>
            </div>
          </div>

          {/* /balance */}
          <div className={`${darkCard} p-5 flex flex-col justify-between`}>
            <div>
              <code className="text-blue-400 font-mono font-bold text-lg bg-blue-500/10 px-2 py-1 rounded-md">/balance</code>
              <p className="text-sm text-zinc-400 mt-3">Cek saldo semua dompet yang ada.</p>
            </div>
          </div>

          {/* /main_salary */}
          <div className={`${darkCard} p-5 flex flex-col justify-between relative overflow-hidden group`}>
            <div>
              <div className="flex items-center justify-between">
                <code className="text-amber-400 font-mono font-bold text-lg bg-amber-500/10 px-2 py-1 rounded-md">/main_salary</code>
                <button 
                  onClick={() => setIsSalaryModalOpen(true)}
                  className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                  title="Configure Salary Settings"
                >
                  <Pencil size={16} />
                </button>
              </div>
              <p className="text-sm text-zinc-400 mt-3">Catat gaji bulanan secara otomatis.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Custom Shortcuts */}
      <section className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-violet-400" />
          <h3 className="text-lg font-semibold text-zinc-100">Custom Shortcuts</h3>
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
          {/* LEFT: Create Shortcut Form (2/5 width) */}
          <div className="xl:col-span-2">
            <div className={`${darkCard} p-6`}>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-violet-500/20 rounded-lg border border-violet-500/20">
                  <Plus className="h-4 w-4 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-zinc-100">
                    New Shortcut
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Define a quick command for Telegram
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Command */}
                <div>
                  <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-2">
                    <Terminal className="h-3.5 w-3.5" />
                    Command Trigger
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-sm">
                      /
                    </span>
                    <input
                      type="text"
                      value={command}
                      onChange={(e) => setCommand(e.target.value)}
                      placeholder="coffee"
                      className="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/30 transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Type Toggle */}
                <div>
                  <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-2">
                    <Tag className="h-3.5 w-3.5" />
                    Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setType("expense")}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
                        type === "expense"
                          ? "bg-red-500/20 border-red-500/30 text-red-300 shadow-lg shadow-red-500/5"
                          : "bg-white/5 border-white/10 text-zinc-500 hover:text-zinc-300 hover:border-white/20"
                      }`}
                    >
                      <ArrowDownRight className="h-3.5 w-3.5" />
                      Expense
                    </button>
                    <button
                      type="button"
                      onClick={() => setType("income")}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
                        type === "income"
                          ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300 shadow-lg shadow-emerald-500/5"
                          : "bg-white/5 border-white/10 text-zinc-500 hover:text-zinc-300 hover:border-white/20"
                      }`}
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      Income
                    </button>
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-2">
                    <DollarSign className="h-3.5 w-3.5" />
                    Amount (Rp)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="25000"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/30 transition-all"
                  />
                </div>

                {/* Wallet Dropdown */}
                <div>
                  <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-2">
                    <Wallet className="h-3.5 w-3.5" />
                    Target Wallet
                  </label>
                  <div className="relative">
                    <select
                      value={walletId}
                      onChange={(e) => setWalletId(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/30 transition-all appearance-none cursor-pointer"
                    >
                      {wallets.map((w) => (
                        <option
                          key={w.id}
                          value={w.id}
                          className="bg-zinc-900 text-zinc-100"
                        >
                          {w.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                  </div>
                </div>

                {/* Merchant Name */}
                <div>
                  <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-2">
                    <Store className="h-3.5 w-3.5" />
                    Merchant Name
                  </label>
                  <input
                    type="text"
                    value={merchantName}
                    onChange={(e) => setMerchantName(e.target.value)}
                    placeholder="Starbucks"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/30 transition-all"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-2">
                    <FolderOpen className="h-3.5 w-3.5" />
                    Category
                  </label>
                  <div className="relative">
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/30 transition-all appearance-none cursor-pointer"
                    >
                      {CATEGORIES.map((cat) => (
                        <option
                          key={cat}
                          value={cat}
                          className="bg-zinc-900 text-zinc-100"
                        >
                          {cat}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  {isSubmitting ? "Creating..." : "Create Shortcut"}
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT: Shortcuts Grid (3/5 width) */}
          <div className="xl:col-span-3">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-semibold text-zinc-100">
                  Active Shortcuts
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {shortcuts.length} shortcut{shortcuts.length !== 1 ? "s" : ""} configured
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={`${darkCard} p-5 h-40 animate-pulse`} />
                ))}
              </div>
            ) : shortcuts.length === 0 ? (
              <div className={`${darkCard} p-12 flex flex-col items-center justify-center text-center`}>
                <div className="p-4 bg-violet-500/10 rounded-2xl mb-4 border border-violet-500/10">
                  <Zap className="h-8 w-8 text-violet-400" />
                </div>
                <h4 className="text-zinc-200 font-semibold mb-1.5">
                  No Shortcuts Yet
                </h4>
                <p className="text-zinc-500 text-sm max-w-xs">
                  Create your first shortcut to start recording transactions with a single Telegram command.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {shortcuts.map((sc) => (
                  <div key={sc.id} className={`${darkCard} p-5 group hover:bg-white/[0.07] hover:border-white/20 transition-all duration-300 relative overflow-hidden`}>
                    {/* Decorative background icon */}
                    <div className="absolute -right-3 -bottom-3 opacity-[0.03] pointer-events-none">
                      <Zap className="w-24 h-24 text-white" />
                    </div>

                    {/* Header row */}
                    <div className="flex items-start justify-between mb-4 relative z-10">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl border ${sc.type === "expense" ? "bg-red-500/10 border-red-500/20" : "bg-emerald-500/10 border-emerald-500/20"}`}>
                          {sc.type === "expense" ? (
                            <ArrowDownRight className="h-4 w-4 text-red-400" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                          )}
                        </div>
                        <div>
                          <code className="text-base font-bold text-violet-300 font-mono">
                            {sc.command}
                          </code>
                          <p className="text-[11px] text-zinc-500 mt-0.5">
                            {sc.merchant_name}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(sc.id, sc.command)}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-600 hover:text-red-400 transition-all duration-200 opacity-0 group-hover:opacity-100"
                        title="Delete shortcut"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Details */}
                    <div className="space-y-2.5 relative z-10">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-zinc-500 font-medium">Amount</span>
                        <span className={`text-sm font-bold tracking-tight ${sc.type === "income" ? "text-emerald-400" : "text-zinc-100"}`}>
                          {sc.type === "income" ? "+" : "-"} Rp {sc.amount.toLocaleString("id-ID")}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-zinc-500 font-medium">Wallet</span>
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-zinc-300 border border-white/15 bg-white/5 px-2.5 py-1 rounded-full">
                          <Wallet className="h-3 w-3" />
                          {sc.wallets?.name ?? "Unknown"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-zinc-500 font-medium">Category</span>
                        <span className="text-[11px] font-medium text-zinc-400">
                          {sc.category}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Salary Settings Modal */}
      {isSalaryModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#18181b] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-2">Configure /main_salary</h3>
              <p className="text-sm text-zinc-400 mb-6">Set up your automated monthly salary command details.</p>
              
              <form onSubmit={saveSalarySettings} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Salary Amount (Rp)</label>
                  <input
                    type="number"
                    value={salaryAmount}
                    onChange={(e) => setSalaryAmount(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                    required
                    placeholder="e.g. 5000000"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Target Wallet</label>
                  <div className="relative">
                    <select
                      value={salaryWalletId}
                      onChange={(e) => setSalaryWalletId(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all appearance-none"
                      required
                    >
                      <option value="" disabled>Select a wallet</option>
                      {wallets.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsSalaryModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingSalary}
                    className="px-4 py-2 text-sm font-medium text-amber-900 bg-amber-500 hover:bg-amber-400 rounded-lg transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_25px_rgba(245,158,11,0.4)] disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSavingSalary ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Save Configuration
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
