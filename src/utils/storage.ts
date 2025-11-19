/**
 * STORAGE - MODO APENAS ONLINE
 * Todas as operações são feitas diretamente no Supabase
 * Sem fallback para localStorage
 */

import { projectId, publicAnonKey } from './supabase/info';
import { getAccessToken, createClient } from './supabase/client';
import { generateUUID } from './uuid';

// Caches locais para otimização
let cachedStockEntries: StockEntry[] = [];
let cachedTireModels: TireModel[] = [];

export interface TireModel {
  id: string;
  name: string;
  code: string;
  type: string;
}

export interface Container {
  id: string;
  name: string;
  location: string;
  capacity: number;
  current_stock: number; // Alinhado com schema do Supabase
}

export interface StockEntry {
  id: string;
  barcode: string;
  model_id: string; // Alinhado com schema do Supabase
  model_name: string;
  model_type: 'Slick' | 'Wet';
  container_id: string;
  container_name: string;
  status?: string; // Dinâmico baseado em tire_status
  session_id?: string;
  pilot?: string;
  team?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  created_by?: string;
  // Campos ARCS - dados detalhados do pneu
  numero?: string;
  categoria?: string;
  ano?: string;
  etapa?: string;
  pista?: string;
  campeonato?: string;
  set_pneu?: string;
  lado?: string;
  local?: string;
  tempo_vida?: string;
  data_hora?: string;
}

export interface TireMovement {
  id: string;
  barcode: string;
  model_name: string;
  model_type: 'Slick' | 'Wet';
  from_container_id?: string;
  from_container_name?: string;
  to_container_id?: string;
  to_container_name?: string;
  reason?: string;
  moved_by?: string;
  moved_by_name?: string;
  created_at: string;
}

export interface TireConsumptionEntry {
  id: string;
  barcode: string;
  model_name: string;
  model_type: 'Slick' | 'Wet';
  container_name?: string;
  pilot?: string;
  team?: string;
  notes?: string;
  registered_by?: string;
  registered_by_name?: string;
  created_at: string;
}

export interface TireDiscard {
  id: string;
  barcode: string;
  model_name: string;
  model_type: 'Slick' | 'Wet';
  container_name?: string;
  discard_reason?: string;
  discarded_by?: string;
  discarded_by_name?: string;
  created_at: string;
}

export interface TireStatus {
  id: string;
  name: string;
  color: string;
  is_default: boolean;
  created_at: string;
  updated_at?: string;
  created_by?: string;
}

