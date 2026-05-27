/**
 * UTILITÁRIO: Adiciona coluna CAI na tabela tire_models
 * Execute este arquivo UMA ÚNICA VEZ para criar a coluna
 */

import { createClient } from './supabase/client';

export async function addCAIColumn() {
  try {
    const supabase = createClient();

    console.log('🔧 Iniciando migration: Adicionar coluna CAI...');

    // Tenta executar o ALTER TABLE
    const { error } = await supabase.rpc('exec_sql', {
      sql_query: `
        -- Adicionar coluna CAI (opcional, tipo texto)
        ALTER TABLE tire_models
        ADD COLUMN IF NOT EXISTS cai TEXT;

        -- Criar índice para busca rápida pelo CAI
        CREATE INDEX IF NOT EXISTS idx_tire_models_cai ON tire_models(cai);
      `
    });

    if (error) {
      console.error('❌ Erro ao executar migration:', error);
      console.log('\n⚠️ A função exec_sql não existe ou você não tem permissão para executar DDL.');
      console.log('\n📋 SOLUÇÃO: Execute o SQL manualmente no Supabase Dashboard:');
      console.log('1. Abra https://supabase.com/dashboard');
      console.log('2. Vá em SQL Editor');
      console.log('3. Cole o conteúdo do arquivo ADD_CAI_COLUMN.sql');
      console.log('4. Clique em RUN');
      return false;
    }

    console.log('✅ Coluna CAI adicionada com sucesso!');
    console.log('✅ Índice criado!');

    // Popular dados dos modelos existentes
    await populateCAIData();

    return true;
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
    return false;
  }
}

async function populateCAIData() {
  const supabase = createClient();

  console.log('\n📝 Populando códigos CAI nos modelos existentes...');

  const updates = [
    { name: '27/65-18 N2', cai: '907466', desc: 'Slick 991 Dianteiro' },
    { name: '31/71-18 N2', cai: '297596', desc: 'Slick 991 Traseiro' },
    { name: '30/65-18 N3', cai: '530030', desc: 'Slick 992 Dianteiro' },
    { name: '31/71-18 N3R', cai: '242655', desc: 'Slick 992 Traseiro' },
    { name: '27/65-18 P2L', type: 'Wet', cai: '463077', desc: 'Wet 991 Dianteiro' },
    { name: '30/65-18 P2L', cai: '619653', desc: 'Wet 992 Dianteiro' },
    { name: '31/71-18 P2L', cai: '797297', desc: 'Wet 991 e 992 Traseiro' },
  ];

  for (const update of updates) {
    const filter: any = { name: update.name };
    if (update.type) {
      filter.type = update.type;
    }

    const { error } = await supabase
      .from('tire_models')
      .update({ cai: update.cai })
      .match(filter)
      .is('cai', null); // Só atualiza se CAI ainda não foi definido

    if (error) {
      console.warn(`⚠️ Erro ao atualizar ${update.desc}:`, error.message);
    } else {
      console.log(`✅ ${update.desc}: CAI ${update.cai}`);
    }
  }

  console.log('\n✅ Dados populados com sucesso!');
}

// Exporta também uma função de verificação
export async function checkCAIColumn() {
  const supabase = createClient();

  console.log('🔍 Verificando se a coluna CAI existe...');

  const { data, error } = await supabase
    .from('tire_models')
    .select('id, name, cai')
    .limit(1);

  if (error) {
    if (error.message.includes('column "cai" does not exist')) {
      console.log('❌ Coluna CAI NÃO existe na tabela tire_models');
      return false;
    }
    console.error('❌ Erro ao verificar:', error);
    return false;
  }

  console.log('✅ Coluna CAI existe!');
  return true;
}
