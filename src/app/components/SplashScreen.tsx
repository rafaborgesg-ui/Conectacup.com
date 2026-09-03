import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import porscheCupLogo from 'figma:asset/3ae08ff326060d9638298673cda23da363101b9f.png';
import bgImage from 'figma:asset/259c0344182d6b72c303b23272de9d50609534c2.png';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Duração da splash screen (3 segundos)
    const timer = setTimeout(() => {
      setIsVisible(false);
      // Aguarda a animação de saída completar
      setTimeout(onComplete, 600);
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
        >
          {/* Imagem de fundo tecnológica */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${bgImage})`,
              opacity: 0.6
            }}
          />
          
          {/* Overlay escuro para melhor legibilidade */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60" />

          {/* Efeitos de fundo animados */}
          <div className="absolute inset-0 overflow-hidden">
            {/* Grid tecnológico */}
            <div 
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(213, 0, 0, 0.3) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(213, 0, 0, 0.3) 1px, transparent 1px)
                `,
                backgroundSize: '50px 50px',
                animation: 'grid-move 20s linear infinite'
              }}
            />

            {/* Partículas flutuantes */}
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-red-500 rounded-full"
                initial={{
                  x: Math.random() * window.innerWidth,
                  y: Math.random() * window.innerHeight,
                  opacity: 0,
                }}
                animate={{
                  y: [null, Math.random() * window.innerHeight],
                  opacity: [0, 0.6, 0],
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}

            {/* Círculos de pulso */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute border border-red-500/20 rounded-full"
                  style={{
                    width: 400 + i * 200,
                    height: 400 + i * 200,
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                  }}
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.2, 0.05, 0.2],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    delay: i * 0.8,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Container central */}
          <div className="relative z-10 flex flex-col items-center">
            {/* Logo com animação */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ 
                duration: 0.8,
                ease: [0.34, 1.56, 0.64, 1] // easeOutBack
              }}
              className="relative"
            >
              {/* Glow effect atrás do logo */}
              <div className="absolute inset-0 blur-3xl bg-gradient-to-r from-red-600/40 to-red-800/40 scale-150" />
              
              {/* Logo */}
              <div className="relative bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl">
                <img 
                  src={porscheCupLogo} 
                  alt="Conecta Cup" 
                  className="w-64 h-64 object-contain"
                />
              </div>
            </motion.div>

            {/* Texto com animação */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="mt-12 text-center"
            >
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-gray-200 to-red-200 bg-clip-text text-transparent mb-2">
                Conecta Cup
              </h1>
              <p className="text-gray-400 text-lg">
                Intranet Porsche Cup Brasil
              </p>
            </motion.div>

            {/* Barra de loading */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-12 w-64"
            >
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-red-600 to-red-400"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 2.5, ease: 'easeInOut' }}
                />
              </div>
            </motion.div>

            {/* Versão */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="mt-8 text-gray-600 text-sm"
            >
              v2.2.0
            </motion.div>
          </div>

          <style>{`
            @keyframes grid-move {
              0% {
                transform: translateY(0);
              }
              100% {
                transform: translateY(50px);
              }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
