'use client';

import { Send, Download, CircleDot } from 'lucide-react';
import AiArchitectureCard from '@/components/AiArchitectureCard';
import WalletSettings from '@/components/WalletSettings';

export default function SettingsPage() {
  return (
    <div className="flex-1 h-screen overflow-y-auto p-8 text-white scrollbar-hide pb-24">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Settings & Configurations</h1>
        <p className="text-white/60 text-sm">Manage your wallets, integrations, and preferences.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Wallet Management */}
        <div className="space-y-8">
          <WalletSettings />
        </div>

        {/* Right Column: Integrations & System */}
        <div className="space-y-8">
          {/* Telegram Bot Connection */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-[#0088cc]/20 rounded-xl">
                <Send className="w-6 h-6 text-[#0088cc]" />
              </div>
              <h2 className="text-xl font-semibold text-white/90">Telegram Bot Connection</h2>
            </div>
            
            <div className="p-5 rounded-xl bg-black/20 border border-white/5 mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/90 mb-1">Connection Status</p>
                <p className="text-xs text-white/50">Listening for incoming transactions</p>
              </div>
              <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                <CircleDot className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span className="text-xs font-medium text-emerald-400">Webhook Active</span>
              </div>
            </div>

            <a 
              href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'YourBotUsername'}`} 
              target="_blank" 
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-[#0088cc]/90 hover:bg-[#0088cc] text-white font-medium py-2.5 rounded-lg transition-all shadow-[0_0_15px_rgba(0,136,204,0.2)] hover:shadow-[0_0_25px_rgba(0,136,204,0.4)]"
            >
              <Send className="w-4 h-4" />
              Open Telegram Bot
            </a>
          </div>

          {/* Data Management */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-500/20 rounded-xl">
                <Download className="w-6 h-6 text-purple-400" />
              </div>
              <h2 className="text-xl font-semibold text-white/90">Data Management</h2>
            </div>
            
            <p className="text-sm text-white/60 mb-6 leading-relaxed">
              Download your complete transaction history as a CSV file for backup, external analysis, or migration purposes.
            </p>

            <button 
              className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-2.5 rounded-lg transition-all hover:border-white/20"
              onClick={() => alert('Exporting to CSV is not implemented yet.')}
            >
              <Download className="w-4 h-4" />
              Export Transactions to CSV
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <AiArchitectureCard />
      </div>
    </div>
  );
}
