/**
 * ⚠️ EDGE FUNCTION DESABILITADA
 * 
 * Esta Edge Function NÃO DEVE ser deployed.
 * O app funciona 100% com Supabase direto, sem precisar de servidor intermediário.
 * 
 * Veja: /SOLUCAO_ERRO_403.md para detalhes
 * Data: 20/01/2026
 */

// Exporta uma função vazia para evitar erro de sintaxe
export default function handler() {
  return new Response(
    JSON.stringify({
      error: "Esta Edge Function está desabilitada",
      message: "O app funciona 100% com Supabase direto. Veja /SOLUCAO_ERRO_403.md"
    }),
    { 
      status: 410, // 410 Gone - Recurso não está mais disponível
      headers: { "Content-Type": "application/json" }
    }
  );
}
