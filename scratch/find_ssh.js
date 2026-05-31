import fs from 'fs';
import readline from 'readline';

async function search() {
  const fileStream = fs.createReadStream('C:\\Users\\danie\\.gemini\\antigravity\\brain\\b89ef5ce-43ac-42e5-ba20-9e3347463c76\\.system_generated\\logs\\transcript.jsonl');
  
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  console.log('Searching transcript.jsonl for ssh...');
  for await (const line of rl) {
    if (line.toLowerCase().includes('ssh') || line.toLowerCase().includes('.key') || line.toLowerCase().includes('.pem')) {
      // parse and print relevant parts
      try {
        const obj = JSON.parse(line);
        if (obj.tool_calls) {
          console.log('Step:', obj.step_index);
          console.log(JSON.stringify(obj.tool_calls, null, 2));
        } else if (obj.content && obj.content.includes('ssh')) {
          console.log('Content Step:', obj.step_index);
          console.log(obj.content.substring(0, 500));
        }
      } catch (e) {
        if (line.includes('ssh')) {
          console.log('Raw match:', line.substring(0, 300));
        }
      }
    }
  }
}

search();
