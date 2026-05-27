/**
 * LiveRegion Component
 * Anuncia mudanças dinâmicas para leitores de tela
 * WCAG 2.1 - Guideline 4.1.3: Status Messages
 * 
 * USO:
 * <LiveRegion message={statusMessage} politeness="polite" />
 */

import { useEffect, useState } from 'react';

interface LiveRegionProps {
  message: string;
  politeness?: 'polite' | 'assertive' | 'off';
  clearDelay?: number;
}

export function LiveRegion({ 
  message, 
  politeness = 'polite',
  clearDelay = 3000 
}: LiveRegionProps) {
  const [currentMessage, setCurrentMessage] = useState('');

  useEffect(() => {
    if (message) {
      // Atualiza mensagem
      setCurrentMessage(message);
      
      // Limpa após delay
      const timer = setTimeout(() => {
        setCurrentMessage('');
      }, clearDelay);

      return () => clearTimeout(timer);
    }
  }, [message, clearDelay]);

  // Se politeness é 'off', não renderiza nada
  if (politeness === 'off') return null;

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {currentMessage}
    </div>
  );
}

/**
 * Hook auxiliar para usar LiveRegion
 * 
 * EXEMPLO:
 * const { announce } = useLiveRegion();
 * announce('Pneu registrado com sucesso');
 */
export function useLiveRegion() {
  const [message, setMessage] = useState('');

  const announce = (msg: string, politeness: 'polite' | 'assertive' = 'polite') => {
    setMessage(msg);
  };

  return {
    message,
    announce,
    LiveRegion: () => <LiveRegion message={message} />,
  };
}
