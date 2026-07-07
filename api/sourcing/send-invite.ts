import {
  appendSourcingHistory,
  escapeHtml,
  formatDate,
  formatMoney,
  getPublicBaseUrl,
  getSupabaseAdmin,
  logSourcingEmail,
  readBody,
  sendJson,
  setCors
} from './_shared.js';

function buildEmail(params: {
  event: any;
  supplier: any;
  items: any[];
  portalUrl: string;
}) {
  const { event, supplier, items, portalUrl } = params;
  const supplierName = supplier.contato_nome || supplier.nome_fantasia || supplier.razao_social || 'Fornecedor';
  const title = `${event.titulo} ${event.codigo ? `#${event.codigo}` : ''}`.trim();
  const participarUrl = `${portalUrl}?intent=participar`;
  const recusarUrl = `${portalUrl}?intent=recusar`;
  const totalItems = items.length;
  const totalEstimated = items.reduce((sum, item) => sum + Number(item.quantidade || 0), 0);

  const html = `
    <div style="margin:0;background:#f3f6fb;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
      <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #dbe3ef;border-radius:12px;overflow:hidden;">
        <div style="height:5px;background:#d50000;"></div>
        <div style="padding:24px 28px 8px;">
          <div style="font-size:13px;color:#64748b;text-align:right;">ConectaCup Sourcing</div>
          <h1 style="margin:16px 0 8px;font-size:22px;line-height:1.25;color:#0f172a;">${escapeHtml(title)}</h1>
          <p style="margin:0;color:#475569;font-size:14px;">${escapeHtml(supplierName)}, você recebeu um convite para participar deste evento de sourcing.</p>
        </div>
        <div style="padding:8px 28px 20px;">
          <p style="font-size:14px;line-height:1.55;color:#334155;">${escapeHtml(event.descricao || 'Solicitamos sua proposta comercial para os itens e condições informados no evento.')}</p>
          <table style="width:100%;border-collapse:collapse;margin:18px 0;font-size:14px;">
            <tr>
              <td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#64748b;">Categoria</td>
              <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:700;">${escapeHtml(event.categoria || '-')}</td>
            </tr>
            <tr>
              <td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#64748b;">Prazo de resposta</td>
              <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:700;">${escapeHtml(formatDate(event.prazo_resposta))}</td>
            </tr>
            <tr>
              <td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#64748b;">Itens</td>
              <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:700;">${totalItems} item(ns)</td>
            </tr>
            <tr>
              <td style="padding:10px;color:#64748b;">Volume total</td>
              <td style="padding:10px;text-align:right;font-weight:700;">${escapeHtml(String(totalEstimated))}</td>
            </tr>
          </table>
          ${event.condicoes_gerais ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:18px;"><strong style="display:block;margin-bottom:6px;">Condições gerais</strong><div style="white-space:pre-wrap;font-size:14px;line-height:1.5;">${escapeHtml(event.condicoes_gerais)}</div></div>` : ''}
          <p style="font-size:14px;color:#334155;">As respostas devem ser enviadas pelo portal até <strong>${escapeHtml(formatDate(event.prazo_resposta))}</strong>.</p>
        </div>
        <div style="background:#eef8ff;padding:24px 28px;text-align:center;">
          <a href="${escapeHtml(participarUrl)}" style="display:inline-block;margin:6px 8px;padding:13px 26px;border-radius:999px;background:#ff7a1a;color:#ffffff;text-decoration:none;font-weight:700;">Pretendo participar</a>
          <a href="${escapeHtml(recusarUrl)}" style="display:inline-block;margin:6px 8px;padding:13px 26px;border-radius:999px;background:#455a68;color:#ffffff;text-decoration:none;font-weight:700;">Recusar participação</a>
          <div>
            <a href="${escapeHtml(portalUrl)}" style="display:inline-block;margin-top:12px;padding:13px 34px;border-radius:999px;background:#1592d1;color:#ffffff;text-decoration:none;font-weight:700;">Visualizar evento</a>
          </div>
        </div>
      </div>
      <p style="max-width:720px;margin:12px auto 0;text-align:center;color:#94a3b8;font-size:12px;">Este convite foi enviado pelo ConectaCup. Não encaminhe este link, ele identifica a resposta do fornecedor convidado.</p>
    </div>
  `;

  const text = [
    `ConectaCup Sourcing - ${title}`,
    '',
    `${supplierName}, você recebeu um convite para participar deste evento de sourcing.`,
    `Prazo de resposta: ${formatDate(event.prazo_resposta)}`,
    `Itens: ${totalItems}`,
    event.condicao_pagamento_desejada ? `Condição desejada: ${event.condicao_pagamento_desejada}` : '',
    '',
    `Acesse o portal: ${portalUrl}`
  ].filter(Boolean).join('\n');

  return { html, text, title };
}

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
    const supabase = getSupabaseAdmin();
    const baseUrl = getPublicBaseUrl(request);

    let linksQuery = supabase.from('sourcing_event_suppliers').select('*');
    if (body.eventSupplierId) {
      linksQuery = linksQuery.eq('id', body.eventSupplierId);
    } else if (body.eventId) {
      linksQuery = linksQuery.eq('sourcing_event_id', body.eventId);
      if (Array.isArray(body.supplierIds) && body.supplierIds.length) {
        linksQuery = linksQuery.in('supplier_id', body.supplierIds);
      }
    } else {
      sendJson(response, 400, { error: 'Informe eventSupplierId ou eventId.' });
      return;
    }

    const { data: links, error: linksError } = await linksQuery;
    if (linksError) throw linksError;
    if (!links?.length) {
      sendJson(response, 404, { error: 'Nenhum fornecedor vinculado ao evento foi encontrado.' });
      return;
    }

    const eventIds = Array.from(new Set(links.map((link: any) => link.sourcing_event_id)));
    const supplierIds = Array.from(new Set(links.map((link: any) => link.supplier_id)));

    const [eventsResult, suppliersResult, itemsResult] = await Promise.all([
      supabase.from('sourcing_events').select('*').in('id', eventIds),
      supabase.from('sourcing_suppliers').select('*').in('id', supplierIds),
      supabase.from('sourcing_event_items').select('*').in('sourcing_event_id', eventIds).order('item_numero', { ascending: true })
    ]);

    if (eventsResult.error) throw eventsResult.error;
    if (suppliersResult.error) throw suppliersResult.error;
    if (itemsResult.error) throw itemsResult.error;

    const eventsById = new Map((eventsResult.data || []).map((event: any) => [event.id, event]));
    const suppliersById = new Map((suppliersResult.data || []).map((supplier: any) => [supplier.id, supplier]));
    const resendApiKey = process.env.RESEND_API_KEY?.trim();
    const fromEmail = (process.env.SOURCING_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || 'ConectaCup Sourcing <onboarding@resend.dev>').trim();
    const results = [];

    for (const link of links) {
      const event = eventsById.get(link.sourcing_event_id);
      const supplier = suppliersById.get(link.supplier_id);
      const email = supplier?.contato_email;
      const portalUrl = `${baseUrl}/sourcing/fornecedor/${link.token_acesso}`;
      const items = (itemsResult.data || []).filter((item: any) => item.sourcing_event_id === link.sourcing_event_id);
      const subject = `Convite para evento de sourcing - ${event?.titulo || 'ConectaCup'} ${event?.codigo ? `#${event.codigo}` : ''}`.trim();

      if (!event || !supplier || !email) {
        const reason = !email ? 'Fornecedor sem e-mail cadastrado.' : 'Evento ou fornecedor não encontrado.';
        await supabase
          .from('sourcing_event_suppliers')
          .update({ ultimo_email_status: 'erro', ultimo_email_erro: reason })
          .eq('id', link.id);

        await logSourcingEmail(supabase, {
          sourcingEventId: link.sourcing_event_id,
          eventSupplierId: link.id,
          supplierId: link.supplier_id,
          destinatario: email || 'sem-email',
          assunto: subject,
          status: 'erro',
          erro: reason
        }).catch(() => undefined);

        results.push({ eventSupplierId: link.id, ok: false, error: reason, portalUrl });
        continue;
      }

      const { html, text } = buildEmail({ event, supplier, items, portalUrl });

      if (!resendApiKey) {
        await supabase
          .from('sourcing_event_suppliers')
          .update({ ultimo_email_status: 'mock', ultimo_email_erro: 'RESEND_API_KEY ausente' })
          .eq('id', link.id);

        results.push({ eventSupplierId: link.id, ok: true, mode: 'mock', to: email, portalUrl });
        continue;
      }

      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [email],
          subject,
          html,
          text
        })
      });

      const resendPayload = await resendResponse.json().catch(() => ({}));

      if (!resendResponse.ok) {
        const errorMessage = resendPayload?.message || resendPayload?.error || `Resend HTTP ${resendResponse.status}`;
        await supabase
          .from('sourcing_event_suppliers')
          .update({ ultimo_email_status: 'erro', ultimo_email_erro: errorMessage })
          .eq('id', link.id);

        await logSourcingEmail(supabase, {
          sourcingEventId: link.sourcing_event_id,
          eventSupplierId: link.id,
          supplierId: link.supplier_id,
          destinatario: email,
          assunto: subject,
          status: 'erro',
          erro: errorMessage,
          raw: resendPayload
        }).catch(() => undefined);

        results.push({ eventSupplierId: link.id, ok: false, to: email, error: errorMessage, portalUrl });
        continue;
      }

      const now = new Date().toISOString();
      await supabase
        .from('sourcing_event_suppliers')
        .update({
          status_convite: 'Convite enviado',
          enviado_em: now,
          ultimo_email_status: 'enviado',
          ultimo_email_erro: null
        })
        .eq('id', link.id);

      await logSourcingEmail(supabase, {
        sourcingEventId: link.sourcing_event_id,
        eventSupplierId: link.id,
        supplierId: link.supplier_id,
        destinatario: email,
        assunto: subject,
        status: 'enviado',
        providerId: resendPayload?.id,
        raw: resendPayload
      }).catch(() => undefined);

      await appendSourcingHistory(
        supabase,
        link.sourcing_event_id,
        'Convite enviado por e-mail',
        `${supplier.nome_fantasia || supplier.razao_social} recebeu convite em ${email}.`,
        { portalUrl, valorEstimado: formatMoney(0, event.moeda || 'BRL') }
      ).catch(() => undefined);

      results.push({ eventSupplierId: link.id, ok: true, mode: 'email', to: email, providerId: resendPayload?.id, portalUrl });
    }

    const sent = results.filter(item => item.ok).length;
    const failed = results.length - sent;
    sendJson(response, failed ? 207 : 200, {
      ok: failed === 0,
      sent,
      failed,
      results
    });
  } catch (error: any) {
    sendJson(response, 500, { error: error.message || 'Erro ao enviar convite.' });
  }
}
