/**
 * Utilitário para gerar marcas d'água em imagens de avarias
 * Gera código sequencial e formata informações para a marca d'água
 */

export interface WatermarkData {
  lineCode: string;
  stageName: string;
  driverNumber: string;
  driverName: string;
  category: string;
  classe: string;
  chassis: string;
  date: string;
  session: string;
}

/**
 * Gera o próximo código sequencial para a marca d'água
 * Formato: L + número sequencial com zero à esquerda (ex: L01, L02, L03...)
 * @param lastCode Último código registrado (opcional) - se não fornecido, começa do L01
 * @returns Próximo código sequencial
 */
export function getNextLineCode(lastCode?: string): string {
  let nextNumber = 1;
  
  if (lastCode && lastCode.startsWith('L')) {
    // Extrai o número do último código
    const currentNumber = parseInt(lastCode.substring(1), 10);
    if (!isNaN(currentNumber)) {
      nextNumber = currentNumber + 1;
    }
  }
  
  // Formata com zero à esquerda (L01, L02, L03...)
  return `L${String(nextNumber).padStart(2, '0')}`;
}

/**
 * Formata a data para o padrão brasileiro
 * @param date Data no formato YYYY-MM-DD ou Date object
 * @returns Data formatada como DD/MM/YYYY
 */
export function formatDate(date: string | Date): string {
  if (typeof date === 'string') {
    // Parse manual para evitar problemas de timezone
    // Quando a data vem de um input type="date", ela está no formato YYYY-MM-DD
    const [year, month, day] = date.split('-').map(Number);
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  }
  
  // Se for um objeto Date, usa os métodos normalmente
  const dateObj = date;
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  
  return `${day}/${month}/${year}`;
}

/**
 * Formata o nome da sessão para exibição
 * @param session Valor da sessão
 * @returns Nome formatado da sessão
 */
export function formatSession(session: string): string {
  const sessionMap: Record<string, string> = {
    'treino_livre': 'Treino Livre',
    'treino_livre_1': 'Treino Livre 1',
    'treino_livre_2': 'Treino Livre 2',
    'treino_livre_3': 'Treino Livre 3',
    'treino_livre_4': 'Treino Livre 4',
    'treino_opcional': 'Treino Opcional',
    'treino_opcional_1': 'Treino Opcional 1',
    'treino_opcional_2': 'Treino Opcional 2',
    'treino_opcional_3': 'Treino Opcional 3',
    'treino_opcional_4': 'Treino Opcional 4',
    'treino_extra': 'Treino Extra',
    'classificacao': 'Classificação',
    'corrida': 'Corrida',
    'corrida_1': 'Corrida 1',
    'corrida_2': 'Corrida 2',
  };
  
  return sessionMap[session] || session;
}

/**
 * Cria os dados da marca d'água a partir dos dados do formulário de avaria
 * @param lastCode Último código registrado (opcional) - se não fornecido, começa do L01
 */
export function createWatermarkData(
  stageName: string,
  driverNumber: string,
  driverName: string,
  category: string,
  classe: string,
  chassis: string,
  incidentDate: string,
  session: string,
  lastCode?: string
): WatermarkData {
  const lineCode = getNextLineCode(lastCode);
  
  return {
    lineCode,
    stageName,
    driverNumber,
    driverName,
    category,
    classe,
    chassis,
    date: formatDate(incidentDate),
    session: formatSession(session)
  };
}

/**
 * Processa uma imagem adicionando redimensionamento e marca d'água
 * @param imageFile Arquivo de imagem original
 * @param watermarkData Dados para a marca d'água
 * @returns Promise com o Blob da imagem processada
 */
export function processImageWithWatermark(
  imageFile: File,
  watermarkData: WatermarkData
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(imageFile);
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Não foi possível criar contexto do canvas'));
          return;
        }

        // Configura canvas para 800x600
        const TARGET_WIDTH = 800;
        const TARGET_HEIGHT = 600;
        canvas.width = TARGET_WIDTH;
        canvas.height = TARGET_HEIGHT;

        // Calcula escala para cobrir toda a área
        const scaleX = TARGET_WIDTH / img.width;
        const scaleY = TARGET_HEIGHT / img.height;
        const scale = Math.max(scaleX, scaleY);

        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        
        const x = (TARGET_WIDTH - scaledWidth) / 2;
        const y = (TARGET_HEIGHT - scaledHeight) / 2;

        // Desenha a imagem
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);
        ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

        // Adiciona marca d'água
        addWatermarkToCanvas(ctx, watermarkData);

        // Converte para blob
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Falha ao converter canvas para blob'));
          }
          URL.revokeObjectURL(url);
        }, 'image/jpeg', 0.92);
        
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Falha ao carregar imagem'));
    };
    
    img.src = url;
  });
}

/**
 * Adiciona a marca d'água ao canvas
 */
function addWatermarkToCanvas(ctx: CanvasRenderingContext2D, watermarkData: WatermarkData) {
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