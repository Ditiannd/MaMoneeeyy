const fs = require('fs');
const path = require('path');

function findPage(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const res = path.resolve(dir, file.name);
    if (file.isDirectory()) {
      findPage(res);
    } else if (res.endsWith('.map')) {
      try {
        const data = JSON.parse(fs.readFileSync(res, 'utf8'));
        if (data.sources) {
          const idx = data.sources.findIndex(s => s.includes('app/page.tsx'));
          if (idx !== -1 && data.sourcesContent && data.sourcesContent[idx]) {
            console.log(`Found in ${res}`);
            fs.writeFileSync('C:\\Users\\ACER\\Downloads\\Rekahan Harapan\\MaMoneeeyy\\scratch_recovered_page.tsx', data.sourcesContent[idx]);
            process.exit(0);
          }
        }
      } catch(e) {}
    }
  }
}

findPage('C:\\Users\\ACER\\Downloads\\Rekahan Harapan\\MaMoneeeyy\\.next');
