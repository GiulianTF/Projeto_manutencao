# Arquitetura — Gestão de Manutenção

Este documento cobre o item 17 do [prompt inicial](PROMPT_INICIAL.md): a stack, a estrutura, o banco e
os fluxos, antes da implementação por etapas.

> **Pendente:** a análise da planilha **"Planejamento Atividades Manutenção-1.xlsx"** (abas, colunas,
> mesclagens, estilos e fórmulas). O arquivo ainda não está no repositório. Quando ele chegar, a seção
> [Exportação para Excel](#9-estratégia-de-geração-do-excel) recebe o mapeamento célula a célula, e o
> modelo do banco pode ganhar algum campo que a planilha use (por exemplo, *local* ou *setor*).

---

## 1. Stack recomendada

| Camada | Escolha | Por quê |
|---|---|---|
| Front-end | **React 19 + TypeScript + Vite** | Formulários, filtros e calendário ficam simples com componentes; o build é estático e barato de hospedar |
| Visual | **Design system próprio em CSS puro** (tokens em variáveis CSS + componentes BEM) | Sem dependência de framework de UI; tema claro/escuro automático; fácil de ajustar |
| Ícones | lucide-react | Leve, consistente |
| Rotas | react-router 7 | Padrão de mercado |
| Backend | **Supabase** (Postgres + Auth + Storage + Realtime) | Login, banco, fotos e sincronização em tempo real num só serviço, com plano gratuito suficiente para 2 usuários |
| Excel | **ExcelJS** (no navegador) | Abre o `.xlsx` modelo e preserva estilos, larguras, mesclagens e fórmulas ao preencher |
| Hospedagem | Cloudflare Pages / Vercel / Netlify (grátis) | Só arquivos estáticos; HTTPS incluso |

Não há servidor próprio para manter: o app conversa direto com o Supabase, e a segurança fica nas
políticas RLS do banco.

## 2. Estrutura de pastas

```
Projeto_manutencao/
├─ docs/                    # arquitetura e prompt inicial
├─ public/
│  └─ templates/            # modelo .xlsx usado pela exportação
├─ supabase/
│  └─ migrations/           # SQL versionado do banco (schema, RLS, triggers)
└─ src/
   ├─ styles/               # DESIGN SYSTEM
   │  ├─ tokens.css         #   cores, espaçamentos, tipografia, status (claro/escuro)
   │  ├─ base.css           #   reset e globais
   │  ├─ components.css     #   botões, cards, badges, campos, chips, alertas…
   │  └─ layout.css         #   sidebar, topbar, bottom nav mobile, login
   ├─ components/
   │  ├─ ui/                # componentes React finos sobre as classes do DS
   │  └─ layout/            # AppLayout + definição do menu
   ├─ data/                 # DataStore: interface + supabaseStore + localStore + hooks
   ├─ features/             # um módulo por domínio (auth, demands, routines, export)
   ├─ pages/                # telas (uma por rota)
   ├─ lib/                  # supabase client, datas, tempo (01h30)
   └─ types/                # tipos de domínio (espelham o banco)
```

Regra: as páginas montam a tela e só falam com `store` (`src/data`). Trocar de backend no futuro
mexe só nessa pasta.

## 3. Modelo do banco

SQL completo em [`supabase/migrations/0001_schema_inicial.sql`](../supabase/migrations/0001_schema_inicial.sql).

```
auth.users ──1:1── profiles (nome, papel, ativo)
                      │
        ┌─────────────┼──────────────────────────┐
        │ criou/alterou/responsável               │ responsável
        ▼                                         ▼
     demands ──1:N── demand_photos            routines ──1:N── routine_occurrences
        │                                    (dia da semana,     (uma por data,
        └──1:N── demand_history               a cada N semanas)   status próprio)
```

| Tabela | Campos principais |
|---|---|
| `profiles` | `full_name`, `role` (`admin`/`tecnico`), `active` |
| `demands` | `code` (nº sequencial), `title`, `description`, `status`, `priority`, `opened_on`, `due_date`, `completed_at`, `observations`, `time_spent_minutes`, `responsible_id`, `created_by`, `updated_by` |
| `demand_photos` | `demand_id`, `kind` (`antes`/`depois`), `storage_path`, `caption` |
| `demand_history` | `demand_id`, `actor_id`, `action`, `field`, `old_value`, `new_value`, `created_at` |
| `routines` | `name`, `description`, `weekday` (0–6), `interval_weeks`, `starts_on`, `responsible_id`, `active` |
| `routine_occurrences` | `routine_id`, `scheduled_date` (único por rotina), `status`, `done_at`, `done_by`, `observations`, `time_spent_minutes` |

Decisões:

- **Tempo em minutos inteiros** (`90`). A tela mostra e aceita `01h30`; somas e médias nos relatórios
  ficam triviais.
- **`opened_on` separado de `created_at`**: a data de criação é editável (útil para lançar demandas
  antigas da planilha), enquanto `created_at` registra quando o registro entrou no sistema.
- **`completed_at` automático**: preenchido por trigger quando o status vira *Concluído* e limpo se a
  demanda for reaberta.
- **Histórico por trigger no banco**: toda alteração de campo gera uma linha, mesmo vinda de outra tela
  ou de um script. O app só lê e formata ("05/10/2026 10:15 – Giulian alterou status para Em andamento").
- **Observações nunca são apagadas** por mudança de status; o histórico guarda as versões anteriores.
- **Pronto para mais usuários**: basta criar o usuário no Supabase Auth; o perfil nasce sozinho. O
  campo `role` permite permissões diferentes no futuro, e `active = false` bloqueia o acesso sem
  apagar o histórico.

## 4. Estrutura das telas

| Menu | Rota | Conteúdo |
|---|---|---|
| Dashboard | `/` | Indicadores (total, por status, atrasadas, próximas do prazo) e lista das demandas abertas |
| Demandas | `/demandas` | Lista com busca, filtros (status, prioridade, prazo, responsável, período); atrasadas em destaque |
| — | `/demandas/nova` | Formulário curto: título, descrição, prioridade, prazo, responsável, fotos "antes" |
| — | `/demandas/:id` | Detalhe: troca de status por chips, observações, fotos antes/depois, tempo gasto, botão **Concluir**, histórico |
| Rotinas | `/rotinas` | Ocorrências da semana (marcar feita/não feita) e cadastro das rotinas |
| Calendário | `/calendario` | Prazos, rotinas, atrasadas e concluídas por dia (fase 2) |
| Relatórios | `/relatorios` | Totais, por status/período, tempo total e médio (fase 2) |
| Exportar Excel | `/exportar` | Escolha do recorte (todas, período, concluídas, pendentes, rotinas) e download |
| Configurações | `/configuracoes` | Usuários e preferências |

**Mobile primeiro para o trabalho de campo:** barra inferior com Início, Demandas, **Nova** (botão
redondo em destaque), Rotinas e Mais. Campos e botões têm no mínimo 48 px de altura. O status muda com
um toque nos chips, sem abrir menus.

## 5. Fluxo de autenticação

1. Os usuários são criados pelo administrador no painel do Supabase (*Authentication → Add user*),
   com e-mail e senha. Não existe cadastro público.
2. O trigger `on_auth_user_created` cria o `profile` (nome vindo de `full_name` ou do e-mail).
3. No app, `/login` chama `signInWithPassword`; a sessão fica salva no navegador e é renovada sozinha.
4. `RequireAuth` protege todas as rotas internas. Sem sessão, redireciona para `/login`.
5. No banco, todas as tabelas têm RLS: só membros ativos (`is_team_member()`) leem ou escrevem.

> **Modo local:** enquanto o `.env.local` não existir, o app roda sem login e guarda os dados no
> próprio navegador (localStorage + IndexedDB para as fotos). As telas usam a interface `DataStore`
> (`src/data/store.ts`), que tem duas implementações, `supabaseStore` e `localStore`, com as mesmas regras.
> Em Configurações dá para criar usuários fictícios e alternar entre eles; duas abas abertas se
> sincronizam, o que simula os dois usuários.

## 6. Fluxo das demandas

```
Nova ──► Pendente ──► Em andamento ──► Concluído
            │   ▲          │   ▲
            ▼   │          ▼   │
      Aguardando material ─┘
            │
            └────────► Cancelado (de qualquer estado)
```

- Qualquer status pode ir para qualquer outro (equipe pequena, sem burocracia). Reabrir uma concluída
  limpa `completed_at`.
- **Concluir** pede (opcionalmente) foto "depois" e tempo gasto, numa ação só.
- **Atrasada** = prazo anterior a hoje e status diferente de Concluído/Cancelado. **Próxima do prazo** =
  vence em até 3 dias. Ambas são calculadas na hora, sem coluna no banco.
- **Tempo real:** o app assina o Realtime de `demands`/`demand_photos`; quando um usuário salva, a tela
  do outro atualiza sozinha.

## 7. Fluxo das rotinas

- A **rotina** é o modelo ("Verificar iluminação, toda segunda, a cada 1 semana").
- A **ocorrência** é a execução de uma data específica, com status, observação e tempo próprios.
- A função `generate_routine_occurrences(de, até)` cria as ocorrências que faltam. Ela é idempotente
  (`unique(routine_id, scheduled_date)`), então pode rodar quantas vezes quiser:
  - o app chama ao abrir Dashboard/Rotinas (próximos 14 dias);
  - opcionalmente, um `pg_cron` semanal garante a geração mesmo sem ninguém abrir o app.
- Desativar a rotina para de gerar ocorrências novas e mantém as antigas.
- Rotinas não viram demandas. Se a inspeção encontrar um problema, o botão "Abrir demanda" cria uma
  demanda já preenchida (melhoria futura).

## 8. Estratégia de armazenamento das fotos

- Bucket **privado** `demand-photos` no Supabase Storage; caminho `demandas/<demand_id>/<antes|depois>/<uuid>.jpg`.
- `<input type="file" accept="image/*" capture="environment">` abre a câmera traseira no celular; no
  computador abre o seletor de arquivos.
- **Compressão no navegador antes do envio** (canvas → JPEG, lado maior de 1600 px, qualidade ~0,8):
  uma foto de 4 MB do celular vira ~300 KB. O envio fica rápido no 4G e o plano gratuito (1 GB) comporta
  milhares de fotos.
- Exibição por URL assinada temporária (o bucket não é público).
- A linha em `demand_photos` liga a foto à demanda; apagar a demanda apaga as linhas (cascade), e o app
  remove os arquivos do bucket.

## 9. Estratégia de geração do Excel

1. O modelo original fica em `public/templates/planejamento-manutencao.xlsx`, versionado no repositório.
2. No clique em **Exportar para Excel**, o app:
   1. busca no Supabase os dados do recorte escolhido (todas, período, concluídas, pendentes ou rotinas);
   2. carrega o modelo com **ExcelJS** (`workbook.xlsx.load`);
   3. preenche as abas existentes nas linhas e colunas do modelo, copiando o estilo da linha-modelo para
      cada linha nova (bordas, fontes, preenchimento, formato de data) e mantendo fórmulas, larguras,
      mesclagens e nomes das abas;
   4. coloca os campos novos (prazo, responsável, prioridade, tempo gasto) **em colunas à direita do
      bloco original** ou numa aba extra "Detalhes", com o mesmo estilo, sem deslocar o layout existente;
   5. gera o arquivo e baixa `Planejamento Atividades Manutenção - <data>.xlsx`.
3. Tudo roda no navegador, sem servidor e sem custo.

O que o ExcelJS preserva: estilos, bordas, larguras, alturas, mesclagens, fórmulas, formatos numéricos,
validação de dados e congelamento de painéis. Pode se perder: gráficos, imagens embutidas, segmentações
e parte da formatação condicional avançada. O inventário da planilha real vai dizer se algum desses
itens existe e, se existir, qual a alternativa.

**Como está implementado** (`src/features/export/`):

- `columns.ts`: as colunas exportadas (demandas, rotinas e ocorrências), com largura, formato e valor.
- `excel.ts`: a geração. Ela tem três caminhos:
  1. **Sem modelo** em `public/templates`: gera o layout padrão. A aba *Demandas* tem título mesclado,
     cabeçalho, bordas, zebra, cor por status, atrasadas em vermelho, filtro, painel congelado, tempo em
     `[h]:mm` e uma linha de total com `SUM`. Junto vão as abas *Resumo* (fórmulas `COUNTIF`/`SUM` que
     apontam para *Demandas*), *Rotinas* e *Ocorrências*.
  2. **Com modelo, sem mapeamento**: mantém todas as abas do modelo intactas e acrescenta as abas do sistema.
  3. **Com modelo e mapeamento** (`templateMapping.ts`): preenche a aba do modelo a partir da linha-modelo,
     copiando o estilo dela. Colunas que o modelo não tem vão à direita do bloco original, com o estilo
     do cabeçalho original.

**Mapeamento planilha ↔ banco:** a definir após a análise do arquivo. Basta preencher
`TEMPLATE_MAPPING` (aba, linha do cabeçalho, primeira linha de dados e letra de cada coluna).

## 10. Backup

- O Supabase gratuito **não** inclui backups diários automáticos (existem a partir do plano Pro).
- Já implementado: **Configurações → Baixar backup** gera um JSON com todas as tabelas. A exportação
  Excel serve como cópia legível.
- Proposta: um GitHub Action semanal que roda `pg_dump` do banco e guarda o arquivo como artifact
  privado (grátis).
- As fotos ficam no Storage; um script opcional sincroniza o bucket para um disco ou Drive.

## 11. Plano de etapas

**Fase 1, núcleo:**

| # | Etapa | Estado |
|---|---|---|
| 0 | Scaffold, design system, layout responsivo, schema do banco | ✅ |
| 1 | Login (Supabase Auth) + perfis | ✅ código pronto; falta criar o projeto Supabase |
| 2 | Dashboard com indicadores reais, painéis de atrasadas, próximas e em aberto, e rotinas de hoje | ✅ |
| 3–4 | Cadastro e edição de demandas, com lista, busca e filtros na URL | ✅ |
| 5 | Status por chips, com atualização em tempo real | ✅ |
| 6 | Fotos antes/depois (câmera ou galeria, compressão, visualizador) | ✅ |
| 7 | Observações | ✅ |
| 8 | Tempo gasto (`01h30`, com atalhos +15min/+30min/+1h) | ✅ |
| 9 | Rotinas: cadastro, ocorrências da semana, feita/não realizada | ✅ |
| 10 | Exportação Excel (todas, período, concluídas, pendentes, rotinas) | ✅ layout padrão; 🟡 falta o mapeamento do modelo .xlsx |

**Fase 2:**

| Etapa | Estado |
|---|---|
| Calendário (prazos, atrasadas, concluídas, rotinas; clique abre a demanda) | ✅ |
| Histórico na tela da demanda | ✅ |
| Relatórios (realizados, por status, por mês, por responsável, tempos, rotinas) | ✅ |
| Backup JSON | ✅ |
| Cronômetro, backup automatizado (`pg_dump`), "abrir demanda a partir da rotina" | ⏳ futuro |
