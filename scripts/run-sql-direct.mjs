// Executa um arquivo .sql direto contra o Postgres (sem passar pelo
// SQL Editor do navegador do Supabase, que tem um teto de tempo fixo).
//
// Uso:
//   $env:DATABASE_URL = "postgresql://postgres:SENHA@HOST:5432/postgres"
//   node scripts/run-sql-direct.mjs scripts/output/algum-arquivo.sql

import pg from "pg";
import fs from "node:fs";

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error("Uso: node scripts/run-sql-direct.mjs <arquivo.sql>");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("Defina a variável DATABASE_URL antes de rodar.");
  process.exit(1);
}

const sql = fs.readFileSync(sqlFile, "utf8");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

const started = Date.now();
await client.connect();
console.log(`Conectado. Executando ${sqlFile} ...`);

try {
  const result = await client.query(sql);
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  const results = Array.isArray(result) ? result : [result];
  for (const r of results) {
    if (r.command) console.log(`  ${r.command} -- ${r.rowCount ?? 0} linha(s)`);
  }
  console.log(`Concluído em ${elapsed}s.`);
} catch (err) {
  console.error("Erro ao executar:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
