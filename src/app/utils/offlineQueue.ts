/**
 * Sistema de Queue Offline para Operações Resilientes
 * 
 * Gerencia operações que falharam devido a problemas de conexão,
 * mantendo-as em uma fila persistente e tentando novamente quando
 * a conexão for restabelecida.
 * 
 * Recursos:
 * - Persistência em localStorage
 * - Retry automático com backoff exponencial
 * - Detecção de conexão online/offline
 * - Sincronização automática
 * - Callbacks de sucesso/erro
 */

export interface QueuedOperation {
  id: string;
  type: 'stock-entry' | 'stock-delete' | 'stock-update';
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
}

export interface QueueStats {
  total: number;
  pending: number;
  failed: number;
  syncing: boolean;
}

type OperationHandler = (data: any) => Promise<void>;

class OfflineQueue {
  private queue: QueuedOperation[] = [];
  private handlers: Map<string, OperationHandler> = new Map();
  private isSyncing = false;
  private isOnline = navigator.onLine;
  private listeners: Set<(stats: QueueStats) => void> = new Set();
  private readonly STORAGE_KEY = 'conecta-cup-offline-queue';
  private readonly MAX_RETRIES = 5;
  private syncInterval: number | null = null;

  constructor() {
    this.loadQueue();
    this.setupEventListeners();
    this.startPeriodicSync();
  }

  /**
   * Configura listeners de eventos do navegador
   */
  private setupEventListeners() {
    window.addEventListener('online', () => {
      console.log('🌐 Conexão restaurada - iniciando sincronização...');
      this.isOnline = true;
      this.syncQueue();
    });

    window.addEventListener('offline', () => {
      console.log('📡 Conexão perdida - modo offline ativado');
      this.isOnline = false;
      this.notifyListeners();
    });

    // Tenta sincronizar ao recarregar a página
    if (this.isOnline && this.queue.length > 0) {
      console.log('🔄 Página recarregada com operações pendentes - iniciando sincronização...');
      setTimeout(() => this.syncQueue(), 1000);
    }
  }

  /**
   * Inicia sincronização periódica a cada 30 segundos
   */
  private startPeriodicSync() {
    this.syncInterval = window.setInterval(() => {
      if (this.isOnline && this.queue.length > 0 && !this.isSyncing) {
        console.log('⏰ Sincronização periódica iniciada...');
        this.syncQueue();
      }
    }, 30000); // 30 segundos
  }

