---
name: importar-excel
description: Importa planilhas Excel (.xlsx) ou CSV de doadores e de histórico de doações para o Pulse Doações (Supabase zljlhlfbtnzbmeaglkll), passando pela área de preparação import_batches/import_rows com simulação antes de gravar. Use quando o usuário pedir para importar, subir, carregar ou migrar planilha, Excel, CSV, base de doadores, histórico de doações ou dados do sistema antigo — mesmo que não diga "importar".
---

# Importar Excel para o Pulse Doações

Toda importação passa por **três etapas** e nada é gravado em `donors`/`donations` sem a simulação ter sido conferida pelo usuário.

1. **Carregar** a planilha na área de preparação (`import_batches` + `import_rows`).
2. **Simular**: `select public.import_process_batch('<lote>', true);` mostra o que seria criado, atualizado, ignorado ou rejeitado, linha a linha, sem gravar.
3. **Gravar** (só com o "ok" do usuário): `select public.import_process_batch('<lote>', false);`

A estrutura do banco está em `supabase/migrations/20261122_import_staging.sql` (precisa ter sido rodada uma vez no SQL Editor).

## Passo a passo

1. **Receber o arquivo.** Peça para o usuário colocar a planilha em `importacoes/entrada/`. Planilhas têm dados pessoais (CPF, telefone): não copie conteúdo delas para fora da máquina nem para o chat além de uma prévia curta.
2. **Entender a planilha.** Abra com openpyxl, liste as abas, o cabeçalho e 5 linhas. Descubra se é cadastro de **doadores** ou histórico de **doações** (tem valor + data por linha → doações).
3. **Mapear colunas** para os campos padrão abaixo. Os apelidos comuns já são reconhecidos pelo script; para o resto, crie um `mapa.json` em `importacoes/entrada/` (`{"Coluna da planilha": "campo_padrao"}`). Mostre o mapeamento ao usuário antes de seguir.
4. **Gerar o SQL**:
   ```
   python .claude/skills/importar-excel/scripts/excel_para_sql.py importacoes/entrada/ARQUIVO.xlsx --tipo doacoes [--aba "Aba"] [--mapa importacoes/entrada/mapa.json]
   ```
   Saída em `importacoes/saida/` (o .sql e um .json com o relatório). Arquivos grandes: o SQL Editor aceita até alguns MB; acima disso divida a planilha.
5. **Carregar + simular.** O usuário cola o `.sql` no SQL Editor do Supabase e roda. O resultado da simulação aparece no fim (criados/atualizados/ignorados/erros) e a consulta seguinte lista as linhas com erro e o motivo.
6. **Corrigir.** Erros comuns: data em formato estranho, valor vazio, operador que não existe em Usuários, tipo de doador fora da lista. Corrija na planilha e gere de novo (um lote novo), ou peça ao usuário para cadastrar o que falta.
7. **Gravar.** Com o ok explícito do usuário, ele roda `select public.import_process_batch('<lote>', false);`. Um lote processado não pode ser processado de novo.
8. **Conferir.** `select status, count(*) from import_rows where batch_id = '<lote>' group by 1;` e, para doações, compare a soma dos valores da planilha com `select sum(amount) from donations where import_batch_id = '<lote>';`.

## Campos padrão

**Doadores** (`--tipo doadores`): `codigo`, `nome` (obrigatório), `cpf_cnpj`, `email`, `telefone`, `tipo` (lead/recorrente/esporadico/unico/desativado), `data_nascimento`, `cep`, `endereco`, `numero`, `complemento`, `bairro`, `cidade`, `uf`, `operador` (e-mail ou nome do operador → carteira).

**Doações** (`--tipo doacoes`): `valor` e `data` (obrigatórios), um identificador do doador (`codigo`, `cpf_cnpj`, `email`, `telefone` ou `nome`), `status` (padrão pago), `forma_pagamento`, `campanha` (nome exato), `operador` (quem captou), `observacao`, `chave` (id único da doação no sistema antigo).

Modelos prontos: `modelos/modelo_doadores.xlsx` e `modelos/modelo_doacoes.xlsx`.

## Regras do banco (o que acontece na gravação)

- Doador existente é encontrado por: `codigo` (legacy_code) → CPF/CNPJ → e-mail → telefone. Encontrou: só **preenche** campos que vieram na planilha, nunca apaga. Não encontrou: cria.
- Na importação de doações, doador não encontrado é criado como lead com os dados da linha (precisa de `nome`).
- Doações gravam `source = 'importacao'`, `import_batch_id` e `import_key` (a `chave` da planilha ou arquivo+aba+linha). Reimportar o mesmo arquivo **não duplica**: linhas já importadas ficam como "ignorado".
- O gatilho de `donations` recalcula total doado, quantidade, última doação e tipo de cada doador — por isso não importe `total_donated` nem `last_donation_date` diretamente.
- Só admin, gestor e coordenador ativos (ou o SQL Editor) podem processar lotes.

## Desfazer um lote gravado

Só com pedido explícito do usuário e depois de mostrar quantas linhas serão apagadas:
```sql
delete from donations where import_batch_id = '<lote>';
delete from donors where import_batch_id = '<lote>' and not exists (select 1 from donations d where d.donor_id = donors.id);
```
Doadores que já existiam e foram só atualizados não voltam ao estado anterior.
