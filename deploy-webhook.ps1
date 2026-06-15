# deploy-webhook.ps1
# Execute este script com o token correto do Supabase para fazer o deploy
#
# Para pegar o token:
#   1. Acesse: https://supabase.com/dashboard/account/tokens
#   2. Clique em "Generate new token"
#   3. Cole abaixo ou passe como argumento: .\deploy-webhook.ps1 -Token "seu-token"

param(
    [Parameter(Mandatory=$true)]
    [string]$Token
)

Write-Host "Fazendo login no Supabase CLI com o token fornecido..." -ForegroundColor Cyan
npx supabase login --token $Token

Write-Host "`nFazendo deploy de meta-whatsapp-proxy (webhook de recepcao)..." -ForegroundColor Cyan
npx supabase functions deploy meta-whatsapp-proxy --no-verify-jwt --project-ref zljlhlfbtnzbmeaglkll

Write-Host "`nFazendo deploy de api-proxy (envio de mensagens)..." -ForegroundColor Cyan
npx supabase functions deploy api-proxy --no-verify-jwt --project-ref zljlhlfbtnzbmeaglkll

Write-Host "`nDeploy concluido! Verifique os logs acima para confirmar sucesso." -ForegroundColor Green
Write-Host "URL do webhook para configurar na Meta API:" -ForegroundColor Yellow
Write-Host "  https://zljlhlfbtnzbmeaglkll.supabase.co/functions/v1/meta-whatsapp-proxy" -ForegroundColor White
