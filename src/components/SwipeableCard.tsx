import { ReactNode, useState } from 'react';
import { motion } from 'motion/react';
import { useHorizontalSwipe } from '../utils/useSwipeGesture';
import { Trash2, Edit2, Check } from 'lucide-react';

interface SwipeableCardProps {
  children: ReactNode;
  onDelete?: () => void;
  onEdit?: () => void;
  onArchive?: () => void;
  className?: string;
  deleteText?: string;
  editText?: string;
  archiveText?: string;
}

/**
 * Card com ações de swipe
 * 
 * Features:
 * - Swipe left → Delete (vermelho)
 * - Swipe right → Edit (azul)
 * - Visual feedback animado
 * - Haptic feedback
 * - Confirmação de delete
 * 
 * @example
 * ```tsx
 * <SwipeableCard
 *   onDelete={() => handleDelete(item.id)}
 *   onEdit={() => handleEdit(item)}
 * >
 *   <div className="p-4">
 *     {item.name}
 *   </div>
 * </SwipeableCard>
 * ```
 */
export function SwipeableCard({
  children,
  onDelete,
  onEdit,
  onArchive,
  className = '',
  deleteText = 'Excluir',
  editText = 'Editar',
  archiveText = 'Arquivar',
}: SwipeableCardProps) {
  const [swipeState, setSwipeState] = useState<'idle' | 'delete' | 'edit' | 'archive'>('idle');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = () => {
    if (onDelete) {
      setIsDeleting(true);
      setTimeout(() => {
        onDelete();
      }, 300);
    }
  };

  const swipeHandlers = useHorizontalSwipe(
    () => {
      // Swipe left → Delete
      if (onDelete) {
        setSwipeState('delete');
        setTimeout(() => {
          if (confirm(`Confirma ${deleteText.toLowerCase()}?`)) {
            handleDelete();
          } else {
            setSwipeState('idle');
          }
        }, 100);
      }
    },
    () => {
      // Swipe right → Edit
      if (onEdit) {
        setSwipeState('edit');
        setTimeout(() => {
          onEdit();
          setSwipeState('idle');
        }, 300);
      }
    },
    {
      minSwipeDistance: 80,
      hapticFeedback: true,
    }
  );

  const getBackgroundColor = () => {
    switch (swipeState) {
      case 'delete':
        return 'bg-red-500';
      case 'edit':
        return 'bg-blue-500';
      case 'archive':
        return 'bg-green-500';
      default:
        return 'bg-gray-100';
    }
  };

  const getIcon = () => {
    switch (swipeState) {
      case 'delete':
        return <Trash2 className="text-white" size={24} />;
      case 'edit':
        return <Edit2 className="text-white" size={24} />;
      case 'archive':
        return <Check className="text-white" size={24} />;
      default:
        return null;
    }
  };

  const getText = () => {
    switch (swipeState) {
      case 'delete':
        return deleteText;
      case 'edit':
        return editText;
      case 'archive':
        return archiveText;
      default:
        return '';
    }
  };

  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`}>
      {/* Background de ação */}
      <div
        className={`absolute inset-0 flex items-center ${
          swipeState === 'edit' ? 'justify-start pl-6' : 'justify-end pr-6'
        } ${getBackgroundColor()} transition-colors duration-200`}
      >
        <div className="flex items-center gap-2">
          {getIcon()}
          <span className="text-white">{getText()}</span>
        </div>
      </div>

      {/* Card principal */}
      <motion.div
        {...swipeHandlers}
        animate={{
          x: isDeleting ? (swipeState === 'delete' ? -400 : 400) : 0,
          opacity: isDeleting ? 0 : 1,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative bg-white"
      >
        {children}
      </motion.div>
    </div>
  );
}

/**
 * Lista de cards swipeáveis
 * 
 * @example
 * ```tsx
 * <SwipeableList>
 *   {items.map(item => (
 *     <SwipeableCard
 *       key={item.id}
 *       onDelete={() => handleDelete(item.id)}
 *       onEdit={() => handleEdit(item)}
 *     >
 *       <ItemCard item={item} />
 *     </SwipeableCard>
 *   ))}
 * </SwipeableList>
 * ```
 */
export function SwipeableList({ 
  children, 
  className = '' 
}: { 
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {children}
    </div>
  );
}
