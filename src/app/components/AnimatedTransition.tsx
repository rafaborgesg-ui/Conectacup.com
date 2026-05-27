import { memo, ReactNode } from 'react';
import { motion, AnimatePresence, Variants } from 'motion/react';

/**
 * 🎨 Sistema de Animações Globais
 * 
 * Componentes reutilizáveis para animações consistentes em todo o sistema
 */

// Variantes de animação pré-definidas
export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] }
  }
};

export const slideUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] }
  }
};

export const slideDownVariants: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
  },
  exit: { 
    opacity: 0, 
    y: 20,
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] }
  }
};

export const slideRightVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
  },
  exit: { 
    opacity: 0, 
    x: 20,
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] }
  }
};

export const slideLeftVariants: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
  },
  exit: { 
    opacity: 0, 
    x: -20,
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] }
  }
};

export const scaleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      duration: 0.25, 
      ease: [0.4, 0, 0.2, 1]
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] }
  }
};

export const bounceVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      type: 'spring',
      stiffness: 400,
      damping: 25
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.8,
    transition: { duration: 0.2 }
  }
};

export const staggerChildrenVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1
    }
  }
};

interface AnimatedTransitionProps {
  children: ReactNode;
  variant?: 'fade' | 'slideUp' | 'slideDown' | 'slideRight' | 'slideLeft' | 'scale' | 'bounce';
  delay?: number;
  duration?: number;
  className?: string;
}

/**
 * 🎯 Componente de transição animada
 * 
 * @example
 * ```tsx
 * <AnimatedTransition variant="slideUp">
 *   <Content />
 * </AnimatedTransition>
 * ```
 */
export const AnimatedTransition = memo(({ 
  children, 
  variant = 'fade',
  delay = 0,
  duration,
  className 
}: AnimatedTransitionProps) => {
  const variantsMap = {
    fade: fadeInVariants,
    slideUp: slideUpVariants,
    slideDown: slideDownVariants,
    slideRight: slideRightVariants,
    slideLeft: slideLeftVariants,
    scale: scaleVariants,
    bounce: bounceVariants
  };

  const selectedVariants = variantsMap[variant];

  // Override duration if provided
  const customVariants = duration ? {
    ...selectedVariants,
    visible: {
      ...selectedVariants.visible,
      transition: {
        ...selectedVariants.visible.transition,
        duration,
        delay
      }
    }
  } : {
    ...selectedVariants,
    visible: {
      ...selectedVariants.visible,
      transition: {
        ...selectedVariants.visible.transition,
        delay
      }
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={customVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
});

AnimatedTransition.displayName = 'AnimatedTransition';

/**
 * 🎯 Lista com animação stagger (itens aparecem sequencialmente)
 * 
 * @example
 * ```tsx
 * <AnimatedList>
 *   <AnimatedListItem>Item 1</AnimatedListItem>
 *   <AnimatedListItem>Item 2</AnimatedListItem>
 *   <AnimatedListItem>Item 3</AnimatedListItem>
 * </AnimatedList>
 * ```
 */
export const AnimatedList = memo(({ 
  children, 
  className 
}: { 
  children: ReactNode; 
  className?: string;
}) => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={staggerChildrenVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
});

AnimatedList.displayName = 'AnimatedList';

export const AnimatedListItem = memo(({ 
  children, 
  className 
}: { 
  children: ReactNode; 
  className?: string;
}) => {
  return (
    <motion.div
      variants={slideUpVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
});

AnimatedListItem.displayName = 'AnimatedListItem';

/**
 * 🎯 Wrapper para AnimatePresence (gerencia enter/exit)
 * 
 * @example
 * ```tsx
 * <AnimatedPresence>
 *   {isVisible && (
 *     <AnimatedTransition variant="scale">
 *       <Modal />
 *     </AnimatedTransition>
 *   )}
 * </AnimatedPresence>
 * ```
 */
export const AnimatedPresence = AnimatePresence;

/**
 * 🎯 Success Animation (checkmark animado)
 */
export const SuccessAnimation = memo(() => {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 20
      }}
      className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100"
    >
      <motion.svg
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#059669"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <motion.path d="M20 6L9 17l-5-5" />
      </motion.svg>
    </motion.div>
  );
});

SuccessAnimation.displayName = 'SuccessAnimation';

/**
 * 🎯 Error Animation (X animado)
 */
export const ErrorAnimation = memo(() => {
  return (
    <motion.div
      initial={{ scale: 0, rotate: 180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 20
      }}
      className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100"
    >
      <motion.svg
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#DC2626"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <motion.line
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          x1="18" y1="6" x2="6" y2="18"
        />
        <motion.line
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          x1="6" y1="6" x2="18" y2="18"
        />
      </motion.svg>
    </motion.div>
  );
});

ErrorAnimation.displayName = 'ErrorAnimation';

/**
 * 🎯 Loading dots animados
 */
export const LoadingDots = memo(() => {
  return (
    <div className="inline-flex items-center gap-1">
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          animate={{
            y: [0, -10, 0],
            opacity: [0.3, 1, 0.3]
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: index * 0.15
          }}
          className="w-2 h-2 rounded-full bg-[#D50000]"
        />
      ))}
    </div>
  );
});

