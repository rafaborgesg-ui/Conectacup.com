import { createClient } from '@supabase/supabase-js';

export function setCors(response: any, methods = 'GET, POST, OPTIONS') {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', methods);
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export function sendJson(response: any, status: number, payload: Record<string, unknown>) {
  response.status(status).json(payload);
}

export function sanitizeToken(value: unknown) {
  return String(value || '').trim().replace(/[^a-zA-Z0-9_-]/g, '');
}

export function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configurados no ambiente da função.');
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
  });
}

export function getPublicBaseUrl(request: any) {
  if (process.env.PUBLIC_APP_URL) return process.env.PUBLIC_APP_URL.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  const forwardedHost = request.headers?.['x-forwarded-host'];
  const host = forwardedHost || request.headers?.host;
  const forwardedProto = request.headers?.['x-forwarded-proto'];
  if (host) return `${forwardedProto || 'https'}://${host}`;

  return 'https://www.conectacup.com';
}

export function readBody(request: any) {
  if (!request.body) return {};
  if (typeof request.body === 'string') {
    try {
      return JSON.parse(request.body);
    } catch {
      return {};
    }
  }
  return request.body;
}

export function money(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function nullableText(value: unknown) {
  const text = String(value || '').trim();
  return text || null;
}

export function nullableDate(value: unknown) {
  const text = String(value || '').trim();
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? text.slice(0, 10) : date.toISOString().slice(0, 10);
}

export function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

export function formatMoney(value: unknown, currency = 'BRL') {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(money(value));
}

export async function appendSourcingHistory(
  supabase: any,
  sourcingEventId: string | null,
  acao: string,
  descricao: string,
  dadosNovos?: unknown
) {
  await supabase.from('sourcing_history').insert({
    sourcing_event_id: sourcingEventId,
    acao,
    descricao,
    usuario_nome: 'Portal fornecedor',
    dados_novos: dadosNovos || null
  });
}

export async function logSourcingEmail(
  supabase: any,
  payload: {
    sourcingEventId?: string;
    eventSupplierId?: string;
    supplierId?: string;
    destinatario: string;
    assunto: string;
    status: string;
    providerId?: string;
    erro?: string;
    raw?: unknown;
  }
) {
  await supabase.from('sourcing_email_logs').insert({
    sourcing_event_id: payload.sourcingEventId || null,
    event_supplier_id: payload.eventSupplierId || null,
    supplier_id: payload.supplierId || null,
    destinatario: payload.destinatario,
    assunto: payload.assunto,
    status: payload.status,
    provider: 'resend',
    provider_id: payload.providerId || null,
    erro: payload.erro || null,
    payload: payload.raw || null
  });
}
