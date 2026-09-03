import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// GET — fetch all shortcuts with their wallet names
export async function GET() {
  try {
    // Fetch wallets and shortcuts independently so a missing
    // command_shortcuts table doesn't block the wallet dropdown
    const [shortcutsResult, walletsResult] = await Promise.allSettled([
      supabase
        .from('command_shortcuts')
        .select('*, wallets(name)')
        .order('created_at', { ascending: false }),
      supabase
        .from('wallets')
        .select('id, name')
        .order('created_at', { ascending: true }),
    ]);

    const shortcuts =
      shortcutsResult.status === 'fulfilled' && !shortcutsResult.value.error
        ? shortcutsResult.value.data ?? []
        : [];

    const wallets =
      walletsResult.status === 'fulfilled' && !walletsResult.value.error
        ? walletsResult.value.data ?? []
        : [];

    return NextResponse.json({ shortcuts, wallets });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST — create a new shortcut
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { command, type, amount, wallet_id, merchant_name, category } = body;

    // Basic validation
    if (!command || !type || !amount || !wallet_id || !merchant_name) {
      return NextResponse.json(
        { error: 'Missing required fields: command, type, amount, wallet_id, merchant_name' },
        { status: 400 },
      );
    }

    // Normalize command to lowercase with leading slash
    let normalizedCommand = command.trim().toLowerCase();
    if (!normalizedCommand.startsWith('/')) {
      normalizedCommand = '/' + normalizedCommand;
    }

    // Prevent overriding built-in commands
    const reserved = ['/start', '/balance', '/main_salary'];
    if (reserved.includes(normalizedCommand)) {
      return NextResponse.json(
        { error: `Command "${normalizedCommand}" is reserved and cannot be used.` },
        { status: 400 },
      );
    }

    const { data, error: insertErr } = await supabase
      .from('command_shortcuts')
      .insert([
        {
          command: normalizedCommand,
          type,
          amount: Number(amount),
          wallet_id,
          merchant_name: merchant_name.trim(),
          category: category || 'Others',
        },
      ])
      .select('*, wallets(name)')
      .single();

    if (insertErr) {
      // Detect unique constraint violation
      if (insertErr.code === '23505') {
        return NextResponse.json(
          { error: `Shortcut "${normalizedCommand}" already exists.` },
          { status: 409 },
        );
      }
      throw insertErr;
    }

    return NextResponse.json({ shortcut: data }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE — remove a shortcut by ID
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing shortcut ID' }, { status: 400 });
    }

    const { error: deleteErr } = await supabase
      .from('command_shortcuts')
      .delete()
      .eq('id', id);

    if (deleteErr) throw deleteErr;

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
