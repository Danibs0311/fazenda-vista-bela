import fs from 'fs';
import path from 'path';

const searchDir = 'C:\\Users\\danie';
const excelFiles = [];

function scan(dir, depth = 0) {
  if (depth > 4) return; // Limit depth to avoid scanning too many files
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      let stat;
      try {
        stat = fs.statSync(fullPath);
      } catch (e) {
        continue;
      }
      
      if (stat.isDirectory()) {
        // Skip common heavy folders
        if (
          file.startsWith('.') || 
          file === 'node_modules' || 
          file === 'AppData' || 
          file === 'Local Settings' || 
          file === 'Cookies' ||
          file === 'My Documents' ||
          file === 'NetHood' ||
          file === 'PrintHood' ||
          file === 'Recent' ||
          file === 'SendTo' ||
          file === 'Start Menu' ||
          file === 'Templates' ||
          file === 'Application Data'
        ) {
          continue;
        }
        scan(fullPath, depth + 1);
      } else {
        const ext = path.extname(file).toLowerCase();
        if (ext === '.xlsx' || ext === '.xlsm' || ext === '.xls') {
          // If name contains "FAZENDA" or "VISTA" or "BELA" or "COLHEITA" or similar, or size > 100kb
          if (stat.size > 20000 || /fazenda|vista|bela|colheita|cadastro|colaborador/i.test(file)) {
            excelFiles.push({ path: fullPath, size: stat.size, mtime: stat.mtime });
          }
        }
      }
    }
  } catch (e) {
    // Ignore permission errors
  }
}

console.log(`Starting scan of ${searchDir}...`);
scan(searchDir);
console.log(`\nScan finished. Found ${excelFiles.length} Excel files:`);
console.table(excelFiles);
