import { Wallet, CreditCard, Landmark, PiggyBank, Coins, Briefcase, Banknote, Receipt, ArrowRightLeft, TrendingUp, HandCoins, Building2, ShoppingCart, Gem } from 'lucide-react';

export const ICON_OPTIONS = {
  Wallet, CreditCard, Landmark, PiggyBank, Coins, Briefcase, Banknote, Receipt, ArrowRightLeft, TrendingUp, HandCoins, Building2, ShoppingCart, Gem
};

export type IconName = keyof typeof ICON_OPTIONS;

export const IconRenderer = ({ name, className }: { name?: string, className?: string }) => {
  if (!name || !(name in ICON_OPTIONS)) {
    return <Wallet className={className} />;
  }
  const Icon = ICON_OPTIONS[name as IconName];
  return <Icon className={className} />;
};
