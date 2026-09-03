'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Wallet, Plus, Pencil, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { ICON_OPTIONS, IconRenderer } from './IconRenderer';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export interface WalletType {
  id: string;
  name: string;
  current_balance: number;
  icon?: string;
  gradient_from?: string;
  gradient_to?: string;
  position?: number;
}

const WalletCard = memo(({ 
  wallet, 
  index, 
  totalWallets, 
  onMoveUp, 
  onMoveDown, 
  onEdit 
}: { 
  wallet: any, 
  index: number, 
  totalWallets: number, 
  onMoveUp: (index: number) => void, 
  onMoveDown: (index: number) => void, 
  onEdit: (wallet: any) => void 
}) => {
  return (
    <div 
      className="group flex justify-between items-center p-4 rounded-xl border border-white/10 transition-all duration-300 relative overflow-hidden"
      style={{
          background: wallet.gradient_from && wallet.gradient_to 
            ? `linear-gradient(to right, ${wallet.gradient_from}, ${wallet.gradient_to})`
            : 'rgba(255, 255, 255, 0.05)'
      }}
    >
      {/* Overlay to ensure text readability */}
      <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-300"></div>
      
      <div className="flex items-center gap-3 relative z-10">
        <div className="p-2 bg-black/20 rounded-lg flex items-center justify-center min-w-[40px] shadow-sm backdrop-blur-md">
          <IconRenderer name={wallet.icon} className="w-5 h-5 text-white/90" />
        </div>
        <span className="font-medium text-white drop-shadow-md">{wallet.name}</span>
      </div>
      <div className="flex items-center gap-4 relative z-10">
        <div className="flex flex-col gap-1 mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button onClick={() => onMoveUp(index)} disabled={index === 0} className="p-1 rounded bg-black/20 text-white hover:bg-black/40 disabled:opacity-30 transition-colors" title="Move Up"><ArrowUp size={14} /></button>
          <button onClick={() => onMoveDown(index)} disabled={index === totalWallets - 1} className="p-1 rounded bg-black/20 text-white hover:bg-black/40 disabled:opacity-30 transition-colors" title="Move Down"><ArrowDown size={14} /></button>
        </div>
        <span className="font-semibold tracking-wide text-white drop-shadow-md">
          Rp {(wallet.current_balance || 0).toLocaleString('id-ID')}
        </span>
        <button 
          onClick={() => onEdit(wallet)}
          className="p-2 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors"
        >
          <Pencil size={18} />
        </button>
      </div>
    </div>
  );
});
WalletCard.displayName = 'WalletCard';

