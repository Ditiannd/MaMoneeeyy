-- ============================================================================
-- Migration V3: Command Shortcuts Table
-- Purpose: Enable dynamic, user-configurable Telegram bot commands
--          (similar to Apple Shortcuts) that auto-record transactions.
-- ============================================================================

-- Ensure uuid extension is available (safe to call multiple times)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE public.command_shortcuts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- The slash-command trigger, e.g. '/bensin', '/kopi'
    -- Stored lowercase, must be unique across the system
    command TEXT NOT NULL UNIQUE,

    -- Transaction type this shortcut produces
    type TEXT NOT NULL CHECK (type IN ('expense', 'income')),

    -- Fixed amount to record for each invocation
    amount NUMERIC NOT NULL CHECK (amount > 0),

    -- Which wallet to debit/credit
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,

    -- Pre-configured merchant / description label
    merchant_name TEXT NOT NULL DEFAULT 'Unknown',

    -- Default category for the generated transaction
    category TEXT NOT NULL DEFAULT 'Others',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast command lookups during webhook processing
CREATE INDEX idx_command_shortcuts_command ON public.command_shortcuts (command);

-- ============================================================================
-- Example seed data (optional — remove if you prefer to add via the UI)
-- ============================================================================
-- INSERT INTO public.command_shortcuts (command, type, amount, wallet_id, merchant_name, category)
-- VALUES (
--   '/bensin',
--   'expense',
--   50000,
--   (SELECT id FROM public.wallets WHERE name = 'BCA' LIMIT 1),
--   'Pertamina',
--   'Transport'
-- );
