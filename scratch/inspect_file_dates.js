import fs from 'fs';
import path from 'path';

const file1Path = path.resolve('ULTIMA FAZENDA BELA VISTA FINAL - Vlele atualizado18-09.xlsm');
const file2Path = path.resolve('../FAZENDA BELA VISTA FINAL.xlsm');

try {
  const stat1 = fs.statSync(file1Path);
  const stat2 = fs.statSync(file2Path);
  
  console.log('File 1 (ULTIMA FAZENDA BELA VISTA FINAL - Vlele atualizado18-09.xlsm):');
  console.log(`- Modified: ${stat1.mtime}`);
  console.log(`- Size: ${stat1.size} bytes`);

  console.log('\nFile 2 (FAZENDA BELA VISTA FINAL.xlsm):');
  console.log(`- Modified: ${stat2.mtime}`);
  console.log(`- Size: ${stat2.size} bytes`);
  
} catch (err) {
  console.error('Error:', err.message);
}
