import { Badge } from './ui/badge';
import { useTireStatus } from '../utils/TireStatusContext';

interface StatusBadgeProps {
  statusName?: string | null;
  className?: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

export function StatusBadge({ statusName, className = '', variant = 'secondary' }: StatusBadgeProps) {
  const { getStatusByName, statusList } = useTireStatus();
  
  // Garantir que statusName seja uma string válida
  const safeName = (statusName && typeof statusName === 'string') ? statusName : 'Novo';
  
  // Tentar obter status - com fallback completo
  let statusObj = getStatusByName(safeName);
  
  // Se não encontrou, tenta buscar diretamente da lista (fallback)
  if (!statusObj && statusList && statusList.length > 0) {
    statusObj = statusList.find(s => s && s.name && s.name === safeName);
  }
  
  // Se ainda não encontrou, usa o primeiro da lista ou um padrão
  if (!statusObj) {
    statusObj = statusList && statusList.length > 0 
      ? statusList[0] 
      : { id: 'default', name: safeName, color: '#6B7280' };
  }
  
  const color = statusObj?.color || '#6B7280';
  
  return (
    <Badge
      variant={variant}
      className={`border ${className}`}
      style={{
        backgroundColor: `${color}20`,
        borderColor: color,
        color: color,
      }}
    >
      {safeName}
    </Badge>
  );
}
