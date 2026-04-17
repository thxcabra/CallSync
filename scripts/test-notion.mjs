import 'dotenv/config';
import { Client } from '@notionhq/client';

const token = process.env.NOTION_API_TOKEN;
const rootPageId = process.env.NOTION_ROOT_PAGE_ID;

const missing = [];
if (!token) missing.push('NOTION_API_TOKEN');
if (!rootPageId) missing.push('NOTION_ROOT_PAGE_ID');
if (missing.length) {
  console.error(`❌ Variáveis ausentes no .env: ${missing.join(', ')}`);
  process.exit(1);
}

console.log(`🔑 Token: ${token.slice(0, 8)}...${token.slice(-4)} (${token.length} chars)`);
console.log(`📄 Root page ID: ${rootPageId}\n`);

const notion = new Client({ auth: token });
let allOk = true;

console.log('🤖 [1/3] Validando token (bot.me)...');
try {
  const me = await notion.users.me();
  console.log(`   ✅ Bot autenticado: "${me.name}" (${me.type})`);
  if (me.bot?.workspace_name) console.log(`   📁 Workspace: ${me.bot.workspace_name}\n`);
  else console.log('');
} catch (err) {
  console.error(`   ❌ Falhou: ${err?.message ?? err}\n`);
  allOk = false;
}

console.log('📄 [2/3] Acessando página raiz (verifica se a integração foi conectada à página)...');
try {
  const page = await notion.pages.retrieve({ page_id: rootPageId });
  const titleProp = Object.values(page.properties || {}).find((p) => p.type === 'title');
  const title = titleProp?.title?.[0]?.plain_text ?? '(sem título)';
  console.log(`   ✅ Página acessível: "${title}"`);
  console.log(`   🔗 URL: ${page.url}\n`);
} catch (err) {
  console.error(`   ❌ Falhou: ${err?.message ?? err}`);
  if (err?.code === 'object_not_found') {
    console.error('   💡 A integração CallSync NÃO foi conectada a essa página.');
    console.error('       No Notion: abra a página → "..." (canto sup. direito) → Connections → + Connect to → CallSync.\n');
  } else if (err?.code === 'unauthorized') {
    console.error('   💡 Token inválido ou expirado.\n');
  } else {
    console.error('');
  }
  allOk = false;
}

console.log('📂 [3/3] Listando conteúdo da página raiz (children blocks)...');
try {
  const children = await notion.blocks.children.list({ block_id: rootPageId, page_size: 10 });
  console.log(`   ✅ ${children.results.length} bloco(s) encontrados na raiz.`);
  if (children.results.length === 0) {
    console.log('   ℹ️  Página vazia — vamos criar databases (Calendário, Kanban, Histórico) via API depois.\n');
  } else {
    children.results.slice(0, 5).forEach((b, i) => {
      console.log(`      ${i + 1}. [${b.type}]`);
    });
    console.log('');
  }
} catch (err) {
  console.error(`   ❌ Falhou: ${err?.message ?? err}\n`);
  allOk = false;
}

if (allOk) {
  console.log('🎉 Notion 100% conectado e a integração tem acesso à página raiz.');
} else {
  console.error('💥 Pelo menos um teste falhou.');
  process.exit(2);
}
