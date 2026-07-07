import { appendSourcingHistory, getSupabaseAdmin, sanitizeToken, sendJson, setCors } from './_shared';

export default async function handler(request: any, response: any) {
  setCors(response, 'GET, OPTIONS');

  if (request.method === 'OPTIONS') {
    response.status(204).end();
    return;
  }

  if (request.method !== 'GET') {
    sendJson(response, 405, { error: 'Método não permitido' });
    return;
  }

  const token = sanitizeToken(request.query?.token);
  if (!token) {
    sendJson(response, 400, { error: 'Token do convite não informado.' });
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

    const [eventResult, supplierResult, itemsResult, proposalResult, attachmentsResult] = await Promise.all([
      supabase.from('sourcing_events').select('*').eq('id', link.sourcing_event_id).maybeSingle(),
      supabase.from('sourcing_suppliers').select('*').eq('id', link.supplier_id).maybeSingle(),
      supabase.from('sourcing_event_items').select('*').eq('sourcing_event_id', link.sourcing_event_id).order('item_numero', { ascending: true }),
      supabase
        .from('sourcing_proposals')
        .select('*')
        .eq('sourcing_event_id', link.sourcing_event_id)
        .eq('supplier_id', link.supplier_id)
        .order('created_at', { ascending: false })
        .limit(1),
      supabase
        .from('sourcing_attachments')
        .select('id, nome_arquivo, url_arquivo, tipo, created_at')
        .eq('sourcing_event_id', link.sourcing_event_id)
        .order('created_at', { ascending: false })
    ]);

    if (eventResult.error) throw eventResult.error;
    if (supplierResult.error) throw supplierResult.error;
    if (itemsResult.error) throw itemsResult.error;
    if (proposalResult.error) throw proposalResult.error;

    const event = eventResult.data;
    const supplier = supplierResult.data;
    const proposal = proposalResult.data?.[0] || null;
    let proposalItems: any[] = [];

    if (proposal) {
      const { data, error } = await supabase
        .from('sourcing_proposal_items')
        .select('*')
        .eq('sourcing_proposal_id', proposal.id);
      if (error) throw error;
      proposalItems = data || [];
    }

    if (!link.visualizado_em) {
      const nextStatus = ['Convite nao enviado', 'Convite enviado'].includes(link.status_convite)
        ? 'Visualizado'
        : link.status_convite;

      await supabase
        .from('sourcing_event_suppliers')
        .update({
          status_convite: nextStatus,
          visualizado_em: new Date().toISOString()
        })
        .eq('id', link.id);

      await appendSourcingHistory(
        supabase,
        link.sourcing_event_id,
        'Convite visualizado',
        `${supplier?.nome_fantasia || supplier?.razao_social || 'Fornecedor'} acessou o portal público do evento.`
      ).catch(() => undefined);
    }

    sendJson(response, 200, {
      link: {
        id: link.id,
        statusConvite: link.status_convite,
        pretendeParticipar: link.pretende_participar,
        motivoRecusa: link.motivo_recusa,
        enviadoEm: link.enviado_em,
        visualizadoEm: link.visualizado_em,
        respondeuEm: link.respondeu_em
      },
      event: event ? {
        id: event.id,
        codigo: event.codigo,
        titulo: event.titulo,
        tipoEvento: event.tipo_evento,
        categoria: event.categoria,
        status: event.status,
        moeda: event.moeda,
        dataAbertura: event.data_abertura,
        prazoResposta: event.prazo_resposta,
        descricao: event.descricao,
        condicoesGerais: event.condicoes_gerais,
        condicaoPagamentoDesejada: event.condicao_pagamento_desejada,
        validadeMinimaProposta: event.validade_minima_proposta,
        projetoCodigo: event.projeto_codigo,
        projetoDescricao: event.projeto_descricao,
        responsavelNome: event.responsavel_nome
      } : null,
      supplier: supplier ? {
        id: supplier.id,
        razaoSocial: supplier.razao_social,
        nomeFantasia: supplier.nome_fantasia,
        contatoNome: supplier.contato_nome,
        contatoEmail: supplier.contato_email
      } : null,
      items: (itemsResult.data || []).map((item: any) => ({
        id: item.id,
        itemNumero: item.item_numero,
        descricao: item.descricao,
        quantidade: Number(item.quantidade) || 0,
        unidadeMedida: item.unidade_medida,
        localEntrega: item.local_entrega,
        dataNecessaria: item.data_necessaria,
        especificacaoTecnica: item.especificacao_tecnica,
        observacao: item.observacao
      })),
      proposal: proposal ? {
        id: proposal.id,
        status: proposal.status,
        moeda: proposal.moeda,
        valorTotal: Number(proposal.valor_total) || 0,
        freteIncluso: proposal.frete_incluso,
        impostosInclusos: proposal.impostos_inclusos,
        condicaoPagamento: proposal.condicao_pagamento,
        prazoAtendimento: proposal.prazo_atendimento,
        validadeProposta: proposal.validade_proposta,
        valorMinimoPedido: proposal.valor_minimo_pedido == null ? null : Number(proposal.valor_minimo_pedido),
        observacoes: proposal.observacoes,
        respondidoPorNome: proposal.respondido_por_nome,
        respondidoPorEmail: proposal.respondido_por_email,
        recebidaEm: proposal.recebida_em,
        items: proposalItems.map((item: any) => ({
          sourcingEventItemId: item.sourcing_event_item_id,
          precoUnitario: Number(item.preco_unitario) || 0,
          precoTotal: Number(item.preco_total) || 0,
          capacidade: item.capacidade == null ? null : Number(item.capacidade),
          moeda: item.moeda,
          prazoAtendimento: item.prazo_atendimento,
          observacao: item.observacao,
          alternativaTecnica: item.alternativa_tecnica,
          status: item.status
        }))
      } : null,
      attachments: attachmentsResult.error ? [] : (attachmentsResult.data || []).map((item: any) => ({
        id: item.id,
        nomeArquivo: item.nome_arquivo,
        urlArquivo: item.url_arquivo,
        tipo: item.tipo,
        createdAt: item.created_at
      }))
    });
  } catch (error: any) {
    sendJson(response, 500, { error: error.message || 'Erro ao carregar convite.' });
  }
}
