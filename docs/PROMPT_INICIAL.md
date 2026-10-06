# Prompt inicial do projeto

Requisitos originais que definiram o sistema. A resposta de arquitetura está em [ARQUITETURA.md](ARQUITETURA.md).

---

Quero desenvolver um sistema web de gerenciamento de manutenção para uma equipe pequena.

O objetivo é substituir o controle de manutenção atualmente feito através de uma planilha Excel por um sistema web simples, rápido e fácil de usar.

IMPORTANTE:
Antes de desenvolver, analise o arquivo Excel anexado chamado:

"Planejamento Atividades Manutenção-1.xlsx"

Esse arquivo é o modelo que atualmente utilizamos para controlar as atividades de manutenção.

A exportação do sistema para Excel deverá respeitar o modelo existente, mantendo o máximo possível a estrutura, organização, títulos, colunas, formatação e lógica da planilha original.

## 1. Usuários e login

O sistema deverá possuir login.

Inicialmente existirão apenas 2 usuários da equipe de manutenção.

Os dois usuários deverão conseguir:

- Fazer login individualmente;
- Visualizar todas as demandas;
- Criar novas demandas;
- Editar demandas existentes;
- Alterar status;
- Adicionar observações;
- Adicionar fotos;
- Registrar tempo gasto;
- Marcar demandas como concluídas;
- Criar e editar rotinas semanais.

As alterações feitas por qualquer um dos dois usuários deverão aparecer para o outro automaticamente.

Não deve existir divisão de chamados por usuário nesta primeira versão.

O sistema deve ser preparado para futuramente permitir mais usuários.

## 2. Cadastro de demandas

Criar uma tela para cadastrar uma nova demanda de manutenção.

Campos:

- Título da demanda;
- Descrição detalhada;
- Data de criação;
- Prazo/data limite;
- Status;
- Prioridade;
- Observações;
- Foto antes;
- Foto depois;
- Tempo gasto na execução;
- Responsável pela execução;
- Data de conclusão.

Status disponíveis:

- Pendente
- Em andamento
- Aguardando material
- Concluído
- Cancelado

O status deverá ser selecionado através de um campo visual simples.

A prioridade pode possuir:

- Baixa
- Normal
- Alta
- Urgente

## 3. Fotos

Cada demanda poderá possuir:

- Uma ou mais fotos de ANTES;
- Uma ou mais fotos de DEPOIS.

As fotos devem ser armazenadas associadas à respectiva demanda.

Na tela da demanda deverá ser possível visualizar as fotos.

Idealmente permitir tirar a foto diretamente pelo celular ou selecionar uma foto existente.

## 4. Tempo de execução

Cada demanda deverá possuir controle do tempo gasto.

Permitir informar:

- Tempo gasto em horas/minutos;

Exemplo:

01h30

Também pode existir futuramente um cronômetro para iniciar e parar a execução.

Por enquanto, deixar o campo preparado para informar o tempo manualmente.

## 5. Observações

Cada demanda deverá possuir um campo de observações.

Exemplos:

"Necessário comprar madeira."

"Executar no sábado sem chuva."

"Problema resolvido pela equipe de limpeza."

As observações deverão ser preservadas mesmo quando a demanda for concluída ou cancelada.

## 6. Painel principal

Criar um dashboard inicial mostrando as demandas de maneira visual.

Exibir:

- Total de demandas;
- Pendentes;
- Em andamento;
- Aguardando material;
- Concluídas;
- Canceladas;
- Demandas atrasadas;
- Demandas próximas do prazo.

Criar filtros por:

- Status;
- Prioridade;
- Prazo;
- Responsável;
- Período.

Também deve existir uma busca por texto.

A lista de demandas deve mostrar pelo menos:

- Título;
- Status;
- Prioridade;
- Prazo;
- Responsável;
- Tempo gasto.

Demandas atrasadas devem possuir um destaque visual.

## 7. Rotinas semanais

Criar uma área separada chamada "Rotinas".

Nessa área será possível cadastrar atividades que precisam ser realizadas semanalmente.

Exemplos:

- Verificar lâmpadas;
- Verificar torneiras;
- Verificar banheiros;
- Inspecionar esquadrias;
- Verificar áreas externas;
- Verificar equipamentos;
- Limpeza/manutenção preventiva.

Cada rotina deverá possuir:

- Nome;
- Descrição;
- Dia da semana;
- Responsável;
- Periodicidade;
- Ativa/inativa.

O sistema deverá gerar as ocorrências das rotinas semanalmente.

Exemplo:

Rotina:
"Verificar iluminação"

Dia:
Segunda-feira

Toda semana deverá aparecer uma nova ocorrência dessa atividade.

É importante diferenciar:

DEMANDA = problema/serviço que surgiu e precisa ser resolvido.

ROTINA = atividade preventiva que acontece periodicamente.

## 8. Histórico

Cada demanda deverá possuir histórico de alterações.

Registrar:

- Quem criou;
- Quem alterou;
- Alteração realizada;
- Data e hora da alteração.

Exemplo:

05/10/2026 08:30 - Giulian criou a demanda.

05/10/2026 10:15 - Usuário alterou status para "Em andamento".

