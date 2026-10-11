// Parser/gerador de SQL para importar o extrato legado de doações PIX/depósitos
// ("doadores pix, depositos e presenciais csv.csv") para o Donor Connect Hub.
//
// Lê o arquivo bruto do relatório legado (texto com colunas de largura fixa,
// delimitado por ';;'), extrai nome / valor / data / operador de cada linha de
// doação, valida os totais contra os subtotais impressos no próprio relatório,
// agrupa por nome (1 doador = histórico de doações) e gera um arquivo .sql
// pronto para rodar no SQL Editor do Supabase.
//
// Uso: node scripts/import-doadores-pix.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW_PATH = "C:\\Users\\maxra\\Documents\\doadores pix, depositos e presenciais csv.csv";
const OUT_DIR = path.join(__dirname, "output");
const SQL_OUT = path.join(OUT_DIR, "20261117_import_doadores_pix.sql");
const REPORT_OUT = path.join(OUT_DIR, "import_report.json");

fs.mkdirSync(OUT_DIR, { recursive: true });

const raw = fs.readFileSync(RAW_PATH, "utf8"); // relatório legado em UTF-8
const lines = raw.split(/\r?\n/);

// Linha de doação válida: contém "<letra E/A/B/C> <espaços> 14 <espaço>" logo após o nome.
const ROW_RE =
  /^\s*\d+\s+(\d+)\s+([\d.,]+)\s*(\d{2}\/\d{2}\/\d{4})?\s*(.*?)\s+[EABC]\s+14(?:\s|$)/;
const CODE_RE = /(\d+)\s*$/;

function parseValor(str) {
  return parseFloat(str.replace(/\./g, "").replace(",", "."));
}

function parseDataISO(str) {
  if (!str) return null;
  const [d, m, y] = str.split("/");
  return `${y}-${m}-${d}`;
}

function normalizeNome(nome) {
  return nome.replace(/\s+/g, " ").trim();
}

const rows = [];
const unmatchedCandidates = [];
const opTotals = {}; // opCode -> { count, sum }

for (const lineRaw of lines) {
  const line = lineRaw.trim();
  if (!line || line === ";;;;" || line === ";;") continue;
  if (!line.startsWith(";;")) continue; // só linhas de dado/relatório
  if (/QT OPER|TELEMARKETING|OPERINI/i.test(line)) continue;

  // remove ';;' do início/fim
  const body = line.replace(/^;;/, "").replace(/;;$/, "");

  const m = body.match(ROW_RE);
  if (!m) {
    // pode ser linha de subtotal (ex: "      715 13          91.137,15") ou total geral - ignora
    if (/^\s*\d+\s+\d+\s+[\d.,]+\s*$/.test(body) || /\bT\b/.test(body)) continue;
    if (body.trim() === "") continue;
    unmatchedCandidates.push(line);
    continue;
  }

  const [, opCode, valorStr, dataStr, nomeRaw] = m;
  const valor = parseValor(valorStr);
  const nome = normalizeNome(nomeRaw);
  if (!nome) continue;

  const codeMatch = body.match(CODE_RE);
  const codigoLegado = codeMatch ? codeMatch[1] : null;

  rows.push({
    nome,
    valor,
    data: parseDataISO(dataStr),
    opCode,
    codigoLegado,
  });

  if (!opTotals[opCode]) opTotals[opCode] = { count: 0, sum: 0 };
  opTotals[opCode].count += 1;
  opTotals[opCode].sum += valor;
}

// -------- Validação contra os subtotais impressos no relatório --------
const EXPECTED = {
  13: { count: 715, sum: 91137.15 },
  14: { count: 1868, sum: 48476.13 },
  16: { count: 2048, sum: 60961.65 },
  34: { count: 1788, sum: 49307.66 },
  36: { count: 745, sum: 16788.76 },
};
const EXPECTED_TOTAL = { count: 7164, sum: 266671.35 };

const validation = { perOperator: {}, totalCount: rows.length, totalSum: 0, ok: true };
for (const op of Object.keys(EXPECTED)) {
  const got = opTotals[op] || { count: 0, sum: 0 };
  const exp = EXPECTED[op];
  const sumOk = Math.abs(got.sum - exp.sum) < 0.02;
  const countOk = got.count === exp.count;
  validation.perOperator[op] = { expected: exp, got, countOk, sumOk };
  if (!sumOk || !countOk) validation.ok = false;
}
validation.totalSum = rows.reduce((a, r) => a + r.valor, 0);
validation.totalCountOk = validation.totalCount === EXPECTED_TOTAL.count;
validation.totalSumOk = Math.abs(validation.totalSum - EXPECTED_TOTAL.sum) < 0.05;
if (!validation.totalCountOk || !validation.totalSumOk) validation.ok = false;

