# Gestão de Manutenção

Sistema web para a equipe de manutenção controlar **demandas** (problemas e serviços que surgem) e
**rotinas** (atividades preventivas periódicas). Substitui a planilha *Planejamento Atividades
Manutenção* e exporta de volta para ela.

- **Stack:** React 19 + TypeScript + Vite, design system em CSS puro, Supabase (Auth, Postgres,
  Storage, Realtime), ExcelJS.
- **Documentação:** [arquitetura](docs/ARQUITETURA.md) · [prompt inicial](docs/PROMPT_INICIAL.md)

## Rodando localmente

Requer Node 20 ou mais recente.

```bash
npm install
npm run dev
```

O app abre em `http://localhost:5191`; no celular, use o IP do PC na mesma rede.

Sem `.env.local`, o app roda em **modo local**: sem login, com os dados guardados no próprio navegador.
Dá para usar e testar tudo, inclusive com usuários fictícios criados em Configurações. Duas abas
abertas se sincronizam.

## Configurando o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, rode [`supabase/migrations/0001_schema_inicial.sql`](supabase/migrations/0001_schema_inicial.sql) e depois
   [`supabase/migrations/0002_rotinas_varios_dias.sql`](supabase/migrations/0002_rotinas_varios_dias.sql).
   Se o projeto Supabase já existe e aplicou a migração 0001, rode somente a 0002.
3. Em **Authentication → Users**, crie os usuários da equipe (e-mail e senha). Opcional: em *user
   metadata*, informe `{"full_name": "Nome"}`.
4. Copie `.env.example` para `.env.local` e preencha a URL e a chave *publishable/anon* (em
   *Project Settings → API*).

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Checagem de tipos + build de produção em `dist/` |
| `npm run preview` | Serve o build localmente |
| `npm run typecheck` | Só a checagem de tipos |

## Design system

Tokens (cores, espaçamentos, tipografia, cores de status e prioridade, tema claro e escuro) ficam em
[`src/styles/tokens.css`](src/styles/tokens.css). Os componentes CSS ficam em
[`src/styles/components.css`](src/styles/components.css), e os wrappers React em
[`src/components/ui`](src/components/ui). Nenhum componente usa cor ou espaçamento solto: sempre
`var(--token)`.
