/**
 * Sistema de Estrutura de Menu Dinâmica
 * 
 * Este arquivo define a estrutura do menu de forma centralizada.
 * Qualquer alteração aqui será refletida automaticamente em:
 * - Sidebar (navegação)
 * - Perfis de Acesso (páginas disponíveis)
 * - Sistema de Permissões (controle de acesso)
 */

import { 
  LayoutDashboard, 
  Package, 
  CircleDot, 
  Box, 
  BarChart3, 
  ArrowRightLeft, 
  Trash2, 
  FileText, 
  UserCircle, 
  Settings, 
  Database, 
  Shield,
  Truck,
  Smartphone,
  Monitor,
  Globe,
  MapPin,
  Code,
  ClipboardList,
  Wrench
} from 'lucide-react';

export interface MenuItem {
  id: string;
  label: string;
  icon?: any;
  isMain?: boolean;
  adminOnly?: boolean;
  externalUrl?: string;
  subItems?: MenuItem[];
  description?: string; // Para usar no AccessProfileManagement
}

/**
 * ESTRUTURA CENTRAL DO MENU
 * 
 * Esta é a fonte única de verdade para toda a estrutura de navegação.
 * Qualquer mudança aqui será refletida automaticamente em todo o sistema.
 */
export const MENU_STRUCTURE: MenuItem[] = [
  {
    id: 'gestao-carga',
    label: 'Gestão de Carga',
    icon: ClipboardList,
    isMain: true,
    externalUrl: 'https://script.google.com/a/porschegt3cup.com.br/macros/s/AKfycbzs06M_vQcA34boc3ciyd9LzUzsYN3aNIXGZd-SfCsygtWAv07sc8K3ngt2UE0-cr9C/exec',
    description: 'Sistema de gestão de carga externa'
  },
  {
    id: 'manutencao-predial',
    label: 'Manutenção predial',
    icon: Wrench,
    isMain: true,
    externalUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSeex768DJud924I02ZGm70r3SdY9sCRd_83bgjBNKAwZpgFnA/viewform?usp=dialog',
    description: 'Formulário de solicitação de manutenção predial'
  },
  {
    id: 'solicitacao-frete',
    label: 'Solicitação de frete',
    icon: Truck,
    isMain: true,
    description: 'Sistema de solicitação de frete',
    subItems: [
      {
        id: 'frete-nacional',
        label: 'Nacional',
        icon: MapPin,
        description: 'Frete nacional',
        subItems: [
          { 
            id: 'frete-smartphone', 
            label: 'Smartphone', 
            icon: Smartphone, 
            externalUrl: 'https://sites.google.com/view/motoristacup/in%C3%ADcio',
            description: 'Acesso mobile para motoristas'
          },
          { 
            id: 'frete-web', 
            label: 'Web', 
            icon: Monitor, 
            externalUrl: 'https://script.google.com/macros/s/AKfycbxG8e_GeG9vOLBtnkv06Su-XjNGl_a2xS0R9swdyjjQZo_dnmQkegBiV3l1Z-FnzEhL/exec',
            description: 'Sistema web de frete'
          },
        ]
      },
      { 
        id: 'frete-internacional', 
        label: 'Internacional', 
        icon: Globe, 
        externalUrl: 'https://docs.google.com/spreadsheets/d/1-z_PLPueulEfPa7J3Owhg_mfjFKHF3nLDvRVVtyeUvQ/edit?usp=sharing',
        description: 'Planilha de frete internacional'
      },
    ]
  },
  {
    id: 'pneus',
    label: 'Pneus',
    icon: Package,
    isMain: true,
    description: 'Gestão de pneus',
    subItems: [
      { 
        id: 'tire-stock', 
        label: 'Entrada de Estoque', 
        icon: Package,
        description: 'Registro de entrada de pneus no estoque'
      },
      { 
        id: 'tire-movement', 
        label: 'Movimentação de Pneus', 
        icon: ArrowRightLeft,
        description: 'Movimentação de pneus entre contêineres'
      },
      { 
        id: 'tire-status-change', 
        label: 'Mudar Status', 
        icon: CircleDot,
        description: 'Alteração de status de pneus'
      },
      { 
        id: 'arcs-data-update', 
        label: 'Atualizar Base ARCS', 
        icon: Database, 
        adminOnly: true,
        description: 'Atualização de dados do sistema ARCS'
      },
      { 
        id: 'tire-discard-entry', 
        label: 'Registro de Descarte', 
        icon: Trash2,
        description: 'Registro de descarte de pneus'
      },
      { 
        id: 'reports', 
        label: 'Relatórios & Histórico', 
        icon: BarChart3,
        description: 'Relatórios e histórico de pneus'
      },
    ]
  },
  {
    id: 'cadastro',
    label: 'Cadastro',
    icon: Settings,
    isMain: true,
    adminOnly: true,
    description: 'Cadastros gerais do sistema',
    subItems: [
      { 
        id: 'tire-models', 
        label: 'Cadastro de Modelos', 
        icon: CircleDot,
        description: 'Cadastro de modelos de pneus'
      },
      { 
        id: 'tire-status', 
        label: 'Cadastro de Status', 
        icon: CircleDot,
        description: 'Cadastro de status de pneus'
      },
      { 
        id: 'containers', 
        label: 'Cadastro de Contêineres', 
        icon: Box,
        description: 'Cadastro de contêineres'
      },
      { 
        id: 'master-data', 
        label: 'Master Data', 
        icon: Database,
        description: 'Dados mestres do sistema'
      },
    ]
  },
  {
    id: 'administracao',
    label: 'Administração',
    icon: Shield,
    isMain: true,
    adminOnly: true,
    description: 'Área administrativa',
    subItems: [
      { 
        id: 'users', 
        label: 'Gerenciar Usuários', 
        icon: Shield,
        description: 'Gerenciamento de usuários do sistema'
      },
      { 
        id: 'access-profiles', 
        label: 'Perfis de Acesso', 
        icon: UserCircle,
        description: 'Configuração de perfis de acesso'
      },
      { 
        id: 'stock-adjustment', 
        label: 'Ajuste de Estoque', 
        icon: Settings,
        description: 'Ajustes manuais de estoque'
      },
      {
        id: 'em-desenvolvimento',
        label: 'Em Desenvolvimento',
        icon: Code,
        description: 'Funcionalidades em desenvolvimento',
        subItems: [
          { 
            id: 'dashboard', 
            label: 'Dashboard', 
            icon: LayoutDashboard,
            description: 'Dashboard com métricas e gráficos'
          },
          { 
            id: 'tire-consumption', 
            label: 'Transferir para Piloto', 
            icon: UserCircle,
            description: 'Transferência de pneus para pilotos'
          },
          { 
            id: 'data-import', 
            label: 'Importação de Dados', 
            icon: Database,
            description: 'Importação de dados via planilha'
          },
          { 
            id: 'tire-discard-reports', 
            label: 'Relatórios & Histórico de Descarte', 
            icon: FileText,
            description: 'Relatórios de descarte de pneus'
          },
        ]
      },
    ]
  },
];

