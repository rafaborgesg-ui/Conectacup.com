# =======================================================
# Script PowerShell para corrigir erro 403 de Edge Function
# =======================================================
# 
# Este script renomeia a pasta /supabase/functions/server
# para /supabase/functions/_server_disabled
# 
# Uso: .\fix-403-error.ps1
# 
# Data: 20/01/2026
# =======================================================

Write-Host ""
Write-Host "🔧 Fix: Erro 403 - Edge Function Deploy" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$sourceFolder = "supabase\functions\server"
$targetFolder = "supabase\functions\_server_disabled"

# Verifica se a pasta existe
if (-Not (Test-Path $sourceFolder)) {
    Write-Host "❌ Pasta $sourceFolder não encontrada" -ForegroundColor Red
    Write-Host "✅ Erro 403 já deve estar resolvido!" -ForegroundColor Green
    exit 0
}

Write-Host "📁 Pasta encontrada: $sourceFolder" -ForegroundColor Yellow
Write-Host ""
Write-Host "🔄 Renomeando para: $targetFolder" -ForegroundColor Yellow
Write-Host ""

# Renomeia a pasta
try {
    Move-Item -Path $sourceFolder -Destination $targetFolder -Force
    
    # Verifica se funcionou
    if (Test-Path $targetFolder) {
        Write-Host "✅ Pasta renomeada com sucesso!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 Próximos passos:" -ForegroundColor Cyan
        Write-Host "   1. git add ." -ForegroundColor White
        Write-Host "   2. git commit -m 'Fix: Desabilita Edge Function (erro 403)'" -ForegroundColor White
        Write-Host "   3. git push" -ForegroundColor White
        Write-Host ""
        Write-Host "🎉 O erro 403 deve desaparecer após o rebuild!" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Erro: Pasta de destino não foi criada" -ForegroundColor Red
    }
}
catch {
    Write-Host "❌ Erro ao renomear pasta: $_" -ForegroundColor Red
    Write-Host "⚠️  Tente renomear manualmente via Explorer" -ForegroundColor Yellow
}

Write-Host ""
