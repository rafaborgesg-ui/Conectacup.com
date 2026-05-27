/**
 * Business Rules - Regras de Negócio
 * 
 * Este módulo gerencia as regras de negócio do sistema:
 * - Coringas por Piloto/Ano
 * - Pneus SLICK por Piloto/Etapa
 * - Pneus WET por Piloto/Etapa
 * 
 * ARMAZENAMENTO:
 * As regras são armazenadas na tabela 'business_rules' do Supabase com colunas estruturadas:
 * - rule_type: 'curinga' | 'slick' | 'wet'
 * - categoria: 'Carrera' | 'Challenge' | 'Trophy'  
 * - campeonato: 'Sprint' | 'Endurance'
 * - quantidade: INTEGER (valor numérico)
 * 
 * MIGRAÇÃO: Substituída tabela master_data por business_rules (estrutura dedicada)
 */

import { projectId, publicAnonKey } from './supabase/info';

export interface WildcardRule {
  categoria: string;
  campeonato: string;
  quantidade: number;
}

export interface TirePurchaseRule {
  categoria: string;
  campeonato: string;
  quantidade: number;
}

export interface WetTirePurchaseRule {
  categoria: string;
  campeonato: string;
  quantidade: number;
}

export interface BusinessRules {
  wildcardRules: WildcardRule[];
  tirePurchaseRules: TirePurchaseRule[];
  wetTirePurchaseRules: WetTirePurchaseRule[];
}

/**
 * Busca as regras de negócio do sistema
 */
export async function getBusinessRules(): Promise<BusinessRules> {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-02726c7c/business-rules`,
      {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      }
    );
    
    if (response.ok) {
      const rules = await response.json();
      
      // Garante retrocompatibilidade com dados antigos
      const defaultRules = getDefaultRules();
      return {
        wildcardRules: rules.wildcardRules || defaultRules.wildcardRules,
        tirePurchaseRules: rules.tirePurchaseRules || defaultRules.tirePurchaseRules,
        wetTirePurchaseRules: rules.wetTirePurchaseRules || defaultRules.wetTirePurchaseRules,
      };
    }
    
    // Retorna regras padrão em caso de erro
    return getDefaultRules();
  } catch (error) {
    console.error('Erro ao buscar regras de negócio:', error);
    return getDefaultRules();
  }
}

/**
 * Retorna as regras padrão do sistema
 */
export function getDefaultRules(): BusinessRules {
  return {
    wildcardRules: [
      { categoria: 'Carrera', campeonato: 'Sprint', quantidade: 4 },
      { categoria: 'Carrera', campeonato: 'Endurance', quantidade: 4 },
      { categoria: 'Challenge', campeonato: 'Sprint', quantidade: 4 },
      { categoria: 'Challenge', campeonato: 'Endurance', quantidade: 4 },
      { categoria: 'Trophy', campeonato: 'Sprint', quantidade: 8 },
    ],
    tirePurchaseRules: [
      { categoria: 'Carrera', campeonato: 'Sprint', quantidade: 3 },
      { categoria: 'Carrera', campeonato: 'Endurance', quantidade: 3 },
      { categoria: 'Challenge', campeonato: 'Sprint', quantidade: 3 },
      { categoria: 'Challenge', campeonato: 'Endurance', quantidade: 3 },
      { categoria: 'Trophy', campeonato: 'Sprint', quantidade: 1 },
    ],
    wetTirePurchaseRules: [
      { categoria: 'Carrera', campeonato: 'Sprint', quantidade: 4 },
      { categoria: 'Carrera', campeonato: 'Endurance', quantidade: 4 },
      { categoria: 'Challenge', campeonato: 'Sprint', quantidade: 4 },
      { categoria: 'Challenge', campeonato: 'Endurance', quantidade: 4 },
      { categoria: 'Trophy', campeonato: 'Sprint', quantidade: 4 },
    ],
  };
}

/**
 * Obtém a quantidade de coringas permitidos para uma categoria/campeonato
 */
export async function getWildcardLimit(categoria: string, campeonato: string): Promise<number> {
  const rules = await getBusinessRules();
  const rule = rules.wildcardRules.find(
    r => r.categoria === categoria && r.campeonato === campeonato
  );
  return rule?.quantidade || 0;
}

/**
 * Obtém a quantidade de pneus slick permitidos por etapa para uma categoria/campeonato
 */
export async function getTirePurchaseLimit(categoria: string, campeonato: string): Promise<number> {
  const rules = await getBusinessRules();
  const rule = rules.tirePurchaseRules.find(
    r => r.categoria === categoria && r.campeonato === campeonato
  );
  return rule?.quantidade || 0;
}

/**
 * Obtém a quantidade de pneus wet permitidos por etapa para uma categoria/campeonato
 */
export async function getWetTirePurchaseLimit(categoria: string, campeonato: string): Promise<number> {
  const rules = await getBusinessRules();
  const rule = rules.wetTirePurchaseRules.find(
    r => r.categoria === categoria && r.campeonato === campeonato
  );
  return rule?.quantidade || 0;
}
