const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
  const fileStream = fs.createReadStream('C:\\Users\\ACER\\.gemini\\antigravity-ide\\brain\\95cc0aeb-a814-4482-ba87-421b24fefb62\\.system_generated\\logs\\transcript_full.jsonl');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let latestContent = null;
  let fileState = [];

  for await (const line of rl) {
    try {
      const obj = JSON.parse(line);
      
      // Track file reads (view_file outputs)
      if (obj.type === 'VIEW_FILE' && obj.content && obj.content.includes('c:/Users/ACER/Downloads/Rekahan%20Harapan/MaMoneeeyy/app/page.tsx')) {
         // This has line numbers and is truncated, hard to parse
      }

      // Track file writes
      if (obj.tool_calls) {
        for (const call of obj.tool_calls) {
          if (call.name === 'write_to_file' && call.args && call.args.TargetFile && call.args.TargetFile.endsWith('app\\page.tsx')) {
            latestContent = call.args.CodeContent;
          }
        }
      }
    } catch (e) {}
  }

  if (latestContent) {
    fs.writeFileSync('C:\\Users\\ACER\\Downloads\\Rekahan Harapan\\MaMoneeeyy\\scratch_recovered_page.tsx', latestContent);
    console.log('Recovered from write_to_file!');
  } else {
    console.log('No write_to_file found. We need to check replace_file_content or multi_replace_file_content.');
  }
}

processLineByLine();
