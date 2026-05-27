import React, { useState, useRef, useEffect } from 'react';
import { X, Check, RotateCw, ZoomIn, ZoomOut, Move } from 'lucide-react';

interface ImageEditorProps {
  isOpen: boolean;
  imageFile: File;
  onClose: () => void;
  onSave: (processedBlob: Blob) => void;
  watermarkData: {
    lineCode: string;
    stageName: string;
    driverNumber: string;
    driverName: string;
    category: string;
    classe: string;
    chassis: string;
    date: string;
    session: string;
  };
}

export default function ImageEditor({ isOpen, imageFile, onClose, onSave, watermarkData }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const TARGET_WIDTH = 800;
  const TARGET_HEIGHT = 600;

  useEffect(() => {
    if (imageFile && isOpen) {
      const img = new Image();
      const url = URL.createObjectURL(imageFile);
      
      img.onload = () => {
        // Calcula escala inicial para cobrir a área de 800x600
        const scaleX = TARGET_WIDTH / img.width;
        const scaleY = TARGET_HEIGHT / img.height;
        const initialScale = Math.max(scaleX, scaleY);
        
        setImage(img);
        setScale(initialScale);
        setOffsetX(0);
        setOffsetY(0);
        
        URL.revokeObjectURL(url);
      };
      
      img.src = url;
    }
  }, [imageFile, isOpen]);

  useEffect(() => {
    if (image && canvasRef.current) {
      drawCanvas();
    }
  }, [image, scale, offsetX, offsetY]);

  function drawCanvas() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (!canvas || !ctx || !image) return;

    // Configura canvas para 800x600
    canvas.width = TARGET_WIDTH;
    canvas.height = TARGET_HEIGHT;

    // Limpa canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);

    // Calcula posição centralizada da imagem
    const scaledWidth = image.width * scale;
    const scaledHeight = image.height * scale;
    
    const x = (TARGET_WIDTH - scaledWidth) / 2 + offsetX;
    const y = (TARGET_HEIGHT - scaledHeight) / 2 + offsetY;

    // Desenha a imagem
    ctx.drawImage(image, x, y, scaledWidth, scaledHeight);

    // Desenha marca d'água
    drawWatermark(ctx);
  }

  function drawWatermark(ctx: CanvasRenderingContext2D) {
    const padding = 12;
    const lineHeight = 18;
    const bgPadding = 8;

    // Textos da marca d'água
    const lines = [
      watermarkData.lineCode,
      watermarkData.stageName,
      `#${watermarkData.driverNumber} - ${watermarkData.driverName} - ${watermarkData.category}`,
      `${watermarkData.classe} - ${watermarkData.chassis}`,
      `${watermarkData.date} - ${watermarkData.session}`
    ];

    // Configuração de fonte
    ctx.font = 'bold 14px Arial, sans-serif';
    
    // Calcula largura máxima
    const maxWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
    const bgWidth = maxWidth + (bgPadding * 2);
    const bgHeight = (lines.length * lineHeight) + (bgPadding * 2);

    // Desenha fundo semi-transparente
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(padding, padding, bgWidth, bgHeight);

    // Desenha textos
    ctx.fillStyle = '#FFD700'; // Dourado para o código da linha
    ctx.fillText(lines[0], padding + bgPadding, padding + bgPadding + 14);

    ctx.fillStyle = '#FFFFFF';
    for (let i = 1; i < lines.length; i++) {
      ctx.fillText(lines[i], padding + bgPadding, padding + bgPadding + 14 + (i * lineHeight));
    }
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offsetX, y: e.clientY - offsetY });
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDragging) return;
    
    setOffsetX(e.clientX - dragStart.x);
    setOffsetY(e.clientY - dragStart.y);
  }

  function handleMouseUp() {
    setIsDragging(false);
  }

  function handleZoomIn() {
    setScale(prev => Math.min(prev * 1.2, 5));
  }

  function handleZoomOut() {
    setScale(prev => Math.max(prev / 1.2, 0.1));
  }

  function handleReset() {
    if (!image) return;
    
    const scaleX = TARGET_WIDTH / image.width;
    const scaleY = TARGET_HEIGHT / image.height;
    const initialScale = Math.max(scaleX, scaleY);
    
    setScale(initialScale);
    setOffsetX(0);
    setOffsetY(0);
  }

  function handleSave() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (blob) {
        onSave(blob);
      }
    }, 'image/jpeg', 0.92);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full mx-4">
        {/* Header */}
        <div className="border-b border-gray-200 p-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900">Ajustar Foto</h3>
            <p className="text-xs text-gray-600 mt-1">
              Redimensione e posicione a imagem. A marca d'água será adicionada automaticamente.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Canvas Area */}
        <div className="p-6 bg-gray-100">
          <div className="relative inline-block mx-auto" style={{ display: 'flex', justifyContent: 'center' }}>
            <canvas
              ref={canvasRef}
              width={TARGET_WIDTH}
              height={TARGET_HEIGHT}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="border-2 border-gray-300 cursor-move shadow-lg"
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={handleZoomOut}
                className="flex items-center gap-2 px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 transition-colors"
              >
                <ZoomOut className="w-4 h-4" />
                Reduzir
              </button>
              <button
                onClick={handleZoomIn}
                className="flex items-center gap-2 px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
                Ampliar
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 transition-colors"
              >
                <RotateCw className="w-4 h-4" />
                Resetar
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Move className="w-4 h-4" />
              Arraste para posicionar
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Confirmar Foto
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