// -------- Agrupamento por doador (1 nome = 1 doador = histórico) --------
const donorsMap = new Map();
for (const r of rows) {
  if (!donorsMap.has(r.nome)) {
    donorsMap.set(r.nome, { nome: r.nome, entries: [], semData: 0 });
  }
  const d = donorsMap.get(r.nome);
  d.entries.push({ valor: r.valor, data: r.data });
  if (!r.data) d.semData++;
}

const donors = Array.from(donorsMap.values());
const multiDonationDonors = donors.filter((d) => d.entries.length > 1);
const missingDateDonors = donors.filter((d) => d.semData > 0);

// -------- Geração do SQL --------
function sqlStr(v) {
  return `'${String(v).replace(/'/g, "''")}'`;
}

const BATCH = 500;
let sql = `-- ============================================================
-- Importação do extrato legado "doadores pix, depositos e presenciais"
-- Gerado automaticamente por scripts/import-doadores-pix.mjs em ${new Date().toISOString()}
--
-- Resumo:
--   ${rows.length} doações brutas (linhas do relatório legado)
--   ${donors.length} doadores únicos (agrupados por nome exato)
--   ${multiDonationDonors.length} doadores com mais de uma doação no histórico
--   ${missingDateDonors.length} doações sem data no relatório original (data_doacao = current_date como placeholder)
--   Soma total: R$ ${validation.totalSum.toFixed(2)} (esperado: R$ ${EXPECTED_TOTAL.sum.toFixed(2)})
--
-- O que este script faz:
--   1. Cria uma tabela temporária com as ${rows.length} doações brutas.
--   2. Cria 1 doador NOVO (status 'lead', telefone vazio) para cada NOME
--      distinto deste arquivo -- não cruza com doadores já cadastrados no
--      sistema, mesmo que o nome seja idêntico (ver observação abaixo).
--   3. Insere uma linha em "donations" para CADA doação bruta, ligada ao
--      doador recém-criado. O trigger já existente (tr_on_donation_change)
--      recalcula automaticamente total_donated, donation_count,
--      last_donation_date e o tipo (lead/único/esporádico/recorrente) de
--      cada doador.
--
-- Observações importantes:
--   - Método de pagamento gravado como 'pix' em todas as linhas.
--   - Não há telefone, e-mail, CPF ou endereço real nesses registros
--     (confirmado no relatório de origem) -- ficam em branco.
--   - O código numérico do relatório legado (ex: 51872) NÃO foi
--     armazenado -- não tem uso no sistema novo e evitamos risco de
--     conflito de unicidade em document_id.
--   - Deduplicação só por nome EXATO (acentuação/maiúsculas já
--     normalizadas); nomes com pequenas variações de escrita não são
--     fundidos automaticamente.
--   - Não cruza com doadores já cadastrados no sistema: se algum dos
--     ${donors.length} nomes já existir, este import cria um perfil novo
--     (duplicado) em vez de anexar o histórico ao perfil existente --
--     escolha deliberada para não misturar o histórico de PIX com o de
--     outra pessoa que só por coincidência tenha o mesmo nome.
-- ============================================================

begin;

create temporary table stg_import_doadores_pix (
  nome text not null,
  valor numeric(12,2) not null,
  data_doacao date
) on commit drop;

`;

for (let i = 0; i < rows.length; i += BATCH) {
  const chunk = rows.slice(i, i + BATCH);
  sql += `insert into stg_import_doadores_pix (nome, valor, data_doacao) values\n`;
  sql += chunk
    .map(
      (r) =>
        `  (${sqlStr(r.nome)}, ${r.valor.toFixed(2)}, ${r.data ? sqlStr(r.data) : "null"})`
    )
    .join(",\n");
  sql += ";\n\n";
}

