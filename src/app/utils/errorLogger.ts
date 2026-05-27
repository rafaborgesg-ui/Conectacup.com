/**
 * errorLogger.ts - Sistema de Logging de Erros
 * 
 * Gerencia logs de erros da aplicação com:
 * - Armazenamento local persistente
 * - Limite de logs (últimos 50)
 * - Export para análise
 * - Limpeza automática
 */

export interface ErrorLog {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  componentStack?: string;
  userAgent: string;
  url: string;
  type: 'error' | 'warning' | 'info';
  metadata?: Record<string, any>;
}

const ERROR_LOG_KEY = 'porsche_cup_error_logs';
const MAX_LOGS = 50;

/**
 * Salva um erro no log local
 */
export function logError(
  message: string,
  error?: Error,
  metadata?: Record<string, any>
): void {
  try {
    const errorLog: ErrorLog = {
      id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      message,
      stack: error?.stack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      type: 'error',
      metadata: {
        ...metadata,
        errorName: error?.name,
      },
    };

    const logs = getErrorLogs();
    logs.push(errorLog);

    // Mantém apenas os últimos MAX_LOGS
    const trimmedLogs = logs.slice(-MAX_LOGS);
    
    localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(trimmedLogs));
    
    // Log no console para debug
    console.error('🚨 Error Logged:', {
      id: errorLog.id,
      message: errorLog.message,
      timestamp: errorLog.timestamp,
      metadata: errorLog.metadata,
    });
  } catch (e) {
    console.error('Failed to log error:', e);
  }
}

/**
 * Salva um warning no log local
 */
export function logWarning(message: string, metadata?: Record<string, any>): void {
  try {
    const warningLog: ErrorLog = {
      id: `warn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      message,
      userAgent: navigator.userAgent,
      url: window.location.href,
      type: 'warning',
      metadata,
    };

    const logs = getErrorLogs();
    logs.push(warningLog);
    
    const trimmedLogs = logs.slice(-MAX_LOGS);
    localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(trimmedLogs));
    
    console.warn('⚠️ Warning Logged:', {
      id: warningLog.id,
      message: warningLog.message,
      timestamp: warningLog.timestamp,
    });
  } catch (e) {
    console.error('Failed to log warning:', e);
  }
}

/**
 * Salva uma info no log local
 */
export function logInfo(message: string, metadata?: Record<string, any>): void {
  try {
    const infoLog: ErrorLog = {
      id: `info_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      message,
      userAgent: navigator.userAgent,
      url: window.location.href,
      type: 'info',
      metadata,
    };

    const logs = getErrorLogs();
    logs.push(infoLog);
    
    const trimmedLogs = logs.slice(-MAX_LOGS);
    localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(trimmedLogs));
    
    console.info('ℹ️ Info Logged:', {
      id: infoLog.id,
      message: infoLog.message,
      timestamp: infoLog.timestamp,
    });
  } catch (e) {
    console.error('Failed to log info:', e);
  }
}

/**
 * Recupera todos os logs de erro
 */
export function getErrorLogs(): ErrorLog[] {
  try {
    const logs = localStorage.getItem(ERROR_LOG_KEY);
    return logs ? JSON.parse(logs) : [];
  } catch (e) {
    console.error('Failed to retrieve error logs:', e);
    return [];
  }
}

/**
 * Recupera logs por tipo
 */
export function getErrorLogsByType(type: 'error' | 'warning' | 'info'): ErrorLog[] {
  return getErrorLogs().filter(log => log.type === type);
}

/**
 * Recupera logs recentes (últimas N horas)
 */
export function getRecentErrorLogs(hoursAgo: number = 24): ErrorLog[] {
  const cutoffTime = Date.now() - (hoursAgo * 60 * 60 * 1000);
  return getErrorLogs().filter(log => {
    const logTime = new Date(log.timestamp).getTime();
    return logTime >= cutoffTime;
  });
}

/**
 * Limpa todos os logs de erro
 */
export function clearErrorLogs(): void {
  try {
    localStorage.removeItem(ERROR_LOG_KEY);
    console.info('✅ Error logs cleared');
  } catch (e) {
    console.error('Failed to clear error logs:', e);
  }
}

