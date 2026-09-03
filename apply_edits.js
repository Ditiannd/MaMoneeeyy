const fs = require('fs');
const readline = require('readline');

async function run() {
  const fileStream = fs.createReadStream('C:\\Users\\ACER\\.gemini\\antigravity-ide\\brain\\95cc0aeb-a814-4482-ba87-421b24fefb62\\.system_generated\\logs\\transcript_full.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let code = fs.readFileSync('scratch_recovered_page.tsx', 'utf8');
  let editCount = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      if (obj.tool_calls) {
        for (const call of obj.tool_calls) {
          if (call.name === 'replace_file_content' || call.name === 'multi_replace_file_content') {
             const args = call.args;
             if (args.TargetFile && (args.TargetFile.endsWith('app\\page.tsx') || args.TargetFile.endsWith('app/page.tsx'))) {
                 if (call.name === 'replace_file_content') {
                    const target = args.TargetContent;
                    const replacement = args.ReplacementContent;
                    if (code.includes(target)) {
                       code = code.replace(target, replacement);
                       editCount++;
                       console.log('Applied replace_file_content');
                    } else {
                       console.log('replace_file_content target not found, skipping');
                    }
                 } else if (call.name === 'multi_replace_file_content') {
                    for (const chunk of args.ReplacementChunks) {
                       if (code.includes(chunk.TargetContent)) {
                          code = code.replace(chunk.TargetContent, chunk.ReplacementContent);
                          editCount++;
                          console.log('Applied chunk in multi_replace_file_content');
                       } else {
                          console.log('Chunk TargetContent not found, skipping');
                       }
                    }
                 }
             }
          }
        }
      }
    } catch(e) {}
  }

  // Also apply my final multi_replace_file_content from my previous message
  const myTarget1 = `import { Wallet, ArrowDownRight, ArrowUpRight, Coffee, Car, Zap, Clapperboard, ShoppingBag, Heart, MoreHorizontal, CreditCard, Landmark, Coins, LogIn, LineChart, Loader2, PiggyBank, Briefcase, Banknote, Receipt, ArrowRightLeft, TrendingUp, HandCoins, Building2, ShoppingCart, Gem } from "lucide-react";\nimport { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";`;
  const myReplace1 = `import { ArrowDownRight, ArrowUpRight, Coffee, Car, Zap, Clapperboard, ShoppingBag, Heart, MoreHorizontal, LineChart, Loader2 } from "lucide-react";\nimport { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";\nimport { IconRenderer } from "@/components/IconRenderer";`;
  
  if (code.includes(myTarget1)) {
     code = code.replace(myTarget1, myReplace1);
     console.log('Applied my final import cleanup');
  } else {
     // try alternative target due to earlier state
     const myTarget1alt = `import { Wallet, ArrowDownRight, ArrowUpRight, Coffee, Car, Zap, Clapperboard, ShoppingBag, Heart, MoreHorizontal, CreditCard, Landmark, Coins, LogIn, LineChart, Loader2 } from "lucide-react";\nimport { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";`;
     if (code.includes(myTarget1alt)) {
         code = code.replace(myTarget1alt, myReplace1);
         console.log('Applied my final import cleanup (alt)');
     } else {
         console.log('Could not find my final import target');
     }
  }

  const myTarget2 = `const ICON_OPTIONS = {\n  Wallet, CreditCard, Landmark, PiggyBank, Coins, Briefcase, Banknote, Receipt, ArrowRightLeft, TrendingUp, HandCoins, Building2, ShoppingCart, Gem\n};\ntype IconName = keyof typeof ICON_OPTIONS;\nconst IconRenderer = ({ name, className }: { name?: string, className?: string }) => {\n  if (!name || !(name in ICON_OPTIONS)) {\n    return <Wallet className={className} />;\n  }\n  const Icon = ICON_OPTIONS[name as IconName];\n  return <Icon className={className} />;\n};`;
  if (code.includes(myTarget2)) {
     code = code.replace(myTarget2, ``);
     console.log('Applied my final icon options cleanup');
  } else {
     console.log('Could not find my final icon options target');
  }

  fs.writeFileSync('app/page.tsx', code);
  console.log(`Wrote app/page.tsx with ${editCount} edits applied from history.`);
}
run();