sql += `-- Cria 1 doador NOVO para cada nome distinto deste arquivo. Não cruza
-- com doadores já existentes no sistema, mesmo que o nome seja idêntico --
-- evita o risco de juntar o histórico desses PIX com o de outra pessoa que
-- por coincidência tenha o mesmo nome (comum em nomes como "MARIA JOSE DA
-- SILVA"). Se preferir cruzar com a base já cadastrada depois, dá pra gerar
-- um relatório de possíveis duplicados (mesmo nome) para revisão manual.
with novos as (
  insert into donors (name, phone, type)
  select distinct nome, '', 'lead'::donor_type from stg_import_doadores_pix
  returning id, name
)
-- Lança cada doação bruta no histórico, ligada ao doador recém-criado
-- (o trigger tr_on_donation_change recalcula tipo/total/contagem sozinho)
insert into donations (donor_id, amount, payment_method, status, donation_date)
select novos.id, s.valor, 'pix', 'pago', coalesce(s.data_doacao, current_date)
from stg_import_doadores_pix s
join novos on novos.name = s.nome;

commit;

-- Conferência pós-importação (rode depois do commit acima):
-- select count(*) filter (where type='lead') as leads,
--        count(*) filter (where type='unico') as unicos,
--        count(*) filter (where type='esporadico') as esporadicos,
--        count(*) filter (where type='recorrente') as recorrentes,
--        count(*) as total
-- from donors
-- where name in (select distinct nome from stg_import_doadores_pix); -- (não funciona após commit, a temp já foi dropada -- use a lista de nomes do relatório JSON se precisar)
`;

fs.writeFileSync(SQL_OUT, sql, "utf8");

const report = {
  geradoEm: new Date().toISOString(),
  totalLinhasBrutas: rows.length,
  totalDoadoresUnicos: donors.length,
  somaTotal: Number(validation.totalSum.toFixed(2)),
  somaEsperada: EXPECTED_TOTAL.sum,
  validacaoOk: validation.ok,
  validacaoPorOperador: validation.perOperator,
  linhasNaoReconhecidas: unmatchedCandidates.length,
  amostraLinhasNaoReconhecidas: unmatchedCandidates.slice(0, 20),
  doadoresComMultiplasDoacoes: multiDonationDonors.length,
  top10DoadoresMaisFrequentes: multiDonationDonors
    .sort((a, b) => b.entries.length - a.entries.length)
    .slice(0, 10)
    .map((d) => ({ nome: d.nome, qtdDoacoes: d.entries.length, total: d.entries.reduce((a, e) => a + e.valor, 0).toFixed(2) })),
  doacoesComDataFaltando: missingDateDonors.length,
  amostraDoadoresSemData: missingDateDonors.slice(0, 20).map((d) => d.nome),
  amostraPrimeirosDoadores: donors.slice(0, 10).map((d) => ({ nome: d.nome, qtd: d.entries.length })),
};

fs.writeFileSync(REPORT_OUT, JSON.stringify(report, null, 2), "utf8");

console.log("===== RELATÓRIO DE IMPORTAÇÃO =====");
console.log(`Linhas brutas extraídas: ${rows.length} (esperado: ${EXPECTED_TOTAL.count})`);
console.log(`Soma total: R$ ${validation.totalSum.toFixed(2)} (esperado: R$ ${EXPECTED_TOTAL.sum.toFixed(2)})`);
console.log(`Validação por operador/lote:`);
for (const [op, v] of Object.entries(validation.perOperator)) {
  console.log(
    `  OP ${op}: contagem ${v.got.count}/${v.expected.count} ${v.countOk ? "OK" : "FALHOU"} | soma R$${v.got.sum.toFixed(2)}/R$${v.expected.sum.toFixed(2)} ${v.sumOk ? "OK" : "FALHOU"}`
  );
}
console.log(`VALIDAÇÃO GERAL: ${validation.ok ? "✅ OK -- totais batem exatamente com o relatório original" : "❌ FALHOU -- revisar antes de importar"}`);
console.log(`Doadores únicos (após agrupar por nome): ${donors.length}`);
console.log(`Doadores com mais de 1 doação: ${multiDonationDonors.length}`);
console.log(`Doações sem data no original: ${missingDateDonors.length}`);
console.log(`Linhas não reconhecidas pelo parser: ${unmatchedCandidates.length}`);
if (unmatchedCandidates.length > 0) {
  console.log("Amostra de linhas não reconhecidas:");
  unmatchedCandidates.slice(0, 10).forEach((l) => console.log("  " + l));
}
console.log(`\nSQL gerado em: ${SQL_OUT}`);
console.log(`Relatório JSON em: ${REPORT_OUT}`);