05/10/2026 13:40 - Usuário adicionou foto depois.

05/10/2026 14:00 - Demanda marcada como concluída.

## 9. Exportação para Excel

Essa é uma das partes MAIS IMPORTANTES do sistema.

O sistema deverá possuir um botão:

"Exportar para Excel"

Ao clicar nele, o sistema deverá buscar os dados armazenados no banco de dados e gerar um arquivo .xlsx.

A exportação deverá utilizar como referência o arquivo:

"Planejamento Atividades Manutenção-1.xlsx"

A planilha exportada deverá manter o máximo possível da aparência e estrutura do modelo original.

Não quero simplesmente uma tabela genérica.

Quero que o sistema preencha automaticamente a planilha com os dados cadastrados no sistema.

A exportação deverá:

- Manter os títulos;
- Manter a estrutura das colunas;
- Manter a formatação;
- Manter os nomes das abas;
- Preservar o layout existente sempre que possível;
- Inserir as novas demandas nos locais corretos;
- Preencher status;
- Preencher datas;
- Preencher observações.

Além disso, os novos campos existentes no sistema (prazo, responsável, prioridade, tempo gasto etc.) devem ser adicionados de forma organizada sem destruir o modelo original.

Criar opção de exportar:

- Todas as demandas;
- Demandas de determinado período;
- Demandas concluídas;
- Demandas pendentes;
- Rotinas.

Se for tecnicamente possível, preservar também fórmulas, larguras de coluna, estilos, bordas e demais elementos da planilha original.

## 10. Banco de dados

Criar uma estrutura de banco de dados organizada.

Sugestão de entidades:

- users
- demands
- demand_photos
- demand_history
- routines
- routine_occurrences

Relacionamentos:

Um usuário pode criar/editar várias demandas.

Uma demanda pode possuir várias fotos.

Uma demanda pode possuir vários registros de histórico.

Uma rotina pode gerar várias ocorrências.

## 11. Responsividade

O sistema deverá funcionar muito bem em:

- Computador;
- Notebook;
- Tablet;
- Celular.

A utilização pelo celular é muito importante porque a equipe poderá estar no local da manutenção.

A interface mobile deve facilitar principalmente:

- Criar chamado;
- Tirar foto;
- Alterar status;
- Adicionar observação;
- Concluir serviço.

## 12. Interface

Quero uma interface simples e profissional.

Não criar uma interface excessivamente complexa.

Priorizar:

- Clareza;
- Rapidez;
- Poucos cliques;
- Botões grandes no celular;
- Boa visualização dos status;
- Dashboard simples.

Sugestão de menu:

- Dashboard
- Demandas
- Rotinas
- Calendário
- Relatórios
- Exportar Excel
- Configurações

## 13. Calendário

Criar uma visualização em calendário.

Mostrar:

- Prazos das demandas;
- Rotinas programadas;
- Demandas atrasadas;
- Demandas concluídas.

Permitir clicar em uma atividade do calendário para abrir sua demanda.

## 14. Relatórios

Criar uma área de relatórios com informações como:

- Quantidade de serviços realizados;
- Quantidade por status;
- Quantidade por período;
- Tempo total gasto;
- Tempo médio por demanda;
- Demandas canceladas;
- Demandas aguardando material;
- Demandas atrasadas.

## 15. Arquitetura

Antes de começar a implementar:

1. Analise o arquivo Excel anexado.
2. Identifique exatamente como a planilha está estruturada.
3. Identifique abas, colunas, células mescladas, estilos, larguras, fórmulas e formatação relevantes.
4. Proponha a arquitetura do sistema.
5. Proponha o modelo do banco de dados.
6. Explique como a exportação para Excel será feita.
7. Só depois comece a implementação.

Não quero que o sistema seja criado de maneira improvisada.

Priorize uma arquitetura simples, barata de manter e que possa crescer futuramente.

## 16. Requisitos importantes

O sistema deverá:

- Funcionar online;
- Ter login;
- Ter banco de dados;
- Permitir os dois usuários editarem os mesmos chamados;
- Armazenar fotos;
- Ser responsivo;
- Ter backup dos dados;
- Permitir exportação Excel;
- Manter o modelo atual da planilha;
- Ser preparado para adicionar mais usuários futuramente.

Não criar funcionalidades desnecessárias antes de implementar corretamente o núcleo do sistema.

Primeiro desenvolver:

1. Login;
2. Dashboard;
3. Cadastro de demandas;
4. Edição de demandas;
5. Status;
6. Fotos;
7. Observações;
8. Tempo gasto;
9. Rotinas;
10. Exportação Excel.

Depois implementar:

- Calendário;
- Histórico;
- Relatórios;
- Melhorias visuais.

## 17. Importante sobre a implementação

Antes de escrever código, faça uma análise do projeto e apresente:

- Stack tecnológica recomendada;
- Estrutura de pastas;
- Modelo do banco;
- Estrutura das telas;
- Fluxo de autenticação;
- Fluxo das demandas;
- Fluxo das rotinas;
- Estratégia de armazenamento das fotos;
- Estratégia de geração do Excel.

Depois disso, implemente o projeto por etapas.

Ao implementar, mantenha o código organizado, modular e fácil de modificar.
