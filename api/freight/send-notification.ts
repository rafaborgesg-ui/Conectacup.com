import {
  buildFreightEmail,
  buildFreightRecipients,
  getFreightOperationRecipients,
  getSupabaseAdmin,
  logFreightEmail,
  normalizeFreightRequest,
  readBody,
  sendFreightEmail,
  sendJson,
  setCors
} from './_shared.js';

export default async function handler(request: any, response: any) {
  setCors(response, 'POST, OPTIONS');

  if (request.method === 'OPTIONS') {
    response.status(204).end();
    return;
  }

  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'Método não permitido' });
    return;
  }

  try {
    const body = readBody(request);
    const requestId = String(body.requestId || '').trim();
    const eventType = String(body.eventType || 'created').trim();

    if (!requestId) {
      sendJson(response, 400, { error: 'Informe requestId.' });
      return;
    }

    const supabase = getSupabaseAdmin();
    const { data: freightRequest, error } = await supabase
      .from('freight_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();

    if (error) throw error;
    if (!freightRequest) {
      sendJson(response, 404, { error: 'Solicitação não encontrada.' });
      return;
    }

    const { data: latestHistory } = await supabase
      .from('freight_status_history')
      .select('*')
      .eq('freight_request_id', requestId)
      .order('changed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const normalizedRequest = normalizeFreightRequest(freightRequest);
    const operationRecipients = await getFreightOperationRecipients(supabase);
    const { to, cc } = buildFreightRecipients(normalizedRequest, operationRecipients);
    const { subject, html, text } = buildFreightEmail(normalizedRequest, eventType, {
      latestHistory,
      previousStatus: body.previousStatus,
      changedByEmail: body.changedByEmail,
      comment: body.comment
    });
    const result = await sendFreightEmail({ to, cc, subject, html, text });

    await logFreightEmail(supabase, {
      freightRequestId: requestId,
      destinatario: to.join(', ') || 'sem-destinatario',
      cc: cc.join(', ') || null,
      assunto: subject,
      eventType,
      status: result.ok && result.mode === 'email' ? 'enviado' : result.ok ? 'mock' : 'erro',
      providerId: result.providerId,
      erro: result.warning || result.error || null,
      raw: result.raw || null
    }).catch(() => undefined);

    if (!result.ok) {
      sendJson(response, 207, { ok: false, error: result.error, raw: result.raw });
      return;
    }

    sendJson(response, 200, {
      ok: true,
      mode: result.mode,
      providerId: result.providerId,
      warning: result.warning,
      to,
      cc
    });
  } catch (error: any) {
    sendJson(response, 500, { error: error.message || 'Erro ao enviar e-mail de frete.' });
  }
}
