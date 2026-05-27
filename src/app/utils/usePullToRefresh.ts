import { useState, useEffect, useRef, TouchEvent } from 'react';

export interface PullToRefreshConfig {
  threshold?: number;
  maxPullDistance?: number;
  onRefresh: () => Promise<void>;
  enabled?: boolean;
  hapticFeedback?: boolean;
}

/**
 * Hook para implementar Pull to Refresh
 * 
 * Features:
 * - Pull down para atualizar
 * - Spinner animado
 * - Haptic feedback
 * - Apenas em mobile
 * - Detecta se está no topo da página
 * 
 * @example
 * ```tsx
 * const {
 *   isPulling,
 *   isRefreshing,
 *   pullDistance,
 *   pullHandlers,
 *   PullIndicator
 * } = usePullToRefresh({
 *   onRefresh: async () => {
 *     await loadData();
 *   },
 *   threshold: 80,
 * });
 * 
 * <div {...pullHandlers}>
 *   <PullIndicator />
 *   {content}
 * </div>
 * ```
 */
export function usePullToRefresh({
  threshold = 80,
  maxPullDistance = 120,
  onRefresh,
  enabled = true,
  hapticFeedback = true,
}: PullToRefreshConfig) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const currentY = useRef(0);
  const isAtTop = useRef(true);

  // Detecta se está no topo da página
  useEffect(() => {
    const handleScroll = () => {
      isAtTop.current = window.scrollY === 0;
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleTouchStart = (e: TouchEvent) => {
    if (!enabled || !isAtTop.current || isRefreshing) return;

    startY.current = e.touches[0].clientY;
    currentY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!enabled || !isAtTop.current || isRefreshing) return;

    currentY.current = e.touches[0].clientY;
    const distance = currentY.current - startY.current;

    if (distance > 0) {
      // Pull down detected
      const cappedDistance = Math.min(distance, maxPullDistance);
      setPullDistance(cappedDistance);

      if (cappedDistance > threshold && !isPulling) {
        setIsPulling(true);
        if (hapticFeedback && navigator.vibrate) {
          navigator.vibrate(10);
        }
      } else if (cappedDistance <= threshold && isPulling) {
        setIsPulling(false);
      }
    }
  };

  const handleTouchEnd = async () => {
    if (!enabled || !isAtTop.current || isRefreshing) return;

    if (isPulling && pullDistance > threshold) {
      setIsRefreshing(true);

      if (hapticFeedback && navigator.vibrate) {
        navigator.vibrate(20);
      }

      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setIsPulling(false);
        setPullDistance(0);
      }
    } else {
      setIsPulling(false);
      setPullDistance(0);
    }
  };

  const pullHandlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };

  // Componente indicador de pull
  const PullIndicator = () => {
    const opacity = Math.min(pullDistance / threshold, 1);
    const rotation = (pullDistance / maxPullDistance) * 360;

    return (
      <div
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center transition-all duration-200"
        style={{
          height: pullDistance,
          opacity,
          pointerEvents: 'none',
        }}
      >
        <div className="bg-white rounded-full p-2 shadow-lg">
          {isRefreshing ? (
            <div className="w-6 h-6 border-3 border-[#D50000] border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg
              className="w-6 h-6 text-[#D50000]"
              style={{ transform: `rotate(${rotation}deg)` }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          )}
        </div>
      </div>
    );
  };

  const progress = Math.min((pullDistance / threshold) * 100, 100);

  return {
    isPulling,
    isRefreshing,
    pullDistance,
    progress,
    pullHandlers,
    PullIndicator,
  };
}

/**
 * Versão simplificada do Pull to Refresh
 * Apenas retorna os handlers, sem componente visual
 * 
 * @example
 * ```tsx
 * const pullHandlers = useSimplePullToRefresh(async () => {
 *   await loadData();
 * });
 * 
 * <div {...pullHandlers}>
 *   {content}
 * </div>
 * ```
 */
export function useSimplePullToRefresh(
  onRefresh: () => Promise<void>,
  config?: Omit<PullToRefreshConfig, 'onRefresh'>
) {
  const { pullHandlers } = usePullToRefresh({
    onRefresh,
    ...config,
  });

  return pullHandlers;
}
