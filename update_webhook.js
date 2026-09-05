const fs = require('fs');
let code = fs.readFileSync('app/api/telegram-webhook/route.ts', 'utf8');

// Helper
code = code.replace(
  'const supabase = createClient(supabaseUrl, supabaseKey);',
  'const supabase = createClient(supabaseUrl, supabaseKey);\n\nfunction broadcastStatus(message: string) {\n  supabase.channel(\'webhook-status\').send({\n    type: \'broadcast\',\n    event: \'stage\',\n    payload: { message }\n  }).catch(console.error);\n}'
);

// Processing
code = code.replace(
  'if (body.message && !body.message.text && (!body.message.photo || body.message.photo.length === 0)) return ok();',
  'if (body.message && !body.message.text && (!body.message.photo || body.message.photo.length === 0)) return ok();\n\n    broadcastStatus(\"Processing\");'
);

// SCAN Savings
code = code.replace(
  'const { data: insertedTx, error: insertErr } = await supabase.from(\'transactions\').insert([',
  'broadcastStatus(\"Saving data\");\n        const { data: insertedTx, error: insertErr } = await supabase.from(\'transactions\').insert(['
);
code = code.replace(
  'await editMessageText(\n            chatId,\n            messageId,\n            `❌ Gagal menyimpan transaksi: ${insertErr?.message ?? \'Unknown Error\'}`,\n          );\n          return ok();',
  'await editMessageText(\n            chatId,\n            messageId,\n            `❌ Gagal menyimpan transaksi: ${insertErr?.message ?? \'Unknown Error\'}`,\n          );\n          broadcastStatus(\"Error\");\n          return ok();'
);
code = code.replace(
  'await editMessageText(chatId, messageId, replyText.trim());\n\n        return ok();',
  'await editMessageText(chatId, messageId, replyText.trim());\n\n        broadcastStatus(\"Completed\");\n        return ok();'
);

// NLP Savings
code = code.replace(
  'const { error: insertErr } = await supabase.from(\'transactions\').insert([',
  'broadcastStatus(\"Saving data\");\n        const { error: insertErr } = await supabase.from(\'transactions\').insert(['
);
code = code.replace(
  'await editMessageText(chatId, messageId, `❌ Gagal menyimpan transaksi: ${insertErr.message}`);\n          return ok();',
  'await editMessageText(chatId, messageId, `❌ Gagal menyimpan transaksi: ${insertErr.message}`);\n          broadcastStatus(\"Error\");\n          return ok();'
);
code = code.replace(
  '          `*Saldo Baru:* ${fmtRp(newBalance)}`,\n        );\n\n        return ok();',
  '          `*Saldo Baru:* ${fmtRp(newBalance)}`,\n        );\n\n        broadcastStatus(\"Completed\");\n        return ok();'
);

// Callback fallback error
code = code.replace(
  'await editMessageText(chatId, messageId, \'⚠️ Data callback tidak dikenali.\');\n      return ok();',
  'await editMessageText(chatId, messageId, \'⚠️ Data callback tidak dikenali.\');\n      broadcastStatus(\"Error\");\n      return ok();'
);

// Branch C - Auto NLP
code = code.replace(
  'const extractedNLP = await extractWithGeminiNLP(textInput, isIncome ? \'income\' : \'expense\', walletNames);',
  'broadcastStatus(\"Analyzing\");\n      const extractedNLP = await extractWithGeminiNLP(textInput, isIncome ? \'income\' : \'expense\', walletNames);'
);
code = code.replace(
  '      const { error: insertErr } = await supabase.from(\'transactions\').insert([',
  '      broadcastStatus(\"Saving data\");\n      const { error: insertErr } = await supabase.from(\'transactions\').insert(['
);
code = code.replace(
  'await sendMessage(chatId, `❌ Gagal menyimpan transaksi: ${insertErr.message}`);\n        return ok();',
  'await sendMessage(chatId, `❌ Gagal menyimpan transaksi: ${insertErr.message}`);\n        broadcastStatus(\"Error\");\n        return ok();'
);
code = code.replace(
  'await sendMessage(chatId, confirmMsg);\n      \n      return ok();',
  'await sendMessage(chatId, confirmMsg);\n      \n      broadcastStatus(\"Completed\");\n      return ok();'
);