  /**
   * Para sincronização periódica (útil para cleanup)
   */
  public stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Carrega a fila do localStorage
   */
  private loadQueue() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        console.log(`📦 Queue carregada: ${this.queue.length} operações pendentes`);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar queue:', error);
      this.queue = [];
    }
  }

  /**
   * Salva a fila no localStorage
   */
  private saveQueue() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('❌ Erro ao salvar queue:', error);
    }
  }

  /**
   * Registra um handler para um tipo de operação
   */
  public registerHandler(type: string, handler: OperationHandler) {
    this.handlers.set(type, handler);
  }

  /**
   * Adiciona uma operação na fila
   */
  public async enqueue(operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    const queuedOp: QueuedOperation = {
      ...operation,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: operation.maxRetries ?? this.MAX_RETRIES,
    };

    this.queue.push(queuedOp);
    this.saveQueue();
    this.notifyListeners();

    console.log(`➕ Operação adicionada à queue: ${queuedOp.type} (${queuedOp.id})`);

    // Tenta executar imediatamente se estiver online
    if (this.isOnline) {
      setTimeout(() => this.syncQueue(), 100);
    }

    return queuedOp.id;
  }

  /**
   * Remove uma operação da fila
   */
  private removeOperation(id: string) {
    this.queue = this.queue.filter(op => op.id !== id);
    this.saveQueue();
    this.notifyListeners();
  }

  /**
   * Atualiza uma operação na fila
   */
  private updateOperation(id: string, updates: Partial<QueuedOperation>) {
    const index = this.queue.findIndex(op => op.id === id);
    if (index !== -1) {
      this.queue[index] = { ...this.queue[index], ...updates };
      this.saveQueue();
      this.notifyListeners();
    }
  }

  /**
   * Calcula o delay para retry com backoff exponencial
   */
  private getRetryDelay(retryCount: number): number {
    // 1s, 2s, 4s, 8s, 16s
    return Math.min(1000 * Math.pow(2, retryCount), 16000);
  }

  /**
   * Executa uma operação
   */
  private async executeOperation(operation: QueuedOperation): Promise<boolean> {
    const handler = this.handlers.get(operation.type);
    
    if (!handler) {
      console.error(`❌ Handler não encontrado para: ${operation.type}`);
      return false;
    }

    try {
      console.log(`🔄 Executando operação: ${operation.type} (tentativa ${operation.retryCount + 1}/${operation.maxRetries + 1})`);
      await handler(operation.data);
      console.log(`✅ Operação executada com sucesso: ${operation.type}`);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error(`❌ Erro ao executar operação ${operation.type}:`, errorMessage);
      
      this.updateOperation(operation.id, {
        lastError: errorMessage,
        retryCount: operation.retryCount + 1,
      });

      return false;
    }
  }

  /**
   * Sincroniza todas as operações pendentes
   */
  public async syncQueue(): Promise<void> {
    if (this.isSyncing) {
      console.log('⏳ Sincronização já em andamento...');
      return;
    }

    if (!this.isOnline) {
      console.log('📡 Offline - sincronização adiada');
      return;
    }

    if (this.queue.length === 0) {
      return;
    }

    this.isSyncing = true;
    this.notifyListeners();

    console.log(`🔄 Iniciando sincronização de ${this.queue.length} operações...`);

    const operationsToProcess = [...this.queue];

    for (const operation of operationsToProcess) {
      // Verifica se excedeu o número máximo de tentativas
      if (operation.retryCount >= operation.maxRetries) {
        console.error(`❌ Operação ${operation.type} excedeu máximo de tentativas - removendo da queue`);
        this.removeOperation(operation.id);
        continue;
      }

      // Aplica delay para retry com backoff exponencial
      if (operation.retryCount > 0) {
        const delay = this.getRetryDelay(operation.retryCount);
        console.log(`⏱️ Aguardando ${delay}ms antes de retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const success = await this.executeOperation(operation);

      if (success) {
        this.removeOperation(operation.id);
      }

      // Se ficou offline durante o processo, para a sincronização
      if (!this.isOnline) {
        console.log('📡 Conexão perdida durante sincronização - pausando');
        break;
      }
    }

    this.isSyncing = false;
    this.notifyListeners();

    if (this.queue.length === 0) {
      console.log('✅ Todas as operações foram sincronizadas!');
    } else {
      console.log(`⚠️ ${this.queue.length} operações ainda pendentes`);
    }
  }

  /**
   * Obtém estatísticas da queue
   */
  public getStats(): QueueStats {
    const failed = this.queue.filter(op => op.retryCount >= op.maxRetries).length;
    
    return {
      total: this.queue.length,
      pending: this.queue.length - failed,
      failed,
      syncing: this.isSyncing,
    };
  }

  /**
   * Verifica se está online
   */
  public getOnlineStatus(): boolean {
    return this.isOnline;
  }

  /**
   * Adiciona um listener para mudanças na queue
   */
  public addListener(listener: (stats: QueueStats) => void) {
    this.listeners.add(listener);
    // Notifica imediatamente com o estado atual
    listener(this.getStats());
  }

  /**
   * Remove um listener
   */
  public removeListener(listener: (stats: QueueStats) => void) {
    this.listeners.delete(listener);
  }

  /**
   * Notifica todos os listeners
   */
  private notifyListeners() {
    const stats = this.getStats();
    this.listeners.forEach(listener => listener(stats));
  }

  /**
   * Limpa a queue (use com cuidado!)
   */
  public clearQueue() {
    this.queue = [];
    this.saveQueue();
    this.notifyListeners();
    console.log('🗑️ Queue limpa');
  }

  /**
   * Força uma tentativa de sincronização manual
   */
  public forceSyncNow() {
    console.log('🔄 Sincronização manual forçada...');
    return this.syncQueue();
  }
}

// Exporta instância singleton
export const offlineQueue = new OfflineQueue();
