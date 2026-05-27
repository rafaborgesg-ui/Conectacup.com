/**
 * Componente de Animação de Confirmação de Código de Barras
 * Exibe uma animação visual impactante quando um código é registrado com sucesso
 */

import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { useEffect } from 'react';

interface BarcodeConfirmationAnimationProps {
  show: boolean;
  barcode?: string;
  modelName?: string;
  type?: 'success' | 'error' | 'warning';
  message?: string;
}

export function BarcodeConfirmationAnimation({
  show,
  barcode,
  modelName,
  type = 'success',
  message,
}: BarcodeConfirmationAnimationProps) {
  // Som de "beep" quando exibido (apenas navegadores modernos)
  useEffect(() => {
    if (show && type === 'success') {
      // Cria um beep usando Web Audio API
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 880; // Frequência A5 (aguda e clara)
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
      } catch (error) {
        // Silenciosamente falha se Web Audio API não estiver disponível
        console.debug('Web Audio API não disponível para beep');
      }
    }
  }, [show, type]);

  const getColors = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'from-[#00A86B] to-[#00965F]',
          glow: 'shadow-[0_0_80px_rgba(0,168,107,0.6)]',
          icon: 'text-white',
          pulse: 'shadow-[0_0_0_0_rgba(0,168,107,0.7)]',
        };
      case 'error':
        return {
          bg: 'from-[#D50000] to-[#B00000]',
          glow: 'shadow-[0_0_80px_rgba(213,0,0,0.6)]',
          icon: 'text-white',
          pulse: 'shadow-[0_0_0_0_rgba(213,0,0,0.7)]',
        };
      case 'warning':
        return {
          bg: 'from-[#FFB800] to-[#FF9500]',
          glow: 'shadow-[0_0_80px_rgba(255,184,0,0.6)]',
          icon: 'text-gray-900',
          pulse: 'shadow-[0_0_0_0_rgba(255,184,0,0.7)]',
        };
    }
  };

  const colors = getColors();

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          style={{ pointerEvents: 'none' }}
        >
          {/* Partículas de fundo */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  opacity: 0,
                  scale: 0,
                  x: '50vw',
                  y: '50vh',
                }}
                animate={{ 
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0],
                  x: `${50 + (Math.cos((i / 12) * Math.PI * 2) * 40)}vw`,
                  y: `${50 + (Math.sin((i / 12) * Math.PI * 2) * 40)}vh`,
                }}
                transition={{
                  duration: 0.8,
                  delay: i * 0.03,
                  ease: 'easeOut',
                }}
                className={`absolute w-2 h-2 bg-gradient-to-br ${colors.bg} rounded-full`}
              />
            ))}
          </div>

          {/* Círculo principal com checkmark */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ 
              scale: [0, 1.2, 1],
              rotate: 0,
            }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ 
              duration: 0.5,
              ease: [0.34, 1.56, 0.64, 1], // Bounce easing
            }}
            className="relative"
          >
            {/* Glow externo pulsante */}
            <motion.div
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className={`absolute inset-0 rounded-full bg-gradient-to-br ${colors.bg} blur-3xl ${colors.glow}`}
            />

            {/* Círculo principal */}
            <div className={`relative w-32 h-32 rounded-full bg-gradient-to-br ${colors.bg} ${colors.glow} flex items-center justify-center`}>
              {/* Ícone de checkmark animado */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                <CheckCircle2 className={`w-16 h-16 ${colors.icon}`} strokeWidth={2.5} />
              </motion.div>

              {/* Sparkles ao redor */}
              {type === 'success' && (
                <>
                  {[...Array(4)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ 
                        opacity: [0, 1, 0],
                        scale: [0, 1, 0],
                        rotate: [0, 180],
                      }}
                      transition={{
                        duration: 0.8,
                        delay: 0.3 + (i * 0.1),
                        ease: 'easeOut',
                      }}
                      className="absolute"
                      style={{
                        top: `${20 + (Math.sin((i / 4) * Math.PI * 2) * 50)}%`,
                        left: `${20 + (Math.cos((i / 4) * Math.PI * 2) * 50)}%`,
                      }}
                    >
                      <Sparkles className="w-6 h-6 text-white" />
                    </motion.div>
                  ))}
                </>
              )}
            </div>
          </motion.div>

          {/* Informações do código de barras */}
          {(barcode || modelName || message) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              className="absolute bottom-32 left-1/2 -translate-x-1/2 text-center"
            >
              {message && (
                <p className="text-white text-2xl font-bold mb-2 drop-shadow-lg">
                  {message}
                </p>
              )}
              {modelName && (
                <p className="text-white/90 text-lg mb-1 drop-shadow-lg">
                  {modelName}
                </p>
              )}
              {barcode && (
                <div className="inline-block px-4 py-2 bg-black/60 backdrop-blur-md rounded-lg">
                  <p className="text-white font-mono text-xl tracking-wider drop-shadow-lg">
                    {barcode}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
