import {
  appendSourcingHistory,
  getSupabaseAdmin,
  money,
  nullableDate,
  nullableText,
  readBody,
  sanitizeToken,
  sendJson,
  setCors
} from './_shared';

function scoreProposal(valorTotal: number) {
  return Math.round(Math.max(40, 100 - Math.min(50, valorTotal / 10000)) * 10) / 10;
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

  const body = readBody(request);
  const token = sanitizeToken(body.token);
  const action = String(body.action || '').trim();

  if (!token) {
    sendJson(response, 400, { error: 'Token do convite não informado.' });
    return;
  }

  if (!['participar', 'recusar', 'enviar_proposta'].includes(action)) {
    sendJson(response, 400, { error: 'Ação inválida.' });
    return;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: link, error: linkError } = await supabase
      .from('sourcing_event_suppliers')
      .select('*')
      .eq('token_acesso', token)
      .maybeSingle();

    if (linkError) throw linkError;
    if (!link) {
      sendJson(response, 404, { error: 'Convite não encontrado ou expirado.' });
      return;
    }

    const [eventResult, supplierResult, itemsResult] = await Promise.all([
      supabase.from('sourcing_events').select('*').eq('id', link.sourcing_event_id).maybeSingle(),
      supabase.from('sourcing_suppliers').select('*').eq('id', link.supplier_id).maybeSingle(),
      supabase.from('sourcing_event_items').select('*').eq('sourcing_event_id', link.sourcing_event_id).order('item_numero', { ascending: true })
    ]);

    if (eventResult.error) throw eventResult.error;
    if (supplierResult.error) throw supplierResult.error;
    if (itemsResult.error) throw itemsResult.error;

    const event = eventResult.data;
    const supplier = supplierResult.data;
    const now = new Date().toISOString();

    if (action === 'participar') {
      await supabase
        .from('sourcing_event_suppliers')
        .update({
          status_convite: 'Pretende participar',
          pretende_participar: true,
          respondeu_em: now
        })
        .eq('id', link.id);

      await appendSourcingHistory(
        supabase,
        link.sourcing_event_id,
        'Fornecedor confirmou participação',
        `${supplier?.nome_fantasia || supplier?.razao_social || 'Fornecedor'} pretende participar do evento.`
      );

      sendJson(response, 200, { ok: true, statusConvite: 'Pretende participar' });
      return;
    }

    if (action === 'recusar') {
      const motivo = nullableText(body.motivoRecusa) || 'Fornecedor recusou participação pelo portal.';

      await supabase
        .from('sourcing_event_suppliers')
        .update({
          status_convite: 'Recusou participacao',
          pretende_participar: false,
          motivo_recusa: motivo,
          respondeu_em: now
        })
        .eq('id', link.id);

      await appendSourcingHistory(
        supabase,
        link.sourcing_event_id,
        'Fornecedor recusou participação',
        `${supplier?.nome_fantasia || supplier?.razao_social || 'Fornecedor'} recusou participação: ${motivo}`
      );

      sendJson(response, 200, { ok: true, statusConvite: 'Recusou participacao' });
      return;
    }

    const proposalPayload = body.proposta || {};
    const currency = String(proposalPayload.moeda || event?.moeda || 'BRL').trim().toUpperCase();
    const submittedItems = Array.isArray(proposalPayload.items) ? proposalPayload.items : [];
    const itemsById = new Map((itemsResult.data || []).map((item: any) => [item.id, item]));

    if (!itemsById.size) {
      sendJson(response, 400, { error: 'Evento sem itens para cotação.' });
      return;
    }

    const missingPriceItems = (itemsResult.data || []).filter((eventItem: any) => {
      const submitted = submittedItems.find((item: any) => item.sourcingEventItemId === eventItem.id);
      return money(submitted?.precoUnitario) <= 0;
    });

    if (missingPriceItems.length) {
      sendJson(response, 400, {
        error: 'Informe preço unitário para todos os itens do evento.',
        missingItems: missingPriceItems.map((item: any) => item.item_numero)
      });
      return;
    }

    const proposalItems = submittedItems
      .filter((item: any) => itemsById.has(item.sourcingEventItemId))
      .map((item: any) => {
        const eventItem: any = itemsById.get(item.sourcingEventItemId);
        const precoUnitario = money(item.precoUnitario);
        const quantidade = money(eventItem.quantidade) || 1;
        return {
          sourcing_event_item_id: eventItem.id,
          preco_unitario: precoUnitario,
          preco_total: precoUnitario * quantidade,
          capacidade: item.capacidade === '' || item.capacidade == null ? quantidade : money(item.capacidade),
          moeda: String(item.moeda || currency).trim().toUpperCase(),
          prazo_atendimento: nullableText(item.prazoAtendimento),
          observacao: nullableText(item.observacao),
          alternativa_tecnica: nullableText(item.alternativaTecnica),
          status: 'Recebido'
        };
      });

    const valorTotal = proposalItems.reduce((sum: number, item: any) => sum + money(item.preco_total), 0);
    const scoreFinal = scoreProposal(valorTotal);

    const existingProposalResult = await supabase
      .from('sourcing_proposals')
      .select('*')
      .eq('sourcing_event_id', link.sourcing_event_id)
      .eq('supplier_id', link.supplier_id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (existingProposalResult.error) throw existingProposalResult.error;
    const existingProposal = existingProposalResult.data?.[0];

    const proposalRow = {
      sourcing_event_id: link.sourcing_event_id,
      supplier_id: link.supplier_id,
      status: 'Recebida',
      moeda: currency,
      valor_total: valorTotal,
      frete_incluso: Boolean(proposalPayload.freteIncluso),
      impostos_inclusos: Boolean(proposalPayload.impostosInclusos),
      condicao_pagamento: nullableText(proposalPayload.condicaoPagamento),
      prazo_atendimento: nullableText(proposalPayload.prazoAtendimento),
      validade_proposta: nullableDate(proposalPayload.validadeProposta),
      valor_minimo_pedido: proposalPayload.valorMinimoPedido === '' || proposalPayload.valorMinimoPedido == null
        ? null
        : money(proposalPayload.valorMinimoPedido),
      observacoes: nullableText(proposalPayload.observacoes),
      respondido_por_nome: nullableText(proposalPayload.respondidoPorNome) || supplier?.contato_nome || null,
      respondido_por_email: nullableText(proposalPayload.respondidoPorEmail) || supplier?.contato_email || null,
      origem: 'portal_fornecedor',
      pontuacao_comercial: scoreFinal,
      pontuacao_tecnica: null,
      score_final: scoreFinal,
      recebida_em: now
    };

    let proposalId = existingProposal?.id;
    if (existingProposal) {
      const { error } = await supabase
        .from('sourcing_proposals')
        .update(proposalRow)
        .eq('id', existingProposal.id);
      if (error) throw error;

      const deleteItemsResult = await supabase
        .from('sourcing_proposal_items')
        .delete()
        .eq('sourcing_proposal_id', existingProposal.id);
      if (deleteItemsResult.error) throw deleteItemsResult.error;
    } else {
      const { data, error } = await supabase
        .from('sourcing_proposals')
        .insert(proposalRow)
        .select('id')
        .single();
      if (error) throw error;
      proposalId = data.id;
    }

    const rows = proposalItems.map((item: any) => ({
      ...item,
      sourcing_proposal_id: proposalId
    }));

    const insertItemsResult = await supabase
      .from('sourcing_proposal_items')
      .insert(rows);
    if (insertItemsResult.error) throw insertItemsResult.error;

    await supabase
      .from('sourcing_event_suppliers')
      .update({
        status_convite: 'Proposta enviada',
        pretende_participar: true,
        respondeu_em: now
      })
      .eq('id', link.id);

    if (event && ['Rascunho', 'Publicado', 'Aguardando fornecedores', 'Em cotacao'].includes(event.status)) {
      await supabase
        .from('sourcing_events')
        .update({ status: 'Em analise' })
        .eq('id', event.id);
    }

    await appendSourcingHistory(
      supabase,
      link.sourcing_event_id,
      existingProposal ? 'Proposta revisada pelo fornecedor' : 'Proposta enviada pelo fornecedor',
      `${supplier?.nome_fantasia || supplier?.razao_social || 'Fornecedor'} enviou proposta pelo portal no valor de ${currency} ${valorTotal.toFixed(2)}.`,
      { proposalId, valorTotal, items: rows.length }
    );

    sendJson(response, 200, {
      ok: true,
      proposalId,
      statusConvite: 'Proposta enviada',
      valorTotal,
      items: rows.length
    });
  } catch (error: any) {
    sendJson(response, 500, { error: error.message || 'Erro ao processar resposta.' });
  }
}
