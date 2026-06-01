// Native global fetch will be used

const supabaseUrl = 'https://supabasekong-m86nl82q0awvxc0zlzsoddvm.147.15.114.255.sslip.io';
const anonKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3OTkwNDg2MCwiZXhwIjo0OTM1NTc4NDYwLCJyb2xlIjoiYW5vbiJ9.awYIFK9gCQ9JQNbbStRQy1T2dGjH0fqZaimmfrQeVo4';

async function test() {
  console.log('Testing delete via POST method override...');
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/collaborators?id=eq.TEST_ID_123&method=DELETE`, {
      method: 'POST',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    const text = await response.text();
    console.log('Response body:', text);
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

test();
