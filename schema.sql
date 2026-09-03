-- 1. Create wallets table
CREATE TABLE public.wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    current_balance NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default wallets (You can customize these later)
INSERT INTO public.wallets (name, current_balance) VALUES
('BCA', 5000000),
('Cash', 1500000),
('OVO', 500000);

-- 2. Update transactions table
ALTER TABLE public.transactions
ADD COLUMN wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
ADD COLUMN type TEXT CHECK (type IN ('income', 'expense')) DEFAULT 'expense',
ADD COLUMN status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed'));

-- 3. Create recurring_schedules table for Cron Jobs
CREATE TABLE public.recurring_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    type TEXT CHECK (type IN ('income', 'expense')),
    frequency TEXT CHECK (frequency IN ('daily', 'weekly', 'monthly')),
    next_run_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert example recurring schedule (Salary)
INSERT INTO public.recurring_schedules (wallet_id, title, amount, type, frequency, next_run_date) 
VALUES (
  (SELECT id FROM public.wallets WHERE name = 'BCA' LIMIT 1), 
  'Main Salary', 
  10000000, 
  'income', 
  'monthly', 
  '2026-10-01'
);

-- 4. Create Postgres Trigger to auto-update wallet balance
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status = 'pending') THEN
    IF NEW.type = 'expense' THEN
      UPDATE public.wallets SET current_balance = current_balance - NEW.amount WHERE id = NEW.wallet_id;
    ELSIF NEW.type = 'income' THEN
      UPDATE public.wallets SET current_balance = current_balance + NEW.amount WHERE id = NEW.wallet_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transaction_completed_trigger
AFTER INSERT OR UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION update_wallet_balance();
