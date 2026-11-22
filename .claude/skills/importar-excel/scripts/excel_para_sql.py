"""
Converte uma planilha (Excel .xlsx ou .csv) num arquivo .sql que CARREGA os
dados na área de preparação do Pulse Doações (import_batches / import_rows) e
roda a SIMULAÇÃO. Nada é gravado em donors/donations por este arquivo.

Uso:
  python excel_para_sql.py ARQUIVO --tipo doadores|doacoes
         [--aba "Planilha1"] [--mapa mapa.json] [--saida pasta]
         [--linha-cabecalho 1]

  --mapa: JSON {"Coluna da planilha": "campo_padrao", ...}. Colunas sem
          mapeamento são reconhecidas pelos apelidos em APELIDOS; o que não
          for reconhecido fica de fora (e é listado no relatório).

Saída (na pasta --saida, padrão importacoes/saida):
  <nome>_<tipo>.sql     → rodar no SQL Editor do Supabase
  <nome>_<tipo>.json    → relatório: colunas, avisos, prévia das linhas

Depois de rodar o .sql, conferir o resultado e, se estiver certo:
  select public.import_process_batch('<lote>', false);
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import re
import sys
import unicodedata
import uuid
from pathlib import Path

CAMPOS = {
    "doadores": [
        "codigo", "nome", "cpf_cnpj", "email", "telefone", "tipo", "data_nascimento",
        "cep", "endereco", "numero", "complemento", "bairro", "cidade", "uf", "operador",
    ],
    "doacoes": [
        "codigo", "nome", "cpf_cnpj", "email", "telefone", "valor", "data", "status",
        "forma_pagamento", "campanha", "operador", "observacao", "chave",
    ],
}
OBRIGATORIOS = {"doadores": ["nome"], "doacoes": ["valor", "data"]}

# Apelidos comuns de cabeçalho → campo padrão (comparação sem acento/maiúscula).
APELIDOS = {
    "codigo": ["codigo", "cod", "cod doador", "codigo doador", "id antigo", "matricula"],
    "nome": ["nome", "doador", "nome do doador", "nome completo", "razao social"],
    "cpf_cnpj": ["cpf", "cnpj", "cpf cnpj", "cpf/cnpj", "documento", "doc"],
    "email": ["email", "e-mail", "e mail"],
    "telefone": ["telefone", "fone", "celular", "whatsapp", "tel", "contato"],
    "tipo": ["tipo", "classificacao", "categoria", "tipo doador"],
    "data_nascimento": ["nascimento", "data nascimento", "data de nascimento", "aniversario"],
    "cep": ["cep"],
    "endereco": ["endereco", "logradouro", "rua"],
    "numero": ["numero", "n", "nº", "no"],
    "complemento": ["complemento", "compl"],
    "bairro": ["bairro"],
    "cidade": ["cidade", "municipio"],
    "uf": ["uf", "estado"],
    "operador": ["operador", "atendente", "captador", "responsavel", "carteira"],
    "valor": ["valor", "valor doado", "quantia", "vlr", "valor (r$)"],
    "data": ["data", "data doacao", "data da doacao", "dt doacao", "data pagamento"],
    "status": ["status", "situacao"],
    "forma_pagamento": ["forma pagamento", "forma de pagamento", "pagamento", "meio", "meio pagamento"],
    "campanha": ["campanha"],
    "observacao": ["observacao", "obs", "observacoes", "nota"],
    "chave": ["chave", "id doacao", "identificador", "nosso numero"],
}


def norm(texto: str) -> str:
    t = unicodedata.normalize("NFKD", str(texto or "")).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", re.sub(r"[_\-.]+", " ", t.lower())).strip()


def valor_celula(v) -> str:
    if v is None:
        return ""
    if isinstance(v, dt.datetime):
        return v.date().isoformat()
    if isinstance(v, dt.date):
        return v.isoformat()
    if isinstance(v, float):
        # Excel guarda CPF/telefone como número: evita "8.33e+10" e ".0".
        return str(int(v)) if v.is_integer() else repr(v)
    return str(v).strip()


def ler_planilha(caminho: Path, aba: str | None, linha_cab: int) -> tuple[str | None, list[str], list[list[str]]]:
    if caminho.suffix.lower() == ".csv":
        bruto = caminho.read_bytes()
        texto = None
        for enc in ("utf-8-sig", "cp1252", "latin-1"):
            try:
                texto = bruto.decode(enc)
                break
            except UnicodeDecodeError:
                continue
        dialeto = csv.Sniffer().sniff(texto[:5000], delimiters=";,\t")
        linhas = list(csv.reader(texto.splitlines(), dialeto))
        return None, [c.strip() for c in linhas[linha_cab - 1]], [[c.strip() for c in l] for l in linhas[linha_cab:]]

    import openpyxl  # pip install openpyxl

    wb = openpyxl.load_workbook(caminho, read_only=True, data_only=True)
    ws = wb[aba] if aba else wb.worksheets[0]
    todas = [[valor_celula(c) for c in linha] for linha in ws.iter_rows(values_only=True)]
    return ws.title, [str(c) for c in todas[linha_cab - 1]], todas[linha_cab:]


def montar_mapa(cabecalho: list[str], tipo: str, mapa_manual: dict[str, str]) -> tuple[dict[int, str], list[str]]:
    mapa: dict[int, str] = {}
    ignoradas: list[str] = []
    manual = {norm(k): v for k, v in mapa_manual.items()}
    for i, col in enumerate(cabecalho):
        n = norm(col)
        if not n:
            continue
        campo = manual.get(n)
        if campo is None:
            campo = next((c for c, apel in APELIDOS.items() if n in apel or n == c), None)
        if campo and campo in CAMPOS[tipo] and campo not in mapa.values():
            mapa[i] = campo
        else:
            ignoradas.append(col)  # não reconhecida, de outro tipo de lote ou repetida
    return mapa, ignoradas


def sql_str(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("arquivo")
    ap.add_argument("--tipo", required=True, choices=["doadores", "doacoes"])
    ap.add_argument("--aba")
    ap.add_argument("--mapa")
    ap.add_argument("--saida", default="importacoes/saida")
    ap.add_argument("--linha-cabecalho", type=int, default=1)
    args = ap.parse_args()

    caminho = Path(args.arquivo)
    mapa_manual = json.loads(Path(args.mapa).read_text(encoding="utf-8")) if args.mapa else {}
    aba, cabecalho, linhas = ler_planilha(caminho, args.aba, args.linha_cabecalho)
    mapa, ignoradas = montar_mapa(cabecalho, args.tipo, mapa_manual)

    faltando = [c for c in OBRIGATORIOS[args.tipo] if c not in mapa.values()]
    if args.tipo == "doacoes" and not {"codigo", "cpf_cnpj", "email", "telefone", "nome"} & set(mapa.values()):
        faltando.append("algum identificador do doador (codigo, cpf_cnpj, email, telefone ou nome)")
    if faltando:
        print("ERRO: colunas obrigatórias não encontradas:", ", ".join(faltando))
        print("Cabeçalho lido:", cabecalho)
        print("Use --mapa para dizer qual coluna é qual.")
        return 2

    registros = []
    for n, linha in enumerate(linhas, start=args.linha_cabecalho + 1):
        dados = {campo: linha[i] for i, campo in mapa.items() if i < len(linha) and str(linha[i]).strip()}
        if dados:
            registros.append((n, dados))

    lote = str(uuid.uuid4())
    saida = Path(args.saida)
    saida.mkdir(parents=True, exist_ok=True)
    base = f"{re.sub(r'[^A-Za-z0-9_-]+', '_', caminho.stem)}_{args.tipo}"

    partes = [
        "-- Gerado por .claude/skills/importar-excel/scripts/excel_para_sql.py",
        f"-- Arquivo: {caminho.name}  Aba: {aba or '-'}  Tipo: {args.tipo}  Linhas: {len(registros)}",
        f"-- Lote: {lote}",
        "-- Este script só CARREGA a área de preparação e roda a SIMULAÇÃO.",
        "begin;",
        "insert into public.import_batches (id, kind, file_name, sheet_name, total_rows) values "
        f"({sql_str(lote)}, {sql_str(args.tipo)}, {sql_str(caminho.name)}, {sql_str(aba) if aba else 'null'}, {len(registros)});",
    ]
    for i in range(0, len(registros), 500):
        bloco = registros[i : i + 500]
        valores = ",\n".join(
            f"({sql_str(lote)}, {n}, {sql_str(json.dumps(d, ensure_ascii=False))}::jsonb)" for n, d in bloco
        )
        partes.append(f"insert into public.import_rows (batch_id, row_number, data) values\n{valores};")
    partes += [
        "commit;",
        "",
        "-- SIMULAÇÃO (não grava nada em doadores/doações):",
        f"select public.import_process_batch({sql_str(lote)}, true);",
        "",
        "-- Linhas com problema:",
        f"select row_number, status, message, data from public.import_rows where batch_id = {sql_str(lote)} and status = 'erro' order by row_number;",
        "",
        "-- Se a simulação estiver certa, rode SÓ a linha abaixo para gravar de verdade:",
        f"-- select public.import_process_batch({sql_str(lote)}, false);",
        "",
    ]
    arq_sql = saida / f"{base}.sql"
    arq_sql.write_text("\n".join(partes), encoding="utf-8")

    relatorio = {
        "lote": lote,
        "arquivo": caminho.name,
        "aba": aba,
        "tipo": args.tipo,
        "linhas": len(registros),
        "colunas_mapeadas": {cabecalho[i]: c for i, c in mapa.items()},
        "colunas_ignoradas": ignoradas,
        "previa": [d for _, d in registros[:5]],
    }
    (saida / f"{base}.json").write_text(json.dumps(relatorio, ensure_ascii=False, indent=2), encoding="utf-8")

    print(json.dumps({k: v for k, v in relatorio.items() if k != "previa"}, ensure_ascii=False, indent=2))
    print(f"\nSQL gerado: {arq_sql}  ({arq_sql.stat().st_size / 1024:.0f} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