export default function WalletSettings() {
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [newWalletName, setNewWalletName] = useState('');
  const [newWalletBalance, setNewWalletBalance] = useState('');
  const [loading, setLoading] = useState(true);

  const [editingWallet, setEditingWallet] = useState<WalletType | null>(null);
  const [editData, setEditData] = useState({
    name: '',
    current_balance: 0,
    icon: '',
    gradient_from: '#10b981',
    gradient_to: '#047857'
  });

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('wallets')
      .select('id, name, current_balance, icon, gradient_from, gradient_to, position')
      .order('position', { ascending: true });
      
    if (error) {
      console.error('Error fetching wallets:', error);
    } else {
      setWallets(data || []);
    }
    setLoading(false);
  };

  const handleDeleteWallet = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this wallet? All associated transactions will also be lost.")) {
      const { error } = await supabase.from('wallets').delete().eq('id', id);
      if (error) {
        console.error('Error deleting wallet:', error);
        alert('Failed to delete wallet.');
      } else {
        setWallets(wallets.filter(w => w.id !== id));
        if (editingWallet?.id === id) setEditingWallet(null);
      }
    }
  };

  const swapPositions = useCallback(async (index1: number, index2: number) => {
    setWallets(currentWallets => {
      const newWallets = [...currentWallets];
      
      // Swap in array
      const temp = newWallets[index1];
      newWallets[index1] = newWallets[index2];
      newWallets[index2] = temp;
      
      // Re-assign position values based on new index for absolute consistency
      const updatedWallets = newWallets.map((w, idx) => ({ ...w, position: idx }));
      
      // Update in DB (fire and forget to not block UI)
      for (const wallet of updatedWallets) {
        supabase.from('wallets').update({ position: wallet.position }).eq('id', wallet.id).then();
      }
      
      return updatedWallets;
    });
  }, []);

  const handleMoveUp = useCallback((index: number) => {
    if (index > 0) swapPositions(index, index - 1);
  }, [swapPositions]);

  const handleMoveDown = useCallback((index: number) => {
    setWallets(currentWallets => {
      if (index < currentWallets.length - 1) swapPositions(index, index + 1);
      return currentWallets;
    });
  }, [swapPositions]);

  const handleEditClick = useCallback((wallet: WalletType) => {
    setEditingWallet(wallet);
    setEditData({
      name: wallet.name || '',
      current_balance: wallet.current_balance || 0,
      icon: wallet.icon || '',
      gradient_from: wallet.gradient_from || '#10b981',
      gradient_to: wallet.gradient_to || '#047857',
    });
  }, []);

  const handleUpdateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWallet) return;

    const { error } = await supabase
      .from('wallets')
      .update({
        name: editData.name,
        current_balance: editData.current_balance,
        icon: editData.icon,
        gradient_from: editData.gradient_from,
        gradient_to: editData.gradient_to,
      })
      .eq('id', editingWallet.id);

    if (error) {
      console.error('Error updating wallet:', error);
      alert('Failed to update wallet.');
    } else {
      setWallets(wallets.map(w => 
        w.id === editingWallet.id 
          ? { ...w, ...editData }
          : w
      ));
      setEditingWallet(null);
    }
  };

  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWalletName || !newWalletBalance) return;

    const { error, data } = await supabase
      .from('wallets')
      .insert([
        { name: newWalletName, current_balance: parseFloat(newWalletBalance) }
      ])
      .select();

    if (error) {
      console.error('Error creating wallet:', error);
      alert('Failed to create wallet.');
    } else {
      setNewWalletName('');
      setNewWalletBalance('');
      if (data) {
          setWallets([...wallets, data[0]]);
      } else {
          fetchWallets();
      }
    }
  };

  return (
    <>
      <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-emerald-500/20 rounded-xl">
            <Wallet className="w-6 h-6 text-emerald-400" />
          </div>
          <h2 className="text-xl font-semibold text-white/90">Manage Wallets</h2>
        </div>
        
        <div className="space-y-4 mb-8">
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex justify-between items-center p-4 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/10 rounded-lg"></div>
                    <div className="w-24 h-4 bg-white/10 rounded"></div>
                  </div>
                  <div className="w-20 h-5 bg-white/10 rounded"></div>
                </div>
              ))}
            </div>
          ) : wallets.length > 0 ? (
            wallets.map((wallet, index) => (
              <WalletCard 
                key={wallet.id}
                wallet={wallet}
                index={index}
                totalWallets={wallets.length}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                onEdit={handleEditClick}
              />
            ))
          ) : (
            <div className="text-center py-8 px-4 rounded-xl bg-white/5 border border-white/5">
              <Wallet className="w-8 h-8 text-white/20 mx-auto mb-3" />
              <p className="text-white/50 text-sm">No wallets found. Create one below.</p>
            </div>
          )}
        </div>

        <form onSubmit={handleCreateWallet} className="space-y-5 bg-black/20 p-5 rounded-xl border border-white/5">
          <h3 className="text-sm font-medium text-white/70">Add New Wallet</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5 ml-1">Wallet Name</label>
              <input
                type="text"
                value={newWalletName}
                onChange={(e) => setNewWalletName(e.target.value)}
                placeholder="e.g. Cash, BCA"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5 ml-1">Starting Balance</label>
              <input
                type="number"
                value={newWalletBalance}
                onChange={(e) => setNewWalletBalance(e.target.value)}
                placeholder="0"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={!newWalletName || !newWalletBalance}
            className="w-full flex items-center justify-center gap-2 bg-emerald-500/90 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-500/90 text-white font-medium py-2.5 rounded-lg transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)]"
          >
            <Plus className="w-4 h-4" />
            Add Wallet
          </button>
        </form>
      </div>

      {/* Edit Wallet Modal */}
      {editingWallet && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#18181b] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-6">Edit Wallet</h3>
              <form onSubmit={handleUpdateWallet} className="space-y-4">
                
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5 ml-1">Wallet Name</label>
                  <input
                    type="text"
                    value={editData.name}
                    onChange={(e) => setEditData({...editData, name: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5 ml-1">Current Balance</label>
                  <input
                    type="number"
                    value={editData.current_balance}
                    onChange={(e) => setEditData({...editData, current_balance: parseFloat(e.target.value) || 0})}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/50 mb-2 ml-1">Icon</label>
                  <div className="grid grid-cols-5 sm:grid-cols-7 gap-2 p-3 bg-white/5 border border-white/10 rounded-xl">
                    {Object.entries(ICON_OPTIONS).map(([iconName, IconComponent]) => (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setEditData({ ...editData, icon: iconName })}
                        className={`p-2.5 rounded-lg flex items-center justify-center transition-all ${
                          editData.icon === iconName 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                            : 'bg-transparent text-white/50 hover:text-white/90 hover:bg-white/10 border border-transparent'
                        }`}
                        title={iconName}
                      >
                        <IconComponent className="w-5 h-5" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5 ml-1">Gradient From</label>
                    <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg p-2 transition-all hover:bg-white/10">
                      <input
                        type="color"
                        value={editData.gradient_from}
                        onChange={(e) => setEditData({...editData, gradient_from: e.target.value})}
                        className="h-8 w-12 rounded cursor-pointer bg-transparent border-0 p-0"
                      />
                      <span className="text-xs text-white/70 uppercase font-mono">{editData.gradient_from}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5 ml-1">Gradient To</label>
                    <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg p-2 transition-all hover:bg-white/10">
                      <input
                        type="color"
                        value={editData.gradient_to}
                        onChange={(e) => setEditData({...editData, gradient_to: e.target.value})}
                        className="h-8 w-12 rounded cursor-pointer bg-transparent border-0 p-0"
                      />
                      <span className="text-xs text-white/70 uppercase font-mono">{editData.gradient_to}</span>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="mt-5 pt-5 border-t border-white/10">
                  <p className="text-xs font-medium text-white/50 mb-3 ml-1">Card Preview</p>
                  <div 
                    className="p-4 rounded-xl border border-white/10 flex justify-between items-center shadow-lg relative overflow-hidden"
                    style={{ background: `linear-gradient(to right, ${editData.gradient_from}, ${editData.gradient_to})` }}
                  >
                    <div className="absolute inset-0 bg-black/10"></div>
                    <div className="flex items-center gap-3 relative z-10">
                      <div className="p-2 bg-black/20 rounded-lg flex items-center justify-center min-w-[40px] shadow-sm backdrop-blur-md">
                        <IconRenderer name={editData.icon} className="w-5 h-5 text-white/90" />
                      </div>
                      <span className="font-medium text-white drop-shadow-md">{editData.name || 'Wallet Name'}</span>
                    </div>
                    <span className="font-semibold tracking-wide text-white drop-shadow-md relative z-10">
                      Rp {editData.current_balance.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center w-full mt-6 pt-4 border-t border-gray-700/50">
                  <button 
                    type="button" 
                    onClick={() => handleDeleteWallet(editingWallet.id)} 
                    className="flex items-center px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors font-medium text-sm"
                  >
                    <Trash2 size={16} className="mr-2" /> Delete Wallet
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingWallet(null)}
                      className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-emerald-500/90 hover:bg-emerald-500 rounded-lg transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)]"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
