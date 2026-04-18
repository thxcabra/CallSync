# CallSync

Ferramenta interna da **Moic Digital** para documentar, analisar e sincronizar calls com clientes — do áudio ou transcrição até o Notion, em poucos cliques.

---

## O que é

CallSync centraliza o fluxo pós-call da agência: upload de áudio ou transcrição manual → transcrição automática → análise por IA (resumo, tarefas, feedback, sentimento) → sync direto para o workspace do projeto no Notion.

Cada projeto tem seu próprio espaço isolado no Notion (Kanban, Calendário de Posts, Histórico de Calls), criado automaticamente na primeira sincronização.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Vite + React 18 + TypeScript + Tailwind v4 |
| Backend | Node.js + Express + TypeScript |
| Banco de dados | Supabase (PostgreSQL) |
| IA | Google Gemini 2.0 Flash |
| Transcrição | Gemini (via inline audio) |
| Integração | Notion API (`@notionhq/client`) |
| Roteamento | React Router v6 |
| Estado/cache | TanStack Query v5 |

---

## Funcionalidades

### Projetos
- Criação e edição de projetos com: nome, cliente, descrição, status, equipe (gestor, analistas, estrategistas), contatos do cliente, links de referência e documentos de campanha
- Filtro por sentimento (Positivo / Neutro / Negativo) e status na listagem
- Link do workspace Notion adicionado automaticamente ao projeto na primeira sync

### Calls
- Upload de áudio (mp3, mp4, wav, m4a, webm — até 500 MB) ou transcrição manual
- Transcrição automática via Gemini com status em tempo real
- Histórico de calls por projeto com data, participantes e status

### Análise por IA
- Acionada manualmente após transcrição
- Gera automaticamente:
  - **Resumo executivo** da call
  - **Sentimento geral** (Positivo / Neutro / Negativo) com justificativa
  - **Tasks** com responsável, prazo e prioridade (Alta / Média / Baixa)
  - **Anotações** por tópico
  - **Feedback do cliente** categorizado por sentimento

### Integração com Notion
- **Workspace por projeto**: na primeira sync, cria automaticamente no Notion:
  - Página raiz do projeto
  - Banco de dados Kanban (com propriedades: Status, Prioridade, Responsável, Gestor, Analistas, Data)
  - Banco de dados Calendário de Posts (com Sentimento como select)
  - Página "Histórico de Calls"
- **Dois modos de sync**:
  - *Enviar automaticamente* → envia todos os itens sem revisão
  - *Revisar Outputs* → modal interativo onde o usuário aprova ou rejeita cada item antes de enviar
- **Itens sincronizados por call**:
  - Entrada no Calendário de Posts
  - Tasks no Kanban (uma card por task, com todas as propriedades preenchidas)
  - Página de histórico com resumo, anotações, feedback, tasks e transcrição completa
- **Deduplicação por título**: antes de criar, arquiva entradas anteriores com o mesmo título
- **Indicador de "já enviado"** no modal de revisão, com opção de reescrever

---

## Estrutura do projeto

```
CallSync/
├── frontend/          # Vite + React
│   └── src/
│       ├── pages/         # Rotas principais
│       ├── components/    # Componentes reutilizáveis
│       └── lib/           # Queries, tipos, API client
├── backend/           # Express + TypeScript
│   └── src/
│       ├── routes/        # Endpoints REST
│       ├── services/      # Gemini, Notion
│       ├── middleware/     # Autenticação de autor
│       └── lib/           # Supabase, env, errors
├── supabase/
│   └── migrations/    # Histórico de migrações SQL
└── env                # Variáveis de ambiente (não commitado)
```

---

## Setup

### Pré-requisitos
- Node.js 18+
- Conta Supabase
- Chave de API do Google Gemini
- Integration do Notion criada em [notion.so/my-integrations](https://www.notion.so/my-integrations)

### 1. Variáveis de ambiente

Copie o arquivo `env` para `.env` na raiz e preencha:

```env
GEMINI_API_KEY=...
SUPABASE_URL=...
SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...
NOTION_API_TOKEN=...
NOTION_ROOT_PAGE_ID=...   # ID da página raiz onde os projetos serão criados
PORT=3002
NODE_ENV=development
```

### 2. Banco de dados

No Supabase SQL Editor, execute as migrations em ordem:

```
supabase/migrations/0001_initial.sql
supabase/migrations/0002_*.sql
...
supabase/migrations/0007_projects_notion_page_id.sql
```

### 3. Backend

```bash
cd backend
npm install
npm run dev
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 5. Notion

1. Crie uma integration em [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Copie o token para `NOTION_API_TOKEN`
3. Crie uma página raiz no Notion e copie o ID para `NOTION_ROOT_PAGE_ID`
4. Conecte a integration à página raiz: abra a página → `...` → Conexões → adicione a integration

A partir daí, tudo é automático: na primeira sync de cada projeto, o CallSync cria o workspace completo no Notion.

---

## Fluxo de uso

```
1. Criar projeto (nome, cliente, equipe)
2. Adicionar call (áudio ou transcrição)
3. Transcrever → Analisar
4. Revisar análise (resumo, tasks, feedback)
5. Enviar para Notion (revisão opcional)
   └── Na primeira vez: cria Kanban + Calendário + Histórico no Notion
       e adiciona o link do projeto no CallSync
```

---

## Possíveis expansões

### Troca ou adição de provedores de IA
O serviço de análise (`backend/src/services/analyze.ts`) e de transcrição (`transcribe.ts`) são isolados. Substituir ou adicionar modelos é direto:
- **OpenAI GPT-4o / Whisper** — transcrição mais precisa para sotaques específicos
- **Anthropic Claude** — análise com raciocínio mais longo (ideal para calls densas)
- **AssemblyAI / Deepgram** — transcrição especializada com diarização por falante
- **Múltiplos modelos em paralelo** — comparar outputs e deixar o usuário escolher

### Uso para prospecção de clientes
Com pequenas adaptações, o CallSync pode ser usado em vendas:
- Trocar "Projeto" por "Lead" e "Call" por "Reunião de prospecção"
- Adicionar campos de funil (etapa, probabilidade de fechamento, valor estimado)
- Análise de IA focada em: objeções identificadas, próximos passos, tom do prospect
- Dashboard de pipeline com sentimento acumulado por lead

### Automações e integrações adicionais
- **Slack / WhatsApp** — notificação automática pós-call com resumo e tasks para o grupo do cliente
- **Google Calendar** — criar evento de follow-up automaticamente com data extraída da call
- **Email automático** — envio de ata da reunião para os participantes
- **Webhooks** — disparar ações externas em eventos (análise concluída, sync feito)

### Melhorias de produto
- **Autenticação real** — login com email/senha ou SSO (Supabase Auth já está na stack)
- **Permissões por projeto** — membros só veem os projetos que participam
- **Comentários e aprovação** — fluxo de revisão colaborativa das análises antes do sync
- **Dashboard analítico** — sentimento médio por cliente ao longo do tempo, taxa de tasks concluídas
- **Busca full-text** — pesquisar em transcrições e resumos de todas as calls
- **Gravação direta** — capturar áudio no browser sem precisar de upload

### Infraestrutura
- **Deploy em produção** — Render / Railway para o backend, Vercel para o frontend
- **Fila de processamento** — BullMQ + Redis para transcrição/análise assíncrona sem timeout
- **Storage próprio** — migrar de Supabase Storage para S3/R2 para reduzir custos em volume alto