async function testSpawn() {
  console.log('Sending request to /v1/accounts/spawn for 1 account...');
  const res = await fetch('http://localhost:8128/v1/accounts/spawn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count: 1 })
  });

  if (!res.ok) {
    console.error('HTTP error:', res.status, await res.text());
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        console.log('[SSE EVENT]', line.slice(6));
      }
    }
  }
  console.log('Spawn test stream closed.');
}

testSpawn().catch(console.error);