export interface MasterDataItem {
  id: string;
  type: string;
  name: string;
  createdAt: string;
}

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-02726c7c`;

// Modelos padrão para inicialização
const DEFAULT_TIRE_MODELS: TireModel[] = [
  { id: '1', name: 'Slick 991 Dianteiro', code: '27/65-18 N2', type: 'Slick' },
  { id: '2', name: 'Slick 991 Traseiro', code: '31/71-18 N2', type: 'Slick' },
  { id: '3', name: 'Slick 992 Dianteiro', code: '30/65-18 N3', type: 'Slick' },
  { id: '4', name: 'Slick 992 Traseiro', code: '31/71-18 N3R', type: 'Slick' },
  { id: '5', name: 'Wet 991 Dianteiro', code: '27/65-18 P2L', type: 'Wet' },
  { id: '6', name: 'Wet 992 Dianteiro', code: '30/65-18 P2L', type: 'Wet' },
  { id: '7', name: 'Wet 991 e 992 Traseiro', code: '31/71-18 P2L', type: 'Wet' },
];

const DEFAULT_CONTAINERS: Container[] = [
  { id: 'C-001', name: 'C-001', location: 'Galpão A - Setor 1', capacity: 200, current_stock: 0 },
  { id: 'C-002', name: 'C-002', location: 'Galpão A - Setor 2', capacity: 200, current_stock: 0 },
  { id: 'C-003', name: 'C-003', location: 'Galpão B - Setor 1', capacity: 150, current_stock: 0 },
  { id: 'C-004', name: 'C-004', location: 'Galpão B - Setor 2', capacity: 150, current_stock: 0 },
  { id: 'C-005', name: 'C-005', location: 'Galpão C - Setor 1', capacity: 300, current_stock: 0 },
];

const DEFAULT_TIRE_STATUS: TireStatus[] = [
  { id: 'status-novo', name: 'Novo', color: '#3B82F6', is_default: true, created_at: new Date().toISOString() },
  { id: 'status-cup', name: 'Cup', color: '#FFB800', is_default: true, created_at: new Date().toISOString() },
  { id: 'status-pneu-cup', name: 'Pneu CUP', color: '#10B981', is_default: true, created_at: new Date().toISOString() },
  { id: 'status-descarte', name: 'Descarte', color: '#DC2626', is_default: true, created_at: new Date().toISOString() },
  { id: 'status-descarte-piloto', name: 'Descarte Piloto', color: '#F97316', is_default: true, created_at: new Date().toISOString() },
  { id: 'status-piloto', name: 'Piloto', color: '#8B5CF6', is_default: true, created_at: new Date().toISOString() },
];

// Helper para aguardar token com retry
async function waitForToken(): Promise<string> {
  // SEMPRE tenta obter token real do Supabase Auth primeiro
  const token = await getAccessToken();
  if (token) {
    console.log(`✅ Token Supabase Auth obtido: ${token.substring(0, 20)}...${token.substring(token.length - 10)}`);
    return token;
  }
  
  // Se não houver token, usa publicAnonKey como fallback
  // IMPORTANTE: Isso NÃO funciona mais - o servidor requer autenticação real
  console.warn('⚠️ SEM SESSÃO ATIVA! Você precisa fazer login.');
  console.warn('⚠️ Enviando publicAnonKey (isso FALHARÁ com 401)');
  console.warn(`⚠️ Token enviado: ${publicAnonKey.substring(0, 20)}...${publicAnonKey.substring(publicAnonKey.length - 10)}`);
  return publicAnonKey;
}

// Helper para fazer requests autenticadas
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  // Obtém token (DEV ou Supabase Auth)
  const token = await waitForToken();
  
  const url = `${API_BASE}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: AbortSignal.timeout(30000), // 30s timeout
    });
    
    if (!response.ok) {
      let errorData;
      let errorText;
      
      try {
        errorText = await response.text();
        // Tenta parsear JSON
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: errorText || 'Erro desconhecido' };
      }
      
      // Tratamento específico por status code
      if (response.status === 401) {
        console.error('❌ Erro de autenticação (401)');
        console.error('❌ FAÇA LOGIN COM: rafael.borges@porschegt3cup.com.br / Porschegt3cupHere');
        
        // Verifica se o usuário está usando publicAnonKey
        if (token === publicAnonKey) {
          console.error('❌ CAUSA: Tentando usar publicAnonKey sem login!');
          throw new Error('VOCÊ PRECISA FAZER LOGIN! Use: rafael.borges@porschegt3cup.com.br / Porschegt3cupHere');
        }
        
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
      }
      
      if (response.status === 403) {
        console.error('❌ Acesso negado (403)');
        throw new Error('Você não tem permissão para esta operação.');
      }
      
      if (response.status === 404) {
        console.error('❌ Recurso não encontrado (404)');
        throw new Error('Recurso não encontrado.');
      }
      
      // Extrai mensagem de erro do backend
      const backendError = errorData.error || errorData.message || errorText;
      console.error(`❌ Erro ${response.status}:`, backendError);
      throw new Error(backendError);
    }
    
    const data = await response.json();
    return data;
  } catch (error: any) {
    // Se já é um erro tratado, apenas repassa
    if (error.message) {
      throw error;
    }
    
    // Erros de rede
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      console.error('❌ Timeout na requisição');
      throw new Error('Tempo esgotado. Verifique sua conexão e tente novamente.');
    }
    
    console.error('❌ Erro na requisição:', error);
    throw new Error('Erro ao conectar com o servidor. Verifique sua conexão.');
  }
}

// Inicialização do servidor - DESABILITADO
// Agora usamos Supabase direto nos componentes
let serverInitialized = true; // Sempre true para não bloquear

async function ensureServerInitialized(): Promise<void> {
  // Não faz nada - mantido para compatibilidade
  return Promise.resolve();
}

// ============================================
// TIRE MODELS - BUSCA DA TABELA SQL
// ============================================

