import { ReactNode, useState, TouchEvent, CSSProperties } from 'react';

interface TouchFeedbackProps {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  haptic?: boolean;
  ripple?: boolean;
  scale?: boolean;
  className?: string;
  style?: CSSProperties;
  longPressDuration?: number;
}

/**
 * Componente para adicionar feedback tátil em elementos
 * 
 * Features:
 * - Active state (scale + opacity)
 * - Ripple effect
 * - Haptic feedback (vibração)
 * - Long press detection
 * - Customizável
 * 
 * @example
 * ```tsx
 * <TouchFeedback 
 *   onPress={() => console.log('Pressed')}
 *   ripple
 *   haptic
 * >
 *   <Button>Click me</Button>
 * </TouchFeedback>
 * ```
 */
export function TouchFeedback({
  children,
  onPress,
  onLongPress,
  disabled = false,
  haptic = true,
  ripple = false,
  scale = true,
  className = '',
  style,
  longPressDuration = 500,
}: TouchFeedbackProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);
  const longPressTimer = useState<NodeJS.Timeout | null>(null)[0];

  const handleTouchStart = (e: TouchEvent) => {
    if (disabled) return;

    setIsPressed(true);

    // Haptic feedback
    if (haptic && navigator.vibrate) {
      navigator.vibrate(10);
    }

    // Ripple effect
    if (ripple) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;
      
      setRipples(prev => [...prev, { x, y, id: Date.now() }]);

      // Remove ripple após animação
      setTimeout(() => {
        setRipples(prev => prev.slice(1));
      }, 600);
    }

    // Long press detection
    if (onLongPress) {
      const timer = setTimeout(() => {
        if (haptic && navigator.vibrate) {
          navigator.vibrate(20); // Vibração mais longa para long press
        }
        onLongPress();
        setIsPressed(false);
      }, longPressDuration);

      // Store timer to clear if touch ends early
      Object.assign(longPressTimer, timer);
    }
  };

  const handleTouchEnd = () => {
    setIsPressed(false);

    // Clear long press timer
    if (longPressTimer) {
      clearTimeout(longPressTimer);
    }

    // Trigger onPress if defined
    if (onPress && !disabled) {
      onPress();
    }
  };

  const handleTouchCancel = () => {
    setIsPressed(false);

    // Clear long press timer
    if (longPressTimer) {
      clearTimeout(longPressTimer);
    }
  };

  const pressedStyle: CSSProperties = isPressed && scale
    ? {
        transform: 'scale(0.97)',
        opacity: 0.85,
        transition: 'all 0.1s ease',
      }
    : {};

  return (
    <div
      className={`relative overflow-hidden ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      style={{ ...style, ...pressedStyle }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      {children}

      {/* Ripple effects */}
      {ripple && ripples.map(({ x, y, id }) => (
        <span
          key={id}
          className="absolute pointer-events-none"
          style={{
            left: x,
            top: y,
            width: 100,
            height: 100,
            marginLeft: -50,
            marginTop: -50,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.5)',
            animation: 'ripple 0.6s ease-out',
          }}
        />
      ))}
    </div>
  );
}

/**
 * Higher Order Component para adicionar touch feedback
 * 
 * @example
 * ```tsx
 * const TouchButton = withTouchFeedback(Button);
 * 
 * <TouchButton onClick={() => console.log('Clicked')}>
 *   Click me
 * </TouchButton>
 * ```
 */
export function withTouchFeedback<P extends object>(
  Component: React.ComponentType<P>
) {
  return function TouchFeedbackWrapper(props: P & { touchConfig?: Partial<TouchFeedbackProps> }) {
    const { touchConfig, ...rest } = props;

    return (
      <TouchFeedback {...touchConfig}>
        <Component {...(rest as P)} />
      </TouchFeedback>
    );
  };
}

/**
 * Hook para adicionar haptic feedback manualmente
 * 
 * @example
 * ```tsx
 * const haptic = useHaptic();
 * 
 * <button onClick={() => {
 *   haptic.light();
 *   handleClick();
 * }}>
 *   Click me
 * </button>
 * ```
 */
export function useHaptic() {
  const vibrate = (duration: number | number[]) => {
    if (navigator.vibrate) {
      navigator.vibrate(duration);
    }
  };

  return {
    light: () => vibrate(10),
    medium: () => vibrate(20),
    heavy: () => vibrate(30),
    success: () => vibrate([10, 50, 10]),
    warning: () => vibrate([20, 30, 20]),
    error: () => vibrate([10, 50, 10, 50, 10]),
    custom: vibrate,
  };
}

// Adiciona animação ripple ao CSS global
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes ripple {
      to {
        transform: scale(4);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}