/**
 * Extrai todas as páginas da estrutura do menu de forma recursiva
 * Mantém a hierarquia e estrutura original
 */
export function extractAllPages(items: MenuItem[] = MENU_STRUCTURE, parentPath: string = ''): MenuItem[] {
  const pages: MenuItem[] = [];

  for (const item of items) {
    const currentPath = parentPath ? `${parentPath} > ${item.label}` : item.label;
    
    // Adiciona o item atual (com path hierárquico)
    pages.push({
      ...item,
      description: item.description || currentPath,
    });

    // Se tem subitens, processa recursivamente
    if (item.subItems && item.subItems.length > 0) {
      const subPages = extractAllPages(item.subItems, currentPath);
      pages.push(...subPages);
    }
  }

  return pages;
}

/**
 * Extrai apenas as páginas navegáveis (que não são apenas categorias)
 */
export function extractNavigablePages(items: MenuItem[] = MENU_STRUCTURE): MenuItem[] {
  const pages: MenuItem[] = [];

  function traverse(items: MenuItem[], parentPath: string = '') {
    for (const item of items) {
      const currentPath = parentPath ? `${parentPath} > ${item.label}` : item.label;
      
      // Se tem subitens, não é navegável diretamente (é uma categoria)
      if (item.subItems && item.subItems.length > 0) {
        traverse(item.subItems, currentPath);
      } else {
        // Página navegável
        pages.push({
          ...item,
          description: item.description || currentPath,
        });
      }
    }
  }

  traverse(items);
  return pages;
}

