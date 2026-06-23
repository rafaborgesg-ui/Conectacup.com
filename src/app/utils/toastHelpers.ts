/**
 * Sistema de Toast Helpers - Porsche Cup Brasil
 * Wrapper consistente ao redor do Sonner com estilos padronizados da marca
 */

import { toast } from 'sonner@2.0.3';
import { CheckCircle, XCircle, AlertTriangle, Info, Trash2, Package, ArrowRightLeft } from 'lucide-react';

// Configurações padrão para diferentes tipos de ação
const TOAST_CONFIG = {
  success: {
    duration: 2500,
    style: {
      background: 'linear-gradient(135deg, #00A86B 0%, #00965F 100%)',
      color: '#FFFFFF',
      border: '2px solid #00A86B',
      boxShadow: '0 8px 24px rgba(0, 168, 107, 0.25)',
      cursor: 'pointer',
    },
    dismissible: true,
    closeButton: true,
  },
  error: {
    duration: 4000,
    style: {
      background: 'linear-gradient(135deg, #D50000 0%, #B00000 100%)',
      color: '#FFFFFF',
      border: '2px solid #D50000',
      boxShadow: '0 8px 24px rgba(213, 0, 0, 0.3)',
      cursor: 'pointer',
    },
    dismissible: true,
    closeButton: true,
  },
  warning: {
    duration: 3500,
    style: {
      background: 'linear-gradient(135deg, #FFB800 0%, #FF9500 100%)',
      color: '#1F1F1F',
      border: '2px solid #FFB800',
      boxShadow: '0 8px 24px rgba(255, 184, 0, 0.25)',
      cursor: 'pointer',
    },
    dismissible: true,
    closeButton: true,
  },
  info: {
    duration: 3000,
    style: {
      background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
      color: '#FFFFFF',
      border: '2px solid #3B82F6',
      boxShadow: '0 8px 24px rgba(59, 130, 246, 0.25)',
      cursor: 'pointer',
    },
    dismissible: true,
    closeButton: true,
  },
};

// ===================================
// TOASTS DE ENTRADA DE ESTOQUE
// ===================================

export const toastStockEntry = {
  success: (model: string, barcode: string) => {
    toast.success('✅ Pneu Registrado!', {
      description: `${model} • Código ${barcode}`,
      ...TOAST_CONFIG.success,
      icon: '🏁',
    });
  },

  duplicate: (barcode: string) => {
    toast.error('❌ Código Duplicado', {
      description: `O código ${barcode} já foi registrado anteriormente`,
      ...TOAST_CONFIG.error,
      icon: '🚫',
    });
  },

  invalidCode: () => {
    toast.error('❌ Código Inválido', {
      description: 'O código deve conter exatamente 8 dígitos numéricos',
      ...TOAST_CONFIG.error,
    });
  },

  containerFull: (containerName: string, current: number, capacity: number) => {
    toast.error('🚨 Container Cheio!', {
      description: `${containerName} está em capacidade máxima (${current}/${capacity})`,
      ...TOAST_CONFIG.error,
      duration: 5000,
    });
  },

  containerAlmostFull: (containerName: string, remaining: number) => {
    toast.warning('⚠️ Container Quase Cheio', {
      description: `${containerName} tem apenas ${remaining} ${remaining === 1 ? 'espaço' : 'espaços'} restante${remaining === 1 ? '' : 's'}`,
      ...TOAST_CONFIG.warning,
    });
  },

  bulkComplete: (count: number, failed: number = 0) => {
    if (failed === 0) {
      toast.success('✅ Entrada em Massa Concluída!', {
        description: `${count} pneu${count === 1 ? '' : 's'} registrado${count === 1 ? '' : 's'} com sucesso`,
        ...TOAST_CONFIG.success,
        duration: 3000,
      });
    } else {
      toast.warning('⚠️ Entrada Parcialmente Concluída', {
        description: `${count - failed} registrados, ${failed} com erro`,
        ...TOAST_CONFIG.warning,
        duration: 4000,
      });
    }
  },

  sessionFinished: (total: number) => {
    toast.success('🏁 Sessão Finalizada!', {
      description: `${total} pneu${total === 1 ? '' : 's'} registrado${total === 1 ? '' : 's'} no sistema`,
      ...TOAST_CONFIG.success,
      duration: 3000,
    });
  },
};

// ===================================
// TOASTS DE DESCARTE
// ===================================