LoadingDots.displayName = 'LoadingDots';

/**
 * 🎯 Pulse Animation (para notificações)
 */
export const PulseAnimation = memo(({ 
  children, 
  className 
}: { 
  children: ReactNode;
  className?: string;
}) => {
  return (
    <motion.div
      animate={{
        scale: [1, 1.05, 1]
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut'
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
});

PulseAnimation.displayName = 'PulseAnimation';

/**
 * 🎯 Shake Animation (para erros)
 */
export const ShakeAnimation = memo(({ 
  children, 
  className,
  trigger 
}: { 
  children: ReactNode;
  className?: string;
  trigger?: boolean;
}) => {
  return (
    <motion.div
      animate={trigger ? {
        x: [0, -10, 10, -10, 10, 0],
      } : {}}
      transition={{
        duration: 0.5,
        ease: 'easeInOut'
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
});

ShakeAnimation.displayName = 'ShakeAnimation';

/**
 * 🎯 Slide In From Edge (para sheets/drawers)
 */
interface SlideInFromEdgeProps {
  children: ReactNode;
  from?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}

export const SlideInFromEdge = memo(({ 
  children, 
  from = 'right',
  className 
}: SlideInFromEdgeProps) => {
  const directions = {
    top: { y: '-100%', x: 0 },
    right: { x: '100%', y: 0 },
    bottom: { y: '100%', x: 0 },
    left: { x: '-100%', y: 0 }
  };

  return (
    <motion.div
      initial={directions[from]}
      animate={{ x: 0, y: 0 }}
      exit={directions[from]}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
});

SlideInFromEdge.displayName = 'SlideInFromEdge';

/**
 * 🎯 Collapse/Expand Animation
 */
interface CollapseProps {
  isOpen: boolean;
  children: ReactNode;
  className?: string;
}

export const Collapse = memo(({ isOpen, children, className }: CollapseProps) => {
  return (
    <motion.div
      initial={false}
      animate={{
        height: isOpen ? 'auto' : 0,
        opacity: isOpen ? 1 : 0
      }}
      transition={{
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1]
      }}
      className={className}
      style={{ overflow: 'hidden' }}
    >
      {children}
    </motion.div>
  );
});

Collapse.displayName = 'Collapse';

/**
 * 🎯 Hover Scale (para cards)
 */
export const HoverScale = memo(({ 
  children, 
  scale = 1.02,
  className 
}: { 
  children: ReactNode;
  scale?: number;
  className?: string;
}) => {
  return (
    <motion.div
      whileHover={{ scale }}
      whileTap={{ scale: scale - 0.03 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 25
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
});

HoverScale.displayName = 'HoverScale';
