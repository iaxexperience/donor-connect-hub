# deploy-doacao-site.ps1
# Publica a doação pelo site e a proteção do webhook do Asaas.
#
# ANTES de rodar:
#   1. Rode no SQL Editor do Supabase:
#        supabase/migrations/20261122_security_lockdown.sql
#        supabase/migrations/20261122_public_donations.sql
#        supabase/migrations/20261122_iax_guardian.sql
#   2. No painel do Asaas, gere uma NOVA chave de API (a antiga vazou) e
#      cadastre-a em Integração Asaas no sistema.
#   3. Invente um token secreto longo para o webhook (ex.: 40+ caracteres
#      aleatórios). Ele vai em dois lugares: aqui (-WebhookToken) e no painel
#      do Asaas → Integrações → Webhooks → "Token de autenticação".
#
# Uso:
#   .\deploy-doacao-site.ps1 -Token "token-do-supabase" -WebhookToken "seu-token-secreto"
#   (token do Supabase: https://supabase.com/dashboard/account/tokens)

param(
    [Parameter(Mandatory=$true)] [string]$Token,
    [Parameter(Mandatory=$true)] [string]$WebhookToken
)

$ref = "zljlhlfbtnzbmeaglkll"

Write-Host "Login no Supabase CLI..." -ForegroundColor Cyan
npx supabase login --token $Token

Write-Host "`nGravando o segredo ASAAS_WEBHOOK_TOKEN..." -ForegroundColor Cyan
npx supabase secrets set "ASAAS_WEBHOOK_TOKEN=$WebhookToken" --project-ref $ref

Write-Host "`nPublicando public-donation (doação pelo site)..." -ForegroundColor Cyan
npx supabase functions deploy public-donation --project-ref $ref

Write-Host "`nPublicando guardian-event (envio de eventos ao IAX Guardian)..." -ForegroundColor Cyan
npx supabase functions deploy guardian-event --project-ref $ref

Write-Host "`nPublicando asaas-webhook (agora exige o token)..." -ForegroundColor Cyan
npx supabase functions deploy asaas-webhook --no-verify-jwt --project-ref $ref

Write-Host "`nPronto. Confira no painel do Asaas que o webhook usa o MESMO token." -ForegroundColor Green