export const toastDiscard = {
  success: (model: string, barcode: string) => {
    toast.success('🗑️ Pneu Descartado', {
      description: `${model} • Código ${barcode}`,
      ...TOAST_CONFIG.success,
    });
  },

  notFound: (barcode: string) => {
    toast.error('❌ Pneu Não Encontrado', {
      description: `Código ${barcode} não existe no estoque`,
      ...TOAST_CONFIG.error,
    });
  },

  alreadyDiscarded: (barcode: string, status: string) => {
    toast.error('⚠️ Já Descartado', {
      description: `Código ${barcode} já foi descartado (Status: ${status})`,
      ...TOAST_CONFIG.error,
    });
  },

  bulkComplete: (count: number) => {
    toast.success('✅ Descarte em Massa Concluído!', {
      description: `${count} pneu${count === 1 ? '' : 's'} descartado${count === 1 ? '' : 's'} com sucesso`,
      ...TOAST_CONFIG.success,
      duration: 3000,
    });
  },
};

// ===================================
// TOASTS DE MOVIMENTAÇÃO
// ===================================

export const toastMovement = {
  success: (model: string, fromContainer: string, toContainer: string) => {
    toast.success('🚚 Pneu Movimentado!', {
      description: `${model} • ${fromContainer} → ${toContainer}`,
      ...TOAST_CONFIG.success,
      duration: 2500,
    });
  },

  sameContainer: () => {
    toast.error('❌ Mesmo Container', {
      description: 'O pneu já está neste container',
      ...TOAST_CONFIG.error,
    });
  },

  notFound: (barcode: string) => {
    toast.error('❌ Pneu Não Encontrado', {
      description: `Código ${barcode} não existe no estoque`,
      ...TOAST_CONFIG.error,
    });
  },

  bulkComplete: (count: number) => {
    toast.success('✅ Movimentação em Massa Concluída!', {
      description: `${count} pneu${count === 1 ? '' : 's'} movimentado${count === 1 ? '' : 's'} com sucesso`,
      ...TOAST_CONFIG.success,
      duration: 3000,
    });
  },
};

// ===================================
// TOASTS GERAIS
// ===================================

export const toastGeneral = {
  loading: (message: string) => {
    return toast.loading(message, {
      style: {
        background: '#1F1F1F',
        color: '#FFFFFF',
        border: '2px solid #3B82F6',
      },
    });
  },

  dismiss: (id: string | number) => {
    toast.dismiss(id);
  },

  error: (title: string, description?: string) => {
    toast.error(title, {
      description,
      ...TOAST_CONFIG.error,
    });
  },

  success: (title: string, description?: string) => {
    toast.success(title, {
      description,
      ...TOAST_CONFIG.success,
    });
  },

  info: (title: string, description?: string) => {
    toast.info(title, {
      description,
      ...TOAST_CONFIG.info,
    });
  },

  warning: (title: string, description?: string) => {
    toast.warning(title, {
      description,
      ...TOAST_CONFIG.warning,
    });
  },
};

// ===================================
// 🔄 TOAST COM FUNCIONALIDADE "DESFAZER"
// ===================================

interface UndoableToastOptions {
  title: string;
  description?: string;
  duration?: number;
  onUndo: () => void | Promise<void>;
  actionLabel?: string;
}

/**
 * Toast destrutivo com botão "Desfazer"
 * Ideal para operações como: descarte, exclusão, movimentação
 * 
 * @example
 * toastUndoable.discard({
 *   title: 'Pneu Descartado',
 *   description: 'Modelo XYZ • Código 12345678',
 *   onUndo: async () => {
 *     await reverterDescarte(barcode);
 *   }
 * });
 */