// Start
code = code.replace(
  '\'_Shortcut custom juga tersedia! Buat di Dashboard → Shortcuts._\',\n        );\n        return ok();',
  '\'_Shortcut custom juga tersedia! Buat di Dashboard → Shortcuts._\',\n        );\n        broadcastStatus(\"Completed\");\n        return ok();'
);

// Salary
code = code.replace(
  '        const { error: insertErr } = await supabase\n          .from(\'transactions\')\n          .insert([',
  '        broadcastStatus(\"Saving data\");\n        const { error: insertErr } = await supabase\n          .from(\'transactions\')\n          .insert(['
);
code = code.replace(
  'await sendMessage(chatId, `❌ Gagal mencatat gaji: ${insertErr.message}`);\n          return ok();',
  'await sendMessage(chatId, `❌ Gagal mencatat gaji: ${insertErr.message}`);\n          broadcastStatus(\"Error\");\n          return ok();'
);
code = code.replace(
  '            `*Saldo Baru:* ${fmtRp(newBalance)}`,\n        );\n        return ok();',
  '            `*Saldo Baru:* ${fmtRp(newBalance)}`,\n        );\n        broadcastStatus(\"Completed\");\n        return ok();'
);

// Balance
code = code.replace(
  '          `📊 *Saldo Dompet*\n\n${lines.join(\'\\n\')}\n\n*Total:* ${fmtRp(total)}`,\n        );\n        return ok();',
  '          `📊 *Saldo Dompet*\n\n${lines.join(\'\\n\')}\n\n*Total:* ${fmtRp(total)}`,\n        );\n        broadcastStatus(\"Completed\");\n        return ok();'
);

// Shortcut
code = code.replace(
  '      const { error: scInsertErr } = await supabase.from(\'transactions\').insert([',
  '      broadcastStatus(\"Saving data\");\n      const { error: scInsertErr } = await supabase.from(\'transactions\').insert(['
);
code = code.replace(
  'await sendMessage(\n          chatId,\n          `❌ Gagal menyimpan transaksi shortcut: ${scInsertErr.message}`,\n        );\n        return ok();',
  'await sendMessage(\n          chatId,\n          `❌ Gagal menyimpan transaksi shortcut: ${scInsertErr.message}`,\n        );\n        broadcastStatus(\"Error\");\n        return ok();'
);
code = code.replace(
  '          `*Saldo Baru:* ${fmtRp(scNewBalance)}`,\n      );\n\n      return ok();',
  '          `*Saldo Baru:* ${fmtRp(scNewBalance)}`,\n      );\n\n      broadcastStatus(\"Completed\");\n      return ok();'
);

// Standard Input Photo
code = code.replace(
  'extracted = await extractWithGemini(undefined, imageBuffer);',
  'broadcastStatus(\"Analyzing\");\n      extracted = await extractWithGemini(undefined, imageBuffer);'
);
// Standard Input Text
code = code.replace(
  'extracted = await extractWithGemini(message.text);',
  'broadcastStatus(\"Analyzing\");\n      extracted = await extractWithGemini(message.text);'
);
// Failed extract
code = code.replace(
  'await sendMessage(chatId, \'⚠️ Maaf, gagal mengekstrak data dari input.\');\n      return ok();',
  'await sendMessage(chatId, \'⚠️ Maaf, gagal mengekstrak data dari input.\');\n      broadcastStatus(\"Error\");\n      return ok();'
);
// Standard Complete
code = code.replace(
  'pendingTransactions.set(sentMsg.result.message_id.toString(), extracted);\n    }\n\n    return ok();',
  'pendingTransactions.set(sentMsg.result.message_id.toString(), extracted);\n    }\n\n    broadcastStatus(\"Completed\");\n    return ok();'
);

// Catch block
code = code.replace(
  'console.error(\'Telegram Webhook Error:\', errMsg);\n\n    // CRITICAL:',
  'console.error(\'Telegram Webhook Error:\', errMsg);\n\n    broadcastStatus(\"Error\");\n\n    // CRITICAL:'
);

fs.writeFileSync('app/api/telegram-webhook/route.ts', code);
console.log("Replaced");
