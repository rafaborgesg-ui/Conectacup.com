#!/bin/bash

# =======================================================
# Script para corrigir erro 403 de Edge Function Deploy
# =======================================================
# 
# Este script renomeia a pasta /supabase/functions/server
# para /supabase/functions/_server_disabled
# 
# Isso evita que o Figma Make tente fazer deploy
# da Edge Function (que causa erro 403)
# 
# Data: 20/01/2026
# =======================================================

echo ""
echo "🔧 Fix: Erro 403 - Edge Function Deploy"
echo "========================================="
echo ""

# Verifica se a pasta existe
if [ ! -d "supabase/functions/server" ]; then
  echo "❌ Pasta supabase/functions/server não encontrada"
  echo "✅ Erro 403 já deve estar resolvido!"
  exit 0
fi

echo "📁 Pasta encontrada: supabase/functions/server"
echo ""
echo "🔄 Renomeando para: supabase/functions/_server_disabled"
echo ""

# Renomeia a pasta
mv supabase/functions/server supabase/functions/_server_disabled

# Verifica se funcionou
if [ -d "supabase/functions/_server_disabled" ]; then
  echo "✅ Pasta renomeada com sucesso!"
  echo ""
  echo "📋 Próximos passos:"
  echo "   1. git add ."
  echo "   2. git commit -m 'Fix: Desabilita Edge Function (erro 403)'"
  echo "   3. git push"
  echo ""
  echo "🎉 O erro 403 deve desaparecer após o rebuild!"
else
  echo "❌ Erro ao renomear pasta"
  echo "⚠️  Tente renomear manualmente via interface gráfica"
fi

echo ""
