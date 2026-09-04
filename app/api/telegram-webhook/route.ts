export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// =============================================================================
// Initialization
// =============================================================================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

// =============================================================================
// In-memory cache for pending transactions (keyed by message_id)
// =============================================================================
interface PendingTransaction {
  merchant: string;
  amount: number;
  date: string;
  time?: string;
  category?: string;
  type?: 'income' | 'expense';
  wallet_name?: string;
  created_at: number; // epoch ms – for TTL cleanup
  items?: { name: string; price: number; qty: number }[];
}

const pendingTransactions = new Map<string, PendingTransaction>();

// Auto-evict entries older than 15 minutes to prevent unbounded growth
const PENDING_TTL_MS = 15 * 60 * 1000;

function cleanupPending() {
  const now = Date.now();
  const entries = Array.from(pendingTransactions.entries());
  for (const [key, value] of entries) {
    if (now - value.created_at > PENDING_TTL_MS) {
      pendingTransactions.delete(key);
    }
  }
}

function getExactTimestamp(date?: string, time?: string): string {
  let finalTimestamp = new Date().toISOString(); // Default to exact current time (Now)
  
  if (date) {
    if (time) {
      // Combine AI extracted date and time (assuming WIB / UTC+7)
      finalTimestamp = new Date(`${date}T${time}:00+07:00`).toISOString();
    } else {
      // If we only have the date from the receipt, append the exact current HH:mm:ss
      const now = new Date();
      const currentTimeString = now.toISOString().split('T')[1]; 
      finalTimestamp = new Date(`${date}T${currentTimeString}`).toISOString();
    }
  }
  
  return finalTimestamp;
}

// =============================================================================
// Telegram API helpers
// =============================================================================
async function sendMessage(chatId: number, text: string, replyMarkup?: object) {
  const payload: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
  };
  if (replyMarkup) payload.reply_markup = replyMarkup;

  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