export async function getTireModels(): Promise<TireModel[]> {
  try {
    console.log('📦 Buscando modelos de pneus da tabela SQL tire_models...');
    const result = await apiRequest('/tire-models');
    
    if (result.data && result.data.length > 0) {
      console.log(`✅ ${result.data.length} modelos carregados da tabela SQL`);
      
      // Atualiza cache local
      cachedTireModels = result.data;
      
      return result.data;
    }
    
    // Fallback para dados padrão se não houver modelos no banco
    console.warn('⚠️ Nenhum modelo no banco. Usando dados padrão com UUIDs.');
    
    // IMPORTANTE: Gera UUIDs válidos para os modelos padrão
    const modelsWithUUIDs = DEFAULT_TIRE_MODELS.map((model, index) => ({
      ...model,
      id: generateUUID(), // Gera UUID válido para cada modelo
    }));
    
    cachedTireModels = modelsWithUUIDs;
    return modelsWithUUIDs;
  } catch (error: any) {
    console.error('❌ Erro ao buscar modelos:', error.message);
    console.warn('⚠️ Usando modelos padrão como fallback (com UUIDs)');
    
    // Gera UUIDs para fallback também
    const modelsWithUUIDs = DEFAULT_TIRE_MODELS.map((model, index) => ({
      ...model,
      id: generateUUID(),
    }));
    
    cachedTireModels = modelsWithUUIDs;
    return modelsWithUUIDs;
  }
}

export async function saveTireModel(model: Omit<TireModel, 'id'>): Promise<TireModel> {
  // Não implementado - componente TireModelRegistration deve usar Supabase direto
  console.warn('⚠️ saveTireModel não implementado - use Supabase direto');
  throw new Error('Use a tela de Cadastro de Modelos para gerenciar modelos');
}

export async function updateTireModel(id: string, model: Partial<TireModel>): Promise<TireModel> {
  // Não implementado - componente TireModelRegistration deve usar Supabase direto
  console.warn('⚠️ updateTireModel não implementado - use Supabase direto');
  throw new Error('Use a tela de Cadastro de Modelos para gerenciar modelos');
}

export async function deleteTireModel(id: string): Promise<void> {
  // Não implementado - componente TireModelRegistration deve usar Supabase direto
  console.warn('⚠️ deleteTireModel não implementado - use Supabase direto');
  throw new Error('Use a tela de Cadastro de Modelos para gerenciar modelos');
}

// ============================================
// CONTAINERS - BUSCA DO SUPABASE
// ============================================

export async function getContainers(): Promise<Container[]> {
  try {
    console.log('📦 Buscando contêineres do banco de dados...');
    const result = await apiRequest('/containers');
    
    if (result.data && result.data.length > 0) {
      console.log(`✅ ${result.data.length} contêineres carregados do banco`);
      
      // Log detalhado da ocupação
      result.data.forEach((container: Container) => {
        const percentage = container.capacity > 0 
          ? ((container.current_stock / container.capacity) * 100).toFixed(1)
          : '0';
        console.log(`  📦 ${container.name}: ${container.current_stock}/${container.capacity} pneus (${percentage}%)`);
      });
      
      return result.data;
    }
    
    // Fallback para dados padrão se não houver containers no banco
    console.warn('⚠️ Nenhum contêiner no banco. Usando dados padrão.');
    return DEFAULT_CONTAINERS;
  } catch (error: any) {
    console.error('❌ Erro ao buscar contêineres:', error.message);
    console.warn('⚠️ Usando contêineres padrão como fallback');
    return DEFAULT_CONTAINERS;
  }
}

export async function saveContainer(container: Omit<Container, 'id'>): Promise<Container> {
  // Não implementado - componente ContainerRegistration usa Supabase direto
  console.warn('⚠️ saveContainer não implementado - use Supabase direto');
  throw new Error('Use a tela de Cadastro de Contêineres para gerenciar contêineres');
}

export async function updateContainer(id: string, container: Partial<Container>): Promise<Container> {
  // Não implementado - componente ContainerRegistration usa Supabase direto
  console.warn('⚠️ updateContainer não implementado - use Supabase direto');
  throw new Error('Use a tela de Cadastro de Contêineres para gerenciar contêineres');
  return result.data;
}

export async function deleteContainer(id: string): Promise<void> {
  console.warn('⚠️ deleteContainer não implementado - use Supabase direto');
  throw new Error('Use a tela de Cadastro de Contêineres para gerenciar contêineres');
}

// ============================================
// STOCK ENTRIES
// ============================================