/**
 * Organiza páginas por categoria (baseado na hierarquia do menu)
 */
export function getPagesByCategory(): Record<string, MenuItem[]> {
  const categories: Record<string, MenuItem[]> = {};

  for (const mainItem of MENU_STRUCTURE) {
    if (mainItem.isMain) {
      categories[mainItem.label] = [];
      
      if (mainItem.subItems) {
        function addPages(items: MenuItem[], categoryLabel: string) {
          for (const item of items) {
            if (item.subItems && item.subItems.length > 0) {
              addPages(item.subItems, categoryLabel);
            } else {
              categories[categoryLabel].push(item);
            }
          }
        }
        
        addPages(mainItem.subItems, mainItem.label);
      } else {
        // Se não tem subitens, adiciona a própria página
        categories[mainItem.label].push(mainItem);
      }
    }
  }

  return categories;
}

/**
 * Busca um item do menu por ID
 */
export function findMenuItemById(id: string, items: MenuItem[] = MENU_STRUCTURE): MenuItem | null {
  for (const item of items) {
    if (item.id === id) {
      return item;
    }
    
    if (item.subItems) {
      const found = findMenuItemById(id, item.subItems);
      if (found) return found;
    }
  }
  
  return null;
}

/**
 * Retorna o caminho completo de uma página (breadcrumb)
 */
export function getPagePath(pageId: string, items: MenuItem[] = MENU_STRUCTURE, currentPath: string[] = []): string[] | null {
  for (const item of items) {
    const newPath = [...currentPath, item.label];
    
    if (item.id === pageId) {
      return newPath;
    }
    
    if (item.subItems) {
      const found = getPagePath(pageId, item.subItems, newPath);
      if (found) return found;
    }
  }
  
  return null;
}

/**
 * Mapeamento de IDs de menu para constantes de permissões
 * Mantido para compatibilidade com sistema de permissões existente
 */
export const MENU_TO_PAGE_MAP: Record<string, string> = {
  'dashboard': 'DASHBOARD',
  'tire-stock': 'STOCK_ENTRY',
  'tire-movement': 'TIRE_MOVEMENT',
  'tire-consumption': 'TIRE_CONSUMPTION',
  'tire-status-change': 'TIRE_STATUS_CHANGE',
  'arcs-data-update': 'ARCS_UPDATE',
  'tire-discard-entry': 'TIRE_DISCARD',
  'tire-discard-reports': 'DISCARD_REPORTS',
  'tire-models': 'TIRE_MODEL',
  'tire-status': 'STATUS_REGISTRATION',
  'containers': 'CONTAINER',
  'reports': 'REPORTS',
  'data-import': 'DATA_IMPORT',
  'stock-adjustment': 'STOCK_ADJUSTMENT',
  'users': 'USER_MANAGEMENT',
  'access-profiles': 'USER_MANAGEMENT',
  'master-data': 'MASTER_DATA',
  // Links externos
  'gestao-carga': 'GESTAO_CARGA',
  'manutencao-predial': 'MANUTENCAO_PREDIAL',
  'frete-smartphone': 'FRETE_SMARTPHONE',
  'frete-web': 'FRETE_WEB',
  'frete-internacional': 'FRETE_INTERNACIONAL',
};