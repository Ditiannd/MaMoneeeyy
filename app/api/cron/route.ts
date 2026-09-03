import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Using Service Role Key to bypass RLS
const supabase = createClient(supabaseUrl, supabaseKey);

// Vercel cron uses GET request by default
export async function GET(req: Request) {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. Fetch all due recurring schedules
    const { data: schedules, error: fetchError } = await supabase
      .from('recurring_schedules')
      .select('*')
      .lte('next_run_date', today);

    if (fetchError) throw new Error(fetchError.message);

    if (!schedules || schedules.length === 0) {
      return NextResponse.json({ status: 'success', message: 'No schedules due today.' });
    }

    const transactionsToInsert = [];
    const updates = [];

    for (const schedule of schedules) {
      // Prepare transaction
      transactionsToInsert.push({
        wallet_id: schedule.wallet_id,
        merchant_name: `Automated: ${schedule.title}`,
        amount: schedule.amount,
        transaction_date: today,
        category: 'Recurring',
        type: schedule.type,
        status: 'completed'
      });

      // Calculate next run date
      const nextRunDate = new Date(schedule.next_run_date);
      if (schedule.frequency === 'daily') {
        nextRunDate.setDate(nextRunDate.getDate() + 1);
      } else if (schedule.frequency === 'weekly') {
        nextRunDate.setDate(nextRunDate.getDate() + 7);
      } else if (schedule.frequency === 'monthly') {
        nextRunDate.setMonth(nextRunDate.getMonth() + 1);
      }

      updates.push({
        id: schedule.id,
        next_run_date: nextRunDate.toISOString().split('T')[0]
      });
    }

    // 2. Insert new transactions
    const { error: insertError } = await supabase
      .from('transactions')
      .insert(transactionsToInsert);

    if (insertError) throw new Error(`Transaction insert error: ${insertError.message}`);

    // 3. Update next_run_date on schedules
    for (const update of updates) {
      await supabase
        .from('recurring_schedules')
        .update({ next_run_date: update.next_run_date })
        .eq('id', update.id);
    }

    // (The Postgres Trigger created in migration.sql will automatically update wallet balances when the transaction is inserted as 'completed')

    return NextResponse.json({ status: 'success', processed: schedules.length });
    
  } catch (error: any) {
    console.error('Cron Error:', error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