export async function getStockEntries(forceRefresh: boolean = false): Promise<StockEntry[]> {
  try {
    // Se não for forceRefresh e temos cache válido, retorna o cache
    if (!forceRefresh && cachedStockEntries.length > 0) {
      console.log(`📦 Usando cache de estoque (${cachedStockEntries.length} pneus)`);
      return cachedStockEntries;
    }
    
    console.log('🔄 Buscando entradas de estoque do Supabase...');
    const supabase = createClient();
    
    // Busca diretamente do Supabase com limite otimizado
    // Carrega inicialmente os 5.000 registros mais recentes
    const { data, error } = await supabase
      .from('stock_entries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10000); // Limite aumentado para comportar todos os registros
    
    if (error) {
      throw new Error(error.message);
    }
    
    const allEntries = data || [];
    
    // 🛡️ VALIDAÇÃO CRÍTICA: Filtra registros com barcode corrompido (UUID ao invés de 8 dígitos)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validEntries = allEntries.filter((entry: StockEntry) => {
      // Detecta se barcode é um UUID
      if (uuidRegex.test(entry.barcode)) {
        console.error('❌ REGISTRO CORROMPIDO DETECTADO - barcode é UUID:', entry.barcode);
        console.error('   ID do registro:', entry.id);
        console.error('   Modelo:', entry.model_name);
        console.error('   ⚠️ Este registro será ignorado. Execute FIX_CORRUPTED_BARCODES.sql para limpar o banco.');
        return false;
      }
      
      // Valida se barcode tem exatamente 8 dígitos numéricos
      if (!/^\d{8}$/.test(entry.barcode)) {
        console.warn('⚠️ Barcode inválido detectado:', entry.barcode, '| ID:', entry.id);
        return false;
      }
      
      return true;
    });
    
    const removedCount = allEntries.length - validEntries.length;
    if (removedCount > 0) {
      console.warn(`⚠️ ${removedCount} registro(s) corrompido(s) filtrado(s). Execute FIX_CORRUPTED_BARCODES.sql`);
      console.warn('📋 Total original:', allEntries.length, '| Válidos:', validEntries.length);
    }
    
    // Atualiza o cache local imediatamente apenas com registros válidos
    cachedStockEntries = validEntries;
    console.log(`✅ Cache de estoque atualizado: ${validEntries.length} pneus (Supabase direto)`);
    
    return validEntries;
  } catch (error: any) {
    console.error('❌ Erro ao buscar entradas de estoque:', error.message);
    // Retorna cache local em caso de erro
    console.log(`⚠️ Usando cache local (${cachedStockEntries.length} pneus)`);
    return cachedStockEntries;
  }
}

export async function saveStockEntry(entry: StockEntry): Promise<boolean> {
  try {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('stock_entries')
      .insert([entry]);
    
    if (error) {
      throw new Error(error.message);
    }
    
    // Atualiza cache local imediatamente após sucesso
    cachedStockEntries.push(entry);
    console.log(`✅ Entrada salva e cache atualizado: ${entry.barcode}`);
    
    window.dispatchEvent(new Event('stock-entries-updated'));
    return true;
  } catch (error: any) {
    // Se for erro de duplicação (já validado no frontend), não loga
    if (error.message?.includes('duplicado') || error.message?.includes('already exists') || error.message?.includes('já cadastrado')) {
      console.warn('⚠️ Tentativa de cadastro duplicado:', entry.barcode);
    } else {
      console.error('❌ Erro ao salvar entrada:', error);
    }
    
    // Sempre retorna false para o frontend lidar com o erro
    return false;
  }
}

export async function deleteStockEntry(barcode: string): Promise<void> {
  try {
    console.log(`🗑️ Deletando pneu por barcode: ${barcode}`);
    await apiRequest(`/stock-entries/${barcode}`, { method: 'DELETE' });
    
    // Atualiza cache local removendo o item pelo barcode
    cachedStockEntries = cachedStockEntries.filter(entry => entry.barcode !== barcode);
    console.log(`✅ Entrada removida do banco SQL e cache atualizado: ${barcode}`);
    
    window.dispatchEvent(new Event('stock-entries-updated'));
  } catch (error: any) {
    console.error(`❌ Erro ao deletar entrada ${barcode}:`, error.message);
    throw error;
  }
}