/**
 * Limpa logs antigos (mais de N dias)
 */
export function clearOldErrorLogs(daysAgo: number = 7): number {
  try {
    const cutoffTime = Date.now() - (daysAgo * 24 * 60 * 60 * 1000);
    const logs = getErrorLogs();
    
    const recentLogs = logs.filter(log => {
      const logTime = new Date(log.timestamp).getTime();
      return logTime >= cutoffTime;
    });
    
    const removed = logs.length - recentLogs.length;
    localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(recentLogs));
    
    console.info(`✅ Removed ${removed} old error logs`);
    return removed;
  } catch (e) {
    console.error('Failed to clear old error logs:', e);
    return 0;
  }
}

/**
 * Exporta logs para análise (formato JSON)
 */
export function exportErrorLogsJSON(): string {
  const logs = getErrorLogs();
  return JSON.stringify(logs, null, 2);
}

/**
 * Exporta logs para análise (formato CSV)
 */
export function exportErrorLogsCSV(): string {
  const logs = getErrorLogs();
  
  if (logs.length === 0) {
    return 'id,timestamp,type,message,url\n';
  }
  
  const headers = 'id,timestamp,type,message,url\n';
  const rows = logs.map(log => {
    return [
      log.id,
      log.timestamp,
      log.type,
      `"${log.message.replace(/"/g, '""')}"`, // Escape aspas
      log.url,
    ].join(',');
  }).join('\n');
  
  return headers + rows;
}

/**
 * Download dos logs como arquivo
 */
export function downloadErrorLogs(format: 'json' | 'csv' = 'json'): void {
  try {
    const content = format === 'json' 
      ? exportErrorLogsJSON() 
      : exportErrorLogsCSV();
    
    const blob = new Blob([content], { 
      type: format === 'json' ? 'application/json' : 'text/csv' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-logs-${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.info(`✅ Error logs downloaded as ${format.toUpperCase()}`);
  } catch (e) {
    console.error('Failed to download error logs:', e);
  }
}

/**
 * Estatísticas dos logs
 */
export function getErrorLogStats(): {
  total: number;
  errors: number;
  warnings: number;
  infos: number;
  last24h: number;
  last7days: number;
  mostRecentError?: ErrorLog;
} {
  const logs = getErrorLogs();
  const errors = logs.filter(log => log.type === 'error');
  const warnings = logs.filter(log => log.type === 'warning');
  const infos = logs.filter(log => log.type === 'info');
  
  const last24h = getRecentErrorLogs(24).length;
  const last7days = getRecentErrorLogs(24 * 7).length;
  
  const mostRecentError = errors.length > 0 
    ? errors[errors.length - 1] 
    : undefined;
  
  return {
    total: logs.length,
    errors: errors.length,
    warnings: warnings.length,
    infos: infos.length,
    last24h,
    last7days,
    mostRecentError,
  };
}

/**
 * Verifica se há muitos erros recentes (possível problema)
 */
export function hasExcessiveErrors(threshold: number = 10, hoursAgo: number = 1): boolean {
  const recentErrors = getRecentErrorLogs(hoursAgo).filter(log => log.type === 'error');
  return recentErrors.length >= threshold;
}

/**
 * Console helper para debug - mostra todos os logs
 */
export function debugErrorLogs(): void {
  const logs = getErrorLogs();
  const stats = getErrorLogStats();
  
  console.group('🔍 Error Logs Debug');
  console.log('Stats:', stats);
  console.table(logs.map(log => ({
    id: log.id.substring(0, 15) + '...',
    timestamp: new Date(log.timestamp).toLocaleString('pt-BR'),
    type: log.type,
    message: log.message.substring(0, 50) + '...',
  })));
  console.log('Full logs:', logs);
  console.groupEnd();
}

// Limpeza automática na inicialização (remove logs com mais de 30 dias)
if (typeof window !== 'undefined') {
  // Executa limpeza uma vez quando o módulo é carregado
  const lastCleanup = localStorage.getItem('error_logs_last_cleanup');
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  
  if (!lastCleanup || parseInt(lastCleanup) < oneDayAgo) {
    clearOldErrorLogs(30);
    localStorage.setItem('error_logs_last_cleanup', Date.now().toString());
  }
}
