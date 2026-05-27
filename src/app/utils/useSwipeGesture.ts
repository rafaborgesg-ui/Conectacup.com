import { useState, TouchEvent } from 'react';

export interface SwipeCallbacks {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

export interface SwipeConfig {
  minSwipeDistance?: number;
  maxSwipeTime?: number;
  preventScroll?: boolean;
  hapticFeedback?: boolean;
}

/**
 * Hook para detectar gestos de swipe em elementos
 * 
 * Features:
 * - Swipe em 4 direções (left, right, up, down)
 * - Configurável (distância mínima, tempo máximo)
 * - Haptic feedback opcional (vibração)
 * - Prevent scroll opcional
 * 
 * @example
 * ```tsx
 * const swipeHandlers = useSwipeGesture({
 *   onSwipeLeft: () => console.log('Swiped left'),
 *   onSwipeRight: () => console.log('Swiped right'),
 * }, {
 *   minSwipeDistance: 50,
 *   hapticFeedback: true,
 * });
 * 
 * <div {...swipeHandlers}>
 *   Swipe me!
 * </div>
 * ```
 */
export function useSwipeGesture(
  callbacks: SwipeCallbacks,
  config: SwipeConfig = {}
) {
  const {
    minSwipeDistance = 50,
    maxSwipeTime = 500,
    preventScroll = false,
    hapticFeedback = true,
  } = config;

  const [touchStart, setTouchStart] = useState<{ x: number; y: number; time: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  const onTouchStart = (e: TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
      time: Date.now(),
    });
  };

  const onTouchMove = (e: TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });

    // Previne scroll se configurado
    if (preventScroll && touchStart) {
      const deltaX = Math.abs(e.targetTouches[0].clientX - touchStart.x);
      const deltaY = Math.abs(e.targetTouches[0].clientY - touchStart.y);

      // Se swipe horizontal > vertical, previne scroll
      if (deltaX > deltaY) {
        e.preventDefault();
      }
    }
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const deltaX = touchStart.x - touchEnd.x;
    const deltaY = touchStart.y - touchEnd.y;
    const deltaTime = Date.now() - touchStart.time;

    // Verifica se foi rápido o suficiente
    if (deltaTime > maxSwipeTime) return;

    // Determina se foi swipe horizontal ou vertical
    const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);

    // Haptic feedback
    const triggerHaptic = () => {
      if (hapticFeedback && navigator.vibrate) {
        navigator.vibrate(10);
      }
    };

    if (isHorizontal) {
      // Swipe horizontal
      if (Math.abs(deltaX) < minSwipeDistance) return;

      if (deltaX > 0 && callbacks.onSwipeLeft) {
        triggerHaptic();
        callbacks.onSwipeLeft();
      } else if (deltaX < 0 && callbacks.onSwipeRight) {
        triggerHaptic();
        callbacks.onSwipeRight();
      }
    } else {
      // Swipe vertical
      if (Math.abs(deltaY) < minSwipeDistance) return;

      if (deltaY > 0 && callbacks.onSwipeUp) {
        triggerHaptic();
        callbacks.onSwipeUp();
      } else if (deltaY < 0 && callbacks.onSwipeDown) {
        triggerHaptic();
        callbacks.onSwipeDown();
      }
    }
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}

/**
 * Variante simplificada para swipe apenas horizontal
 * 
 * @example
 * ```tsx
 * const swipeHandlers = useHorizontalSwipe(
 *   () => handleDelete(), // swipe left
 *   () => handleEdit()    // swipe right
 * );
 * 
 * <div {...swipeHandlers}>
 *   Swipe horizontal
 * </div>
 * ```
 */
export function useHorizontalSwipe(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  config?: SwipeConfig
) {
  return useSwipeGesture(
    { onSwipeLeft, onSwipeRight },
    { ...config, preventScroll: true }
  );
}

/**
 * Variante simplificada para swipe apenas vertical
 * 
 * @example
 * ```tsx
 * const swipeHandlers = useVerticalSwipe(
 *   () => handleUp(),
 *   () => handleDown()
 * );
 * 
 * <div {...swipeHandlers}>
 *   Swipe vertical
 * </div>
 * ```
 */
export function useVerticalSwipe(
  onSwipeUp?: () => void,
  onSwipeDown?: () => void,
  config?: SwipeConfig
) {
  return useSwipeGesture(
    { onSwipeUp, onSwipeDown },
    config
  );
}