export async function updateStockEntryContainer(
  barcode: string,
  containerId: string,
  containerName: string
): Promise<void> {
  try {
    // Validação crítica: detecta UUID sendo passado como barcode
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(barcode)) {
      console.error('❌ ERRO CRÍTICO: updateStockEntryContainer recebeu UUID ao invés de barcode!');
      console.error('   UUID recebido:', barcode);
      console.error('   containerId:', containerId);
      console.error('   containerName:', containerName);
      console.error('   Stack trace:', new Error().stack);
      throw new Error(`ERRO: Tentativa de atualizar usando UUID (${barcode}) ao invés de barcode de 8 dígitos. Verifique o código que está chamando esta função.`);
    }
    
    // Validação: barcode deve ter 8 dígitos
    if (!/^\d{8}$/.test(barcode)) {
      console.error('❌ ERRO: barcode inválido (deve ter 8 dígitos):', barcode);
      throw new Error(`Barcode inválido: "${barcode}". Esperado: 8 dígitos numéricos.`);
    }
    
    console.log(`📦 Atualizando contêiner do pneu ${barcode} para: ${containerName}`);
    
    await apiRequest(`/stock-entries/${barcode}/container`, {
      method: 'PUT',
      body: JSON.stringify({
        containerId,
        containerName
      }),
    });
    
    // Atualiza cache local
    cachedStockEntries = cachedStockEntries.map(entry =>
      entry.barcode === barcode
        ? { ...entry, container_id: containerId, container_name: containerName }
        : entry
    );
    
    console.log(`✅ Contêiner atualizado no banco SQL e cache: ${barcode} -> ${containerName}`);
    window.dispatchEvent(new Event('stock-entries-updated'));
  } catch (error: any) {
    console.error(`❌ Erro ao atualizar contêiner do pneu ${barcode}:`, error.message);
    throw error;
  }
}