async function editMessageText(
  chatId: number,
  messageId: number,
  text: string,
) {
  await fetch(`${TELEGRAM_API}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'Markdown',
    }),
  });
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text: text ?? '',
    }),
  });
}

async function fetchTelegramFile(fileId: string): Promise<Buffer> {
  const res = await fetch(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
  const json = await res.json();
  const filePath: string = json.result.file_path;

  const download = await fetch(
    `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${filePath}`,
  );
  const arrayBuffer = await download.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// =============================================================================
// Gemini extraction helper
// =============================================================================
const ALLOWED_EXPENSE_CATEGORIES = [
  "Food & Beverage", "Transportation", "Shopping", 
  "Bills & Utilities", "Entertainment", "Health & Personal Care", "Others"
];
const ALLOWED_INCOME_CATEGORIES = [
  "Salary", "Allowance", "Bonus & Freelance", "Investment", "Others"
];

const EXTRACTION_PROMPT = `You are a financial data extractor for an Indonesian personal finance tracker.
Analyze the input (text or receipt image) and return strictly a raw JSON object — no markdown fences, no explanation, no backticks.

STRICT RULES:
1. NO GUESSING: If the text is short and does not explicitly name a merchant, strictly set "merchant_name" to "Deposit" (for income) or "General" (for expense). Do not return "Unknown".
2. WALLET IS NOT MERCHANT: Words like "cash", "bca", "seabank", "gopay", "ovo", "dana", "bank" are wallet names. NEVER use them as the "merchant_name".
3. CONSISTENCY: Always return the exact same JSON structure for identical inputs.

Required JSON shape:
{
  "type": "expense",
  "merchant_name": "string",
  "total_amount": number,
  "date": "YYYY-MM-DD",
  "time": "HH:mm",
  "category": "string",
  "items": [
    { "name": "string", "price": number, "qty": number }
  ]
}

Instruct the AI to read the receipt line by line. It must extract every purchased item, its individual price, and quantity, and push them into the items array. Ignore tax or change lines, only capture actual purchased products. If it is not a receipt, leave items empty.

Look for the exact time printed on the receipt. If found, return it in HH:mm format. If not found, return null.

Allowed Expense Categories: ${ALLOWED_EXPENSE_CATEGORIES.join(", ")}.
Classify the transaction into strictly ONE of the allowed category strings above. Do not create new categories. Default to 'Others' if uncertain.

If you cannot determine the date, use today: ${new Date().toISOString().split('T')[0]}.`;

async function executeWithFallback(
  modelChain: string[],
  prompt: string,
  imageBuffer?: Buffer
) {
  let lastError: unknown;
  for (const currentModel of modelChain) {
    try {
      const model = genAI.getGenerativeModel({
        model: currentModel,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        }
      });
      const parts: any[] = [{ text: prompt }];
      
      if (imageBuffer) {
        parts.push({
          inlineData: {
            data: imageBuffer.toString('base64'),
            mimeType: 'image/jpeg',
          },
        });
      }
      return await model.generateContent(parts);
    } catch (err: any) {
      console.warn(`[Fallback] ${currentModel} failed, trying next...`);
      console.error('[Model Error Details]:', err.message);
      lastError = err;
    }
  }
  throw lastError;
}

async function extractWithGemini(
  textInput?: string,
  imageBuffer?: Buffer,
): Promise<PendingTransaction> {
  let prompt = EXTRACTION_PROMPT;
  if (!imageBuffer && textInput) {
    prompt += `\n\nInput: ${textInput}`;
  } else if (!imageBuffer && !textInput) {
    throw new Error('No input provided to Gemini.');
  }

  const result = await executeWithFallback(
    ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.7-flash'],
    prompt,
    imageBuffer
  );

  const raw = result.response.text().replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(raw);

  let category = parsed.category ?? 'Others';
  if (!ALLOWED_EXPENSE_CATEGORIES.includes(category)) {
    category = 'Others';
  }

  return {
    merchant: parsed.merchant_name ?? parsed.merchant ?? 'Unknown',
    amount: Number(parsed.total_amount) || Number(parsed.amount) || 0,
    date: parsed.date ?? new Date().toISOString().split('T')[0],
    time: parsed.time,
    category: category,
    type: 'expense',
    created_at: Date.now(),
    items: parsed.items ?? []
  };
}

const EXTRACTION_PROMPT_NLP = `Extract the transaction details. 
Allowed Expense Categories (/out): ${ALLOWED_EXPENSE_CATEGORIES.join(", ")}.
Allowed Income Categories (/in): ${ALLOWED_INCOME_CATEGORIES.join(", ")}.

STRICT RULES:
1. DYNAMIC MERCHANT EXTRACTION: Any words in the input that are NOT the amount (e.g., 25k, 12k) or a known wallet name MUST be extracted and used as the "merchant". For example, "nasi goreng 12k" -> merchant: "Nasi goreng", "uang jajan 50k bca" -> merchant: "Uang jajan".
2. CAPITALIZATION: Strictly capitalize the first letter of the extracted "merchant" (e.g., "Nasi goreng").
3. ABSOLUTE FALLBACKS: ONLY if the user provides absolutely zero descriptive words (e.g., just "23k" or "50k cash"), set the "merchant" to "Deposit" (for income) or "General" (for expense). Do not use "Unknown".
4. WALLET IS NOT MERCHANT: Words matching Available Wallets provided in the Input must map to the "wallet" field and NEVER be included in the "merchant". If no wallet word is found, set "wallet" to null.
5. CONSISTENCY: Always return the exact same JSON structure for identical inputs.
6. Classify the transaction into strictly ONE of the allowed category strings above. Do not create new categories. Default to 'Others' if uncertain.

Return ONLY raw JSON: {"amount": number, "merchant": "string", "category": "string", "wallet": "string" | null}`;

async function extractWithGeminiNLP(
  textInput: string,
  type: 'income' | 'expense',
  walletNames: string[]
): Promise<PendingTransaction> {
  const prompt = `${EXTRACTION_PROMPT_NLP}\n\nAvailable Wallets: ${walletNames.join(", ")}\n\nInput (${type}): ${textInput}`;

  const result = await executeWithFallback(
    ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'],
    prompt
  );

  const raw = result.response.text().replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(raw);

  let category = parsed.category ?? 'Others';
  const allowedCategories = type === 'income' ? ALLOWED_INCOME_CATEGORIES : ALLOWED_EXPENSE_CATEGORIES;
  if (!allowedCategories.includes(category)) {
    category = 'Others';
  }

  return {
    merchant: parsed.merchant ?? 'Unknown',
    amount: Number(parsed.amount) || 0,
    category: category,
    type: type,
    wallet_name: parsed.wallet,
    date: new Date().toISOString().split('T')[0],
    created_at: Date.now(),
  };
}

// =============================================================================
// Format helpers
// =============================================================================
function fmtRp(n: number): string {
  return `Rp ${n.toLocaleString('id-ID')}`;
}

// =============================================================================
// POST handler — the webhook entrypoint
// =============================================================================
export async function POST(req: Request) {
  // Periodic cleanup of stale pending entries
  cleanupPending();

  try {
    const body = await req.json();

    // =========================================================================
    // FAST FAIL / EARLY RETURNS
    // =========================================================================
    if (body.edited_message) return ok();
    if (!body.message && !body.callback_query) return ok();
    if (body.message && !body.message.text && (!body.message.photo || body.message.photo.length === 0)) return ok();

    // =========================================================================
    // BRANCH B — Callback Query (inline keyboard click)
    // =========================================================================
    if (body.callback_query) {
      const cbq = body.callback_query;
      const chatId: number = cbq.message.chat.id;
      const messageId: number = cbq.message.message_id;
      const data: string = cbq.data ?? '';

      // Acknowledge the callback immediately to remove Telegram's spinner
      await answerCallbackQuery(cbq.id);

      // Expected format: SCAN|<walletId>|<amount>
      if (data.startsWith('SCAN|')) {
        const segments = data.split('|');
        if (segments.length < 3) {
          await editMessageText(chatId, messageId, '⚠️ Format callback tidak valid.');
          return ok();
        }

        const [, walletId, amountStr] = segments;
        const amount = Number(amountStr);

        const pending = pendingTransactions.get(messageId.toString());

        // Fetch the wallet name for the confirmation message
        const { data: walletRow, error: walletErr } = await supabase
          .from('wallets')
          .select('id, name, current_balance')
          .eq('id', walletId)
          .single();

        if (walletErr || !walletRow) {
          await editMessageText(chatId, messageId, '⚠️ Dompet tidak ditemukan.');
          return ok();
        }

        // 1. Insert the transaction row
        const merchant = pending?.merchant ?? 'Scanned Receipt';
        const finalIsoString = getExactTimestamp(pending?.date, pending?.time);

        const { data: insertedTx, error: insertErr } = await supabase.from('transactions').insert([
          {
            wallet_id: walletId,
            merchant_name: merchant,
            amount: amount,
            category: pending?.category ?? 'Others',
            type: 'expense',
            transaction_date: finalIsoString,
          },
        ]).select().single();

        if (insertErr || !insertedTx) {
          console.error('Transaction insert error:', insertErr);
          await editMessageText(
            chatId,
            messageId,
            `❌ Gagal menyimpan transaksi: ${insertErr?.message ?? 'Unknown Error'}`,
          );
          return ok();
        }

        // 1.5 Insert items if exist
        if (pending?.items && pending.items.length > 0) {
          const itemsToInsert = pending.items.map(item => ({
            transaction_id: insertedTx.id,
            item_name: item.name,
            price: item.price,
            quantity: item.qty
          }));
          const { error: itemsErr } = await supabase.from('transaction_items').insert(itemsToInsert);
          if (itemsErr) {
            console.error('Items insert error:', itemsErr);
          }
        }

        // 2. Update the wallet balance explicitly (deduct expense)
        const currentBalance = Number(walletRow.current_balance ?? 0);
        const newBalance = currentBalance - amount;

        const { error: walletUpdateErr } = await supabase
          .from('wallets')
          .update({ current_balance: newBalance })
          .eq('id', walletId);

        if (walletUpdateErr) {
          console.error('Wallet balance update error:', walletUpdateErr);
        }

        // Cleanup pending so it can't be double-submitted
        pendingTransactions.delete(messageId.toString());

        let replyText = `✅ *Tercatat!*\n\n` +
          `*Merchant:* ${merchant}\n` +
          `*Nominal:* ${fmtRp(amount)}\n` +
          `*Tipe:* 📉 expense\n` +
          `*Dompet:* ${walletRow.name}\n` +
          `*Saldo Baru:* ${fmtRp(newBalance)}`;

        if (pending?.items && pending.items.length > 0) {
          replyText += `\n\n*Detail Barang:*\n`;
          pending.items.forEach(item => {
            replyText += `- ${item.name} (${item.qty}x): ${fmtRp(item.price)}\n`;
          });
        }

        await editMessageText(chatId, messageId, replyText.trim());

        return ok();
      }

      if (data.startsWith('NLP|')) {
        const segments = data.split('|');
        if (segments.length < 2) {
          await editMessageText(chatId, messageId, '⚠️ Format callback tidak valid.');
          return ok();
        }

        const [, walletId] = segments;
        const pending = pendingTransactions.get(messageId.toString());

        if (!pending) {
          await editMessageText(chatId, messageId, '⏰ Sesi ini sudah kedaluwarsa.');
          return ok();
        }

        const { data: walletRow, error: walletErr } = await supabase
          .from('wallets')
          .select('id, name, current_balance')
          .eq('id', walletId)
          .single();

        if (walletErr || !walletRow) {
          await editMessageText(chatId, messageId, '⚠️ Dompet tidak ditemukan.');
          return ok();
        }

        const { error: insertErr } = await supabase.from('transactions').insert([
          {
            wallet_id: walletId,
            merchant_name: pending.merchant,
            amount: pending.amount,
            category: pending.category ?? 'Others',
            type: pending.type ?? 'expense',
            transaction_date: getExactTimestamp(pending.date, pending.time),
          },
        ]);

        if (insertErr) {
          console.error('Transaction insert error:', insertErr);
          await editMessageText(chatId, messageId, `❌ Gagal menyimpan transaksi: ${insertErr.message}`);
          return ok();
        }

        const currentBalance = Number(walletRow.current_balance ?? 0);
        const newBalance = pending.type === 'income' 
          ? currentBalance + pending.amount 
          : currentBalance - pending.amount;

        const { error: walletUpdateErr } = await supabase
          .from('wallets')
          .update({ current_balance: newBalance })
          .eq('id', walletId);

        if (walletUpdateErr) {
          console.error('Wallet balance update error:', walletUpdateErr);
        }

        pendingTransactions.delete(messageId.toString());

        await editMessageText(
          chatId,
          messageId,
          `✅ *Tercatat!*\n\n` +
            `*Merchant:* ${pending.merchant}\n` +
            `*Nominal:* ${fmtRp(pending.amount)}\n` +
            `*Kategori:* ${pending.category}\n` +
            `*Tipe:* ${pending.type === 'income' ? '📈' : '📉'} ${pending.type}\n` +
            `*Dompet:* ${walletRow.name}\n` +
            `*Saldo Baru:* ${fmtRp(newBalance)}`,
        );

        return ok();
      }

      await editMessageText(chatId, messageId, '⚠️ Data callback tidak dikenali.');
      return ok();
    }

    // =========================================================================
    // No message? Nothing to do.
    // =========================================================================
    const message = body.message;
    if (!message) return ok();

    const chatId: number = message.chat.id;

    // =========================================================================
    // BRANCH C — Slash commands & NLP
    // =========================================================================
    if (message.text && (message.text.startsWith('/in ') || message.text.startsWith('/out '))) {
      const isIncome = message.text.startsWith('/in ');
      const textInput = message.text.replace(isIncome ? '/in ' : '/out ', '');
      
      await sendMessage(chatId, '⏳ Sedang memproses transaksi...');
      
      const { data: wallets } = await supabase
        .from('wallets')
        .select('id, name, current_balance')
        .order('created_at', { ascending: true });

      if (!wallets || wallets.length === 0) {
        await sendMessage(chatId, '⚠️ Tidak ada dompet yang tersedia. Tambahkan dompet di Dashboard terlebih dahulu.');
        return ok();
      }

      const walletNames = wallets.map(w => w.name);
      
      const extractedNLP = await extractWithGeminiNLP(textInput, isIncome ? 'income' : 'expense', walletNames);

      // Auto-assign wallet logic
      let targetWallet: any = null;
      
      if (extractedNLP.wallet_name) {
        // Try to find a matching wallet ignoring case
        const matchedWallet = wallets.find(w => w.name.toLowerCase() === extractedNLP.wallet_name!.toLowerCase());
        if (matchedWallet) {
          targetWallet = matchedWallet;
        }
      }

      if (!targetWallet) {
        // Halt and Ask via Inline Keyboard
        const inlineKeyboard = wallets.map((w) => [
          {
            text: `💳 ${w.name}`,
            callback_data: `NLP|${w.id}`,
          },
        ]);
        
        const confirmMsg =
          `📝 *Data Terekstrak:*\n\n` +
          `*Merchant:* ${extractedNLP.merchant}\n` +
          `*Nominal:* ${fmtRp(extractedNLP.amount)}\n` +
          `*Kategori:* ${extractedNLP.category}\n` +
          `*Tipe:* ${extractedNLP.type === 'income' ? '📈' : '📉'} ${extractedNLP.type}\n\n` +
          `Pilih dompet sumber dana:`;

        const sentMsg = await sendMessage(chatId, confirmMsg, {
          inline_keyboard: inlineKeyboard,
        });
        
        if (sentMsg && sentMsg.ok) {
          pendingTransactions.set(sentMsg.result.message_id.toString(), extractedNLP);
        }
        
        return ok();
      }

      const { error: insertErr } = await supabase.from('transactions').insert([
        {
          wallet_id: targetWallet.id,
          merchant_name: extractedNLP.merchant,
          amount: extractedNLP.amount,
          category: extractedNLP.category ?? 'Others',
          type: extractedNLP.type ?? 'expense',
          transaction_date: getExactTimestamp(extractedNLP.date, extractedNLP.time),
        },
      ]);

      if (insertErr) {
        console.error('Transaction insert error:', insertErr);
        await sendMessage(chatId, `❌ Gagal menyimpan transaksi: ${insertErr.message}`);
        return ok();
      }

      const currentBalance = Number(targetWallet.current_balance ?? 0);
      const newBalance = extractedNLP.type === 'income' 
        ? currentBalance + extractedNLP.amount 
        : currentBalance - extractedNLP.amount;

      const { error: walletUpdateErr } = await supabase
        .from('wallets')
        .update({ current_balance: newBalance })
        .eq('id', targetWallet.id);

      if (walletUpdateErr) {
        console.error('Wallet balance update error:', walletUpdateErr);
      }

      const confirmMsg =
        `✅ *Tercatat Otomatis!*\n\n` +
        `*Merchant:* ${extractedNLP.merchant}\n` +
        `*Nominal:* ${fmtRp(extractedNLP.amount)}\n` +
        `*Kategori:* ${extractedNLP.category}\n` +
        `*Tipe:* ${extractedNLP.type === 'income' ? '📈' : '📉'} ${extractedNLP.type}\n` +
        `*Dompet:* ${targetWallet.name}\n` +
        `*Saldo Baru:* ${fmtRp(newBalance)}`;

      await sendMessage(chatId, confirmMsg);
      
      return ok();
    }

    if (message.text && message.text.startsWith('/')) {
      const command = message.text.split(/\s|@/)[0].toLowerCase();

      // /start ----------------------------------------------------------------
      if (command === '/start') {
        await sendMessage(
          chatId,
          '👋 *Selamat datang di AI Finance Tracker!*\n\n' +
            'Kirim foto struk atau ketik pengeluaranmu (misal: _50rb kopi starbucks_).\n\n' +
            '*Perintah:*\n' +
            '`/main_salary` — Catat gaji bulanan\n' +
            '`/balance` — Lihat saldo semua dompet\n\n' +
            '⚡ _Shortcut custom juga tersedia! Buat di Dashboard → Shortcuts._',
        );
        return ok();
      }

      // /main_salary ----------------------------------------------------------
      if (command === '/main_salary') {
        const SALARY_AMOUNT = 10_000_000;

        // Fetch the BCA wallet, and fallback wallet concurrently
        const [bcaRes, fallbackRes] = await Promise.all([
          supabase.from('wallets').select('id, name, current_balance').eq('name', 'BCA').single(),
          supabase.from('wallets').select('id, name, current_balance').order('created_at', { ascending: true }).limit(1).single()
        ]);

        const wallet = bcaRes.data || fallbackRes.data;

        if (!wallet) {
          await sendMessage(chatId, '⚠️ Tidak ada dompet yang tersedia.');
          return ok();
        }

        // 1. Insert salary transaction
        const { error: insertErr } = await supabase
          .from('transactions')
          .insert([
            {
              wallet_id: wallet.id,
              merchant_name: 'Monthly Salary',
              amount: SALARY_AMOUNT,
              transaction_date: getExactTimestamp(),
              category: 'Income',
              type: 'income',
            },
          ]);

        if (insertErr) {
          console.error('Salary insert error:', insertErr);
          await sendMessage(chatId, `❌ Gagal mencatat gaji: ${insertErr.message}`);
          return ok();
        }

        // 2. Update wallet balance explicitly
        const newBalance = Number(wallet.current_balance ?? 0) + SALARY_AMOUNT;

        const { error: walletUpdateErr } = await supabase
          .from('wallets')
          .update({ current_balance: newBalance })
          .eq('id', wallet.id);

        if (walletUpdateErr) {
          console.error('Salary wallet update error:', walletUpdateErr);
          await sendMessage(chatId, `❌ Gaji tercatat tapi gagal update saldo: ${walletUpdateErr.message}`);
          return ok();
        }

        await sendMessage(
          chatId,
          `✅ *Gaji Masuk!*\n\n` +
            `${fmtRp(SALARY_AMOUNT)} ditambahkan ke *${wallet.name}*.\n` +
            `*Saldo Baru:* ${fmtRp(newBalance)}`,
        );
        return ok();
      }

      // /balance --------------------------------------------------------------
      if (command === '/balance') {
        const { data: wallets } = await supabase
          .from('wallets')
          .select('name, current_balance')
          .order('created_at', { ascending: true });

        if (!wallets || wallets.length === 0) {
          await sendMessage(chatId, '⚠️ Belum ada dompet yang terdaftar.');
          return ok();
        }

        const lines = wallets.map(
          (w) => `💳 *${w.name}:* ${fmtRp(Number(w.current_balance ?? 0))}`,
        );
        const total = wallets.reduce(
          (sum, w) => sum + Number(w.current_balance ?? 0),
          0,
        );

        await sendMessage(
          chatId,
          `📊 *Saldo Dompet*\n\n${lines.join('\n')}\n\n*Total:* ${fmtRp(total)}`,
        );
        return ok();
      }

      // =====================================================================
      // Dynamic Shortcut Commands — look up in command_shortcuts table
      // =====================================================================
      const { data: shortcut, error: shortcutErr } = await supabase
        .from('command_shortcuts')
        .select('*')
        .eq('command', command)
        .single();

      if (shortcutErr || !shortcut) {
        // Fetch all available shortcuts so the user knows what's available
        const { data: allShortcuts } = await supabase
          .from('command_shortcuts')
          .select('command, merchant_name')
          .order('created_at', { ascending: true });

        let helpText = `⚠️ Perintah *${command}* tidak dikenali.\n\n`;
        if (allShortcuts && allShortcuts.length > 0) {
          helpText += '*Shortcut tersedia:*\n';
          helpText += allShortcuts
            .map((s) => `\`${s.command}\` → ${s.merchant_name}`)
            .join('\n');
        } else {
          helpText += 'Belum ada shortcut. Buat di Dashboard → Shortcuts.';
        }

        await sendMessage(chatId, helpText);
        return ok();
      }

      // Fetch the target wallet
      const { data: scWallet, error: scWalletErr } = await supabase
        .from('wallets')
        .select('id, name, current_balance')
        .eq('id', shortcut.wallet_id)
        .single();

      if (scWalletErr || !scWallet) {
        await sendMessage(
          chatId,
          `⚠️ Dompet untuk shortcut *${command}* tidak ditemukan. Periksa konfigurasi di Dashboard.`,
        );
        return ok();
      }

      // 1. Insert the transaction
      const { error: scInsertErr } = await supabase.from('transactions').insert([
        {
          wallet_id: shortcut.wallet_id,
          merchant_name: shortcut.merchant_name,
          amount: Number(shortcut.amount),
          category: shortcut.category ?? 'Others',
          type: shortcut.type,
          transaction_date: new Date().toISOString().split('T')[0],
        },
      ]);

      if (scInsertErr) {
        console.error('Shortcut transaction insert error:', scInsertErr);
        await sendMessage(
          chatId,
          `❌ Gagal menyimpan transaksi shortcut: ${scInsertErr.message}`,
        );
        return ok();
      }

      // 2. Update the wallet balance
      const scCurrentBalance = Number(scWallet.current_balance ?? 0);
      const scNewBalance =
        shortcut.type === 'income'
          ? scCurrentBalance + Number(shortcut.amount)
          : scCurrentBalance - Number(shortcut.amount);

      const { error: scWalletUpdateErr } = await supabase
        .from('wallets')
        .update({ current_balance: scNewBalance })
        .eq('id', shortcut.wallet_id);

      if (scWalletUpdateErr) {
        console.error('Shortcut wallet update error:', scWalletUpdateErr);
      }

      // 3. Send success message
      const typeEmoji = shortcut.type === 'income' ? '📈' : '📉';
      await sendMessage(
        chatId,
        `⚡ *Shortcut Executed!*\n\n` +
          `*Command:* \`${command}\`\n` +
          `*Merchant:* ${shortcut.merchant_name}\n` +
          `*Nominal:* ${fmtRp(Number(shortcut.amount))}\n` +
          `*Tipe:* ${typeEmoji} ${shortcut.type}\n` +
          `*Dompet:* ${scWallet.name}\n` +
          `*Saldo Baru:* ${fmtRp(scNewBalance)}`,
      );

      return ok();
    }

    // =========================================================================
    // BRANCH A — Standard input (Photo or Text → Gemini extraction)
    // =========================================================================
    let extracted: PendingTransaction | null = null;

    if (message.photo && message.photo.length > 0) {
      // --- Photo workflow ---
      await sendMessage(chatId, '⏳ Sedang memproses gambar...');

      const photo = message.photo[message.photo.length - 1]; // highest resolution
      const imageBuffer = await fetchTelegramFile(photo.file_id);

      // Optional: upload to Supabase Storage for record-keeping
      try {
        const fileName = `receipt-${Date.now()}.jpg`;
        await supabase.storage
          .from('receipts')
          .upload(fileName, imageBuffer, { contentType: 'image/jpeg' });
      } catch {
        // Non-critical — log and continue
        console.warn('Receipt upload to storage failed (bucket may not exist).');
      }

      extracted = await extractWithGemini(undefined, imageBuffer);
    } else if (message.text) {
      // --- Text workflow ---
      await sendMessage(chatId, '⏳ Sedang mengekstrak data...');
      extracted = await extractWithGemini(message.text);
    }

    if (!extracted) {
      await sendMessage(chatId, '⚠️ Maaf, gagal mengekstrak data dari input.');
      return ok();
    }

    // Fetch active wallets for the inline keyboard
    const { data: wallets } = await supabase
      .from('wallets')
      .select('id, name')
      .order('created_at', { ascending: true });

    if (!wallets || wallets.length === 0) {
      await sendMessage(
        chatId,
        '⚠️ Tidak ada dompet yang tersedia. Tambahkan dompet di Dashboard.',
      );
      return ok();
    }

    // Build inline keyboard — format: SCAN|<walletId>|<amount>
    const inlineKeyboard = wallets.map((w) => [
      {
        text: `💳 ${w.name}`,
        callback_data: `SCAN|${w.id}|${extracted!.amount}`,
      },
    ]);

    const confirmMsg =
      `📝 *Data Terekstrak:*\n\n` +
      `*Merchant:* ${extracted.merchant}\n` +
      `*Nominal:* ${fmtRp(extracted.amount)}\n` +
      `*Kategori:* ${extracted.category}\n` +
      `*Tanggal:* ${extracted.date}\n\n` +
      `Pilih dompet sumber dana:`;

    const sentMsg = await sendMessage(chatId, confirmMsg, {
      inline_keyboard: inlineKeyboard,
    });
    
    // Store extracted data server-side keyed by the message ID of the bot's reply
    if (sentMsg && sentMsg.ok) {
      pendingTransactions.set(sentMsg.result.message_id.toString(), extracted);
    }

    return ok();
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Telegram Webhook Error:', errMsg);

    // CRITICAL: Always return 200 so Telegram does not infinitely retry.
    return ok();
  }
}

// =============================================================================
// Always-200 response helper
// =============================================================================
function ok() {
  return NextResponse.json({ ok: true }, { status: 200 });
}
