import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('❌ GEMINI_API_KEY não encontrada no .env');
  process.exit(1);
}

console.log(`🔑 Chave detectada: ${apiKey.slice(0, 6)}...${apiKey.slice(-4)} (${apiKey.length} chars)`);
console.log('🤖 Modelo: gemini-2.5-flash-lite');
console.log('📡 Enviando ping para Gemini...\n');

try {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-lite',
    contents: 'Responda apenas com a palavra "OK" se você está funcionando.',
  });

  console.log('✅ SUCESSO! Resposta do Gemini:');
  console.log(`   "${response.text?.trim()}"`);
  console.log('\n🎉 Chave válida e modelo acessível. Pode seguir para o Supabase.');
} catch (err) {
  console.error('❌ FALHOU.');
  console.error(`   Erro: ${err?.message ?? err}`);
  if (err?.status) console.error(`   Status: ${err.status}`);
  console.error('\n💡 Provável causa: chave inválida, formato errado, ou sem acesso ao modelo.');
  process.exit(2);
}
