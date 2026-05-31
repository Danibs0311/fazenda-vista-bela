import fs from 'fs';
import readline from 'readline';

async function search() {
  const fileStream = fs.createReadStream('C:\\Users\\danie\\.gemini\\antigravity\\brain\\b89ef5ce-43ac-42e5-ba20-9e3347463c76\\.system_generated\\logs\\transcript.jsonl');
  
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  console.log('Searching transcript.jsonl for ssh.exe...');
  for await (const line of rl) {
    if (line.includes('ssh.exe')) {
      try {
        const obj = JSON.parse(line);
        if (obj.tool_calls) {
          for (const tc of obj.tool_calls) {
            if (tc.name === 'run_command' && tc.args && tc.args.CommandLine) {
              console.log('CommandLine:', tc.args.CommandLine);
            }
          }
        }
      } catch (e) {
        console.log('Raw line match:', line.substring(0, 500));
      }
    }
  }
}

search();