export const toastUndoable = {
  /**
   * Toast de descarte com desfazer
   */
  discard: (options: UndoableToastOptions) => {
    const { title, description, duration = 6000, onUndo, actionLabel = 'Desfazer' } = options;
    
    let undoExecuted = false;
    
    toast.success(title, {
      description,
      duration,
      style: {
        background: 'linear-gradient(135deg, #FFB800 0%, #FF9500 100%)',
        color: '#1F1F1F',
        border: '2px solid #FFB800',
        boxShadow: '0 8px 24px rgba(255, 184, 0, 0.25)',
      },
      icon: '🗑️',
      action: {
        label: actionLabel,
        onClick: async () => {
          if (undoExecuted) return;
          undoExecuted = true;
          
          const loadingToast = toast.loading('Desfazendo operação...');
          
          try {
            await onUndo();
            toast.dismiss(loadingToast);
            toast.success('✅ Operação desfeita!', {
              ...TOAST_CONFIG.success,
              duration: 2000,
            });
          } catch (error: any) {
            toast.dismiss(loadingToast);
            toast.error('❌ Erro ao desfazer', {
              description: error?.message || 'Não foi possível reverter a operação',
              ...TOAST_CONFIG.error,
            });
          }
        },
      },
    });
  },

  /**
   * Toast de exclusão com desfazer
   */
  delete: (options: UndoableToastOptions) => {
    const { title, description, duration = 6000, onUndo, actionLabel = 'Desfazer' } = options;
    
    let undoExecuted = false;
    
    toast.error(title, {
      description,
      duration,
      style: {
        background: 'linear-gradient(135deg, #D50000 0%, #B00000 100%)',
        color: '#FFFFFF',
        border: '2px solid #D50000',
        boxShadow: '0 8px 24px rgba(213, 0, 0, 0.3)',
      },
      icon: '🗑️',
      action: {
        label: actionLabel,
        onClick: async () => {
          if (undoExecuted) return;
          undoExecuted = true;
          
          const loadingToast = toast.loading('Desfazendo exclusão...');
          
          try {
            await onUndo();
            toast.dismiss(loadingToast);
            toast.success('✅ Exclusão desfeita!', {
              ...TOAST_CONFIG.success,
              duration: 2000,
            });
          } catch (error: any) {
            toast.dismiss(loadingToast);
            toast.error('❌ Erro ao desfazer', {
              description: error?.message || 'Não foi possível reverter a exclusão',
              ...TOAST_CONFIG.error,
            });
          }
        },
      },
    });
  },

  /**
   * Toast de movimentação com desfazer
   */
  movement: (options: UndoableToastOptions) => {
    const { title, description, duration = 6000, onUndo, actionLabel = 'Desfazer' } = options;
    
    let undoExecuted = false;
    
    toast.success(title, {
      description,
      duration,
      style: {
        background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
        color: '#FFFFFF',
        border: '2px solid #3B82F6',
        boxShadow: '0 8px 24px rgba(59, 130, 246, 0.25)',
      },
      icon: '🚚',
      action: {
        label: actionLabel,
        onClick: async () => {
          if (undoExecuted) return;
          undoExecuted = true;
          
          const loadingToast = toast.loading('Revertendo movimentação...');
          
          try {
            await onUndo();
            toast.dismiss(loadingToast);
            toast.success('✅ Movimentação revertida!', {
              ...TOAST_CONFIG.success,
              duration: 2000,
            });
          } catch (error: any) {
            toast.dismiss(loadingToast);
            toast.error('❌ Erro ao reverter', {
              description: error?.message || 'Não foi possível reverter a movimentação',
              ...TOAST_CONFIG.error,
            });
          }
        },
      },
    });
  },

  /**
   * Toast de mudança de status com desfazer
   */
  statusChange: (options: UndoableToastOptions) => {
    const { title, description, duration = 6000, onUndo, actionLabel = 'Desfazer' } = options;
    
    let undoExecuted = false;
    
    toast.success(title, {
      description,
      duration,
      style: {
        background: 'linear-gradient(135deg, #00A86B 0%, #00965F 100%)',
        color: '#FFFFFF',
        border: '2px solid #00A86B',
        boxShadow: '0 8px 24px rgba(0, 168, 107, 0.25)',
      },
      icon: '🔄',
      action: {
        label: actionLabel,
        onClick: async () => {
          if (undoExecuted) return;
          undoExecuted = true;
          
          const loadingToast = toast.loading('Revertendo mudança...');
          
          try {
            await onUndo();
            toast.dismiss(loadingToast);
            toast.success('✅ Status revertido!', {
              ...TOAST_CONFIG.success,
              duration: 2000,
            });
          } catch (error: any) {
            toast.dismiss(loadingToast);
            toast.error('❌ Erro ao reverter', {
              description: error?.message || 'Não foi possível reverter o status',
              ...TOAST_CONFIG.error,
            });
          }
        },
      },
    });
  },

  /**
   * Toast genérico com ação customizada
   */
  custom: (options: UndoableToastOptions & { type?: 'success' | 'error' | 'warning' | 'info' }) => {
    const { 
      title, 
      description, 
      duration = 6000, 
      onUndo, 
      actionLabel = 'Desfazer',
      type = 'success'
    } = options;
    
    let undoExecuted = false;
    
    const toastFn = type === 'error' ? toast.error : 
                    type === 'warning' ? toast.warning :
                    type === 'info' ? toast.info : toast.success;
    
    toastFn(title, {
      description,
      duration,
      ...TOAST_CONFIG[type],
      action: {
        label: actionLabel,
        onClick: async () => {
          if (undoExecuted) return;
          undoExecuted = true;
          
          const loadingToast = toast.loading('Desfazendo...');
          
          try {
            await onUndo();
            toast.dismiss(loadingToast);
            toast.success('✅ Operação desfeita!', {
              ...TOAST_CONFIG.success,
              duration: 2000,
            });
          } catch (error: any) {
            toast.dismiss(loadingToast);
            toast.error('❌ Erro ao desfazer', {
              description: error?.message || 'Não foi possível desfazer a operação',
              ...TOAST_CONFIG.error,
            });
          }
        },
      },
    });
  },
};
