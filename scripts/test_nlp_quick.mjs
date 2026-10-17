async function test() {
  const tests = [
    { text: 'I live in Maharashtra, in Thane district.', lang: 'en' },
    { text: 'I was born in 1986.', lang: 'en' },
    { text: 'I was born in 1986 and my annual income is 250000 rupees.', lang: 'en' },
    { text: 'My monthly salary is 20,000.', lang: 'en' },
    { text: 'मैं महाराष्ट्र के ठाणे जिले में रहता हूँ।', lang: 'hi' },
    { text: 'मी महाराष्ट्रातील ठाणे जिल्ह्यात राहतो.', lang: 'mr' }
  ];

  for (const t of tests) {
    const res = await fetch('http://127.0.0.1:8000/api/nlp/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: t.text, language: t.lang })
    });
    const data = await res.json();
    console.log(`\n=== [${t.lang}] "${t.text}" ===`);
    console.log('Extracted:', JSON.stringify(data.extracted_fields));
    console.log('Sources:', JSON.stringify(data.field_sources));
  }
}

test().catch(console.error);