export async function updateStockEntryByBarcode(
  barcode: string,
  updates: Partial<StockEntry>
): Promise<void> {
  try {
    // Validação crítica: detecta UUID sendo passado como barcode
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(barcode)) {
      console.error('❌ ERRO CRÍTICO: updateStockEntryByBarcode recebeu UUID ao invés de barcode!');
      console.error('   UUID recebido:', barcode);
      console.error('   updates:', Object.keys(updates));
      console.error('   Stack trace:', new Error().stack);
      throw new Error(`ERRO: Tentativa de atualizar usando UUID (${barcode}) ao invés de barcode de 8 dígitos. Verifique o código que está chamando esta função.`);
    }
    
    // Validação: barcode deve ter 8 dígitos
    if (!/^\d{8}$/.test(barcode)) {
      console.error('❌ ERRO: barcode inválido (deve ter 8 dígitos):', barcode);
      throw new Error(`Barcode inválido: "${barcode}". Esperado: 8 dígitos numéricos.`);
    }
    
    console.log(`📝 Atualizando pneu ${barcode}:`, Object.keys(updates));
    
    await apiRequest(`/stock-entries/${barcode}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    
    // Atualiza cache local
    cachedStockEntries = cachedStockEntries.map(entry =>
      entry.barcode === barcode
        ? { ...entry, ...updates }
        : entry
    );
    
    console.log(`✅ Pneu ${barcode} atualizado no banco SQL e cache`);
    window.dispatchEvent(new Event('stock-entries-updated'));
  } catch (error: any) {
    console.error(`❌ Erro ao atualizar pneu ${barcode}:`, error.message);
    throw error;
  }
}

/**
 * Verifica se um código de barras já existe no estoque
 * Usado para prevenir duplicação de códigos
 * 
 * IMPORTANTE: Sempre consulta o servidor PRIMEIRO para garantir dados atualizados
 */
export async function checkBarcodeExists(barcode: string): Promise<boolean> {
  try {
    // SEMPRE verifica no servidor PRIMEIRO (fonte da verdade)
    const result = await apiRequest(`/stock-entries/check/${barcode}`);
    
    if (result.exists) {
      console.log(`✅ Código ${barcode} encontrado no servidor (duplicado)`);
      return true;
    }
    
    console.log(`✅ Código ${barcode} disponível para cadastro`);
    return false;
  } catch (error: any) {
    console.warn(`⚠️ Erro ao verificar código ${barcode} no servidor:`, error.message);
    
    // Fallback: verifica no cache local se servidor falhar
    const existsInCache = cachedStockEntries.some(entry => entry.barcode === barcode);
    
    if (existsInCache) {
      console.log(`⚠️ Código ${barcode} encontrado no cache local (fallback)`);
      return true;
    }
    
    // Se servidor falhou E não está no cache, permite cadastro
    // (melhor permitir que bloquear incorretamente)
    console.log(`⚠️ Código ${barcode} não encontrado (servidor offline, usando fallback)`);
    return false;
  }
}



/**
 * Atualiza campos genéricos de um pneu no estoque
 * Usado em TireConsumption, TireStatusChange e TireDiscard
 * Retorna boolean indicando sucesso para compatibilidade com código legado
 * 
 * IMPORTANTE: Esta função atualiza o cache local primeiro (resposta instantânea)
 * e depois sincroniza com o Supabase em background
 */
export function updateStockEntry(barcode: string, updates: Partial<StockEntry>): boolean {
  try {
    // 1. Atualiza o cache local primeiro para resposta instantânea
    const entryIndex = cachedStockEntries.findIndex(e => e.barcode === barcode);
    
    if (entryIndex === -1) {
      console.warn(`⚠️ Pneu ${barcode} não encontrado no cache local`);
      // Ainda tenta atualizar no banco mesmo que não esteja no cache
    } else {
      // Atualiza o cache local imediatamente
      cachedStockEntries[entryIndex] = {
        ...cachedStockEntries[entryIndex],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      console.log(`✅ Cache local atualizado: ${barcode}`);
    }
    
    // 2. Sincroniza com servidor em background via API
    (async () => {
      try {
        // Prepara os dados para atualização (agora envia todos os campos, incluindo notes)
        const updateData: any = {
          updated_at: new Date().toISOString(),
        };
        
        // Mapeia todos os campos - o servidor KV aceita qualquer campo
        if (updates.status !== undefined) updateData.status = updates.status;
        if (updates.pilot !== undefined) updateData.pilot = updates.pilot;
        if (updates.team !== undefined) updateData.team = updates.team;
        if (updates.notes !== undefined) updateData.notes = updates.notes;
        if (updates.session_id !== undefined) updateData.session_id = updates.session_id;
        if (updates.container_id !== undefined) updateData.container_id = updates.container_id;
        if (updates.container_name !== undefined) updateData.container_name = updates.container_name;
        
        // Usa a API do servidor (KV store)
        await apiRequest(`/stock-entries/${barcode}`, {
          method: 'PUT',
          body: JSON.stringify(updateData),
        });
        
        console.log(`✅ Pneu atualizado no servidor: ${barcode}`, updateData);
        // Dispara evento de atualização para outros componentes
        window.dispatchEvent(new Event('stock-entries-updated'));
      } catch (error: any) {
        console.error('❌ Erro ao sincronizar com servidor:', error);
        // Reverte o cache local em caso de erro
        if (entryIndex !== -1) {
          // Recarrega do servidor para ter certeza
          window.dispatchEvent(new Event('stock-entries-updated'));
        }
      }
    })();
    
    // Retorna true imediatamente (cache local foi atualizado)
    return true;
  } catch (error: any) {
    console.error('❌ Erro ao atualizar pneu:', error);
    return false;
  }
}

/**
 * Atualiza múltiplos pneus em batch
 * Usado em operações de descarte em massa
 */
export async function updateStockEntriesBatch(
  updates: Array<{ barcode: string; updates: Partial<StockEntry> }>
): Promise<void> {
  try {
    // Atualiza cada pneu sequencialmente
    for (const { barcode, updates: updateData } of updates) {
      updateStockEntry(barcode, updateData);
    }
    
    console.log(`✅ ${updates.length} pneus atualizados em batch`);
    
    // Dispara evento de atualização após todos os updates
    window.dispatchEvent(new Event('stock-entries-updated'));
  } catch (error: any) {
    console.error('❌ Erro ao atualizar pneus em batch:', error);
    throw error;
  }
}

export async function findStockEntryByBarcode(barcode: string): Promise<StockEntry | null> {
  try {
    const result = await apiRequest(`/stock-entries/barcode/${barcode}`);
    return result.data || null;
  } catch (error) {
    return null;
  }
}

export async function updateStockEntryStatus(id: string, status: string): Promise<void> {
  // Busca a entrada pelo ID para obter o barcode
  const entries = await getStockEntries();
  const entry = entries.find(e => e.id === id);
  
  if (!entry) {
    throw new Error(`Entrada com ID ${id} não encontrada`);
  }
  
  // Usa a rota de update por barcode
  await apiRequest(`/stock-entries/${entry.barcode}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
  window.dispatchEvent(new Event('stock-entries-updated'));
}

/**
 * Atualiza o status de um pneu pelo código de barras
 * Usado em ARCS Data Update e outros módulos que trabalham diretamente com barcodes
 */
export async function updateStockEntryStatusByBarcode(barcode: string, status: string): Promise<boolean> {
  try {
    const response = await apiRequest(`/stock-entries/${barcode}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    
    if (!response || !response.success) {
      throw new Error(response?.error || 'Erro ao atualizar status');
    }
    
    console.log(`✅ Status atualizado: ${barcode} → ${status}`);
    window.dispatchEvent(new Event('stock-entries-updated'));
    return true;
  } catch (error: any) {
    console.error(`❌ Erro ao atualizar status do pneu ${barcode}:`, error?.message || error);
    throw error; // Propaga o erro para tratamento específico
  }
}



// ============================================
// TIRE STATUS - USA DADOS PADRÃO
// ============================================

export async function getTireStatus(): Promise<TireStatus[]> {
  // Retorna status padrão - suficiente para operação
  console.log('📦 Usando status de pneus padrão');
  return DEFAULT_TIRE_STATUS;
}

export async function saveTireStatus(status: Omit<TireStatus, 'id' | 'createdAt'>): Promise<TireStatus> {
  // Não implementado - componente StatusRegistration usa Supabase direto
  console.warn('⚠️ saveTireStatus não implementado - use Supabase direto');
  throw new Error('Use a tela de Cadastro de Status para gerenciar status');
}

export async function updateTireStatus(id: string, status: Partial<TireStatus>): Promise<TireStatus> {
  // Não implementado - componente StatusRegistration usa Supabase direto
  console.warn('⚠️ updateTireStatus não implementado - use Supabase direto');
  throw new Error('Use a tela de Cadastro de Status para gerenciar status');
}

export async function deleteTireStatus(id: string): Promise<void> {
  // Não implementado - componente StatusRegistration usa Supabase direto
  console.warn('⚠️ deleteTireStatus não implementado - use Supabase direto');
  throw new Error('Use a tela de Cadastro de Status para gerenciar status');
}

// ============================================
// TIRE MOVEMENTS
// ============================================

export async function getTireMovements(): Promise<TireMovement[]> {
  const result = await apiRequest('/tire-movements');
  return result.data || [];
}

export async function saveTireMovement(movement: Omit<TireMovement, 'id'>): Promise<TireMovement> {
  const result = await apiRequest('/tire-movements', {
    method: 'POST',
    body: JSON.stringify(movement),
  });
  
  window.dispatchEvent(new Event('tire-movements-updated'));
  window.dispatchEvent(new Event('stock-entries-updated'));
  return result.data;
}

// ============================================
// TIRE CONSUMPTION
// ============================================

export async function getTireConsumption(): Promise<TireConsumptionEntry[]> {
  const result = await apiRequest('/tire-consumption');
  return result.data || [];
}

export async function saveTireConsumption(entry: Omit<TireConsumptionEntry, 'id'>): Promise<TireConsumptionEntry> {
  const result = await apiRequest('/tire-consumption', {
    method: 'POST',
    body: JSON.stringify(entry),
  });
  
  window.dispatchEvent(new Event('tire-consumption-updated'));
  window.dispatchEvent(new Event('stock-entries-updated'));
  return result.data;
}

export async function deleteTireConsumption(id: string): Promise<void> {
  await apiRequest(`/tire-consumption/${id}`, { method: 'DELETE' });
  window.dispatchEvent(new Event('tire-consumption-updated'));
  window.dispatchEvent(new Event('stock-entries-updated'));
}

// ============================================
// REPORTS & ANALYTICS
// ============================================

export async function getDiscardReport(): Promise<any> {
  const result = await apiRequest('/reports/discards');
  return result.data || {
    total: 0,
    byModel: [],
    byPeriod: [],
    recent: [],
  };
}

export async function getConsumptionReport(): Promise<any> {
  const result = await apiRequest('/reports/consumption');
  return result.data || {
    total: 0,
    byModel: [],
    byPeriod: [],
    trend: [],
  };
}

export async function getInventoryReport(): Promise<any> {
  const result = await apiRequest('/reports/inventory');
  return result.data || {
    totalTires: 0,
    byContainer: [],
    byModel: [],
    byStatus: [],
  };
}

// ============================================
// LEGACY SYNC FUNCTIONS (COMPATIBILITY)
// Wrappers síncronos para compatibilidade com código legado
// TODO: Remover após migrar todos os componentes para async
// ============================================

// Cache de containers (não declarado no topo porque só é usado aqui)
let cachedContainers: Container[] = DEFAULT_CONTAINERS;

// Atualiza caches quando dados mudam
window.addEventListener('stock-entries-updated', async () => {
  try {
    cachedStockEntries = await getStockEntries();
  } catch (error) {
    console.error('Erro ao atualizar cache de estoque:', error);
  }
});

window.addEventListener('tire-models-updated', async () => {
  try {
    cachedTireModels = await getTireModels();
  } catch (error) {
    console.error('Erro ao atualizar cache de modelos:', error);
  }
});

window.addEventListener('containers-updated', async () => {
  try {
    cachedContainers = await getContainers();
  } catch (error) {
    console.error('Erro ao atualizar cache de containers:', error);
  }
});

// Funções síncronas que retornam dados do cache
// IMPORTANTE: Sempre vazio em primeira execução, use versões async quando possível
export function getStockEntriesSync(includeDiscarded: boolean = false): StockEntry[] {
  if (!includeDiscarded) {
    // Exclui todos os tipos de descarte DSI (compatibilidade retroativa)
    return cachedStockEntries.filter(e => 
      e.status !== 'Descartado DSI' && 
      e.status !== 'Descarte DSI' && 
      e.status !== 'Descarte' &&
      e.status !== 'Descarte Piloto'
    );
  }
  return cachedStockEntries;
}

export function getTireModelsSync(): TireModel[] {
  return cachedTireModels;
}

export function getContainersSync(): Container[] {
  return cachedContainers;
}

// ============================================
// MASTER DATA (Dados Mestres)
// ============================================

export async function getMasterData(): Promise<Record<string, MasterDataItem[]>> {
  try {
    const result = await apiRequest('/master-data');
    return result.data || {};
  } catch (error: any) {
    // Log instruções claras se for erro de tabela não encontrada
    if (error?.code === 'PGRST205' || error?.message?.includes('master_data')) {
      console.error('');
      console.error('%c🚨 MIGRATION NECESSÁRIA: Master Data', 'color: #D50000; font-size: 16px; font-weight: bold;');
      console.error('');
      console.error('%c❌ Tabela master_data não encontrada no banco de dados', 'color: #DC2626; font-size: 14px;');
      console.error('');
      console.error('%c✅ SOLUÇÃO (2 minutos):', 'color: #00A86B; font-size: 14px; font-weight: bold;');
      console.error('%c1. Abra: https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/sql', 'color: #3B82F6;');
      console.error('%c2. Copie TODO o conteúdo do arquivo: MIGRATION_MASTER_DATA.sql', 'color: #666;');
      console.error('%c3. Cole no SQL Editor e clique em RUN', 'color: #666;');
      console.error('%c4. Aguarde confirmação (36 itens criados)', 'color: #666;');
      console.error('%c5. Recarregue esta página (F5)', 'color: #666;');
      console.error('');
      console.error('%c📖 Guia completo: /QUICK_START_MASTER_DATA.md', 'color: #8B5CF6;');
      console.error('');
    }
    throw error;
  }
}

export async function saveMasterDataItem(item: MasterDataItem): Promise<void> {
  await apiRequest('/master-data', {
    method: 'POST',
    body: JSON.stringify(item),
  });
  window.dispatchEvent(new Event('master-data-updated'));
}

export async function deleteMasterDataItem(id: string): Promise<void> {
  await apiRequest(`/master-data/${id}`, { method: 'DELETE' });
  window.dispatchEvent(new Event('master-data-updated'));
}

// Caches inicializados preguiçosamente (lazy loading)
// Não executamos nada automaticamente para evitar timeouts
// Os componentes carregam seus próprios dados conforme necessário
console.log('📦 Storage: Usando dados padrão locais (sem chamadas ao servidor)');
