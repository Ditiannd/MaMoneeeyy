const fs = require('fs');
const filePath = 'app/api/telegram-webhook/route.ts';
let code = fs.readFileSync(filePath, 'utf8');

const oldFunc = `function broadcastStatus(message: string) {
  supabase.channel('webhook-status').send({
    type: 'broadcast',
    event: 'stage',
    payload: { message }
  }).catch(console.error);
}`;

const newFunc = `const broadcastStatus = async (message: string) => {
  const channel = supabase.channel('webhook-status');
  await new Promise((resolve) => {
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.send({
          type: 'broadcast',
          event: 'stage',
          payload: { message }
        });
        supabase.removeChannel(channel);
        resolve(true);
      }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        resolve(false);
      }
    });
  });
};`;

code = code.replace(oldFunc, newFunc);
code = code.replace(/([ \t]*)broadcastStatus\(/g, '$1await broadcastStatus(');

fs.writeFileSync(filePath, code);
console.log("Updated route.ts successfully.");
