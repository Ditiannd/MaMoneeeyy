import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    // Fetch wallets and recent transactions concurrently
    const [walletsResult, txResult] = await Promise.all([
      supabase
        .from('wallets')
        .select('id, name, current_balance, icon, gradient_from, gradient_to, position')
        .order('position', { ascending: true }),
      supabase
        .from('transactions')
        .select('id, wallet_id, type, amount, merchant_name, category, transaction_date, receipt_url, wallets(name)')
        .order('transaction_date', { ascending: false })
        .limit(50)
    ]);

    if (walletsResult.error) throw new Error(walletsResult.error.message);
    if (txResult.error) throw new Error(txResult.error.message);

    return NextResponse.json({ wallets: walletsResult.data, transactions: txResult.data });
  } catch (error: any) {
    console.error('Data Fetch Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
