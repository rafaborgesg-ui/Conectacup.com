# 📱 Entrada de Estoque - Versão Mobile TC22

## 🎯 Visão Geral

Sistema de **detecção automática** que renderiza a versão apropriada da página "Entrada de Estoque" baseado no dispositivo:

- **🖥️ Desktop/Tablet** → Versão Web completa (original)
- **📱 Coletor TC22** → Versão Mobile otimizada (800x480px)

## ✨ Recursos Implementados

### 📋 **Versão Mobile - TODOS os Recursos da Web**

#### **1. Entrada Individual** (Tab 1)
- ✅ Seleção de Modelo e Contêiner
- ✅ Input de código com teclado numérico otimizado
- ✅ Scanner de código de barras via câmera
- ✅ Validação em tempo real (7-8 dígitos)
- ✅ Verificação de duplicatas (sessão + banco)
- ✅ Auto-foco no input
- ✅ Enter para registrar
- ✅ Feedback visual e haptic
- ✅ Lista de registros da sessão
- ✅ Remoção individual de registros

#### **2. Entrada em Lote** (Tab 2)
- ✅ Seleção única de Modelo e Contêiner
- ✅ Textarea para múltiplos códigos
- ✅ Suporte a múltiplos separadores (quebra de linha, vírgula, espaço)
- ✅ Validação automática de formato
- ✅ Processamento assíncrono com progresso
- ✅ Contador em tempo real (sucesso/duplicados/erros)
- ✅ Barra de progresso visual
- ✅ Status detalhado do processamento
- ✅ Feedback ao completar

#### **3. Entrada via Planilha** (Tab 3)
- ✅ Seleção de Contêiner padrão
- ✅ Textarea para colar dados
- ✅ Suporte a formato TAB e vírgula
- ✅ Formato: `Modelo[TAB|,]Código`
- ✅ Busca inteligente de modelos (nome completo ou parcial)
- ✅ Validação de códigos e modelos
- ✅ Processamento assíncrono
- ✅ Barra de progresso
- ✅ Relatório de erros por linha
- ✅ Contador de sucesso/erros

### 🎨 **Interface Otimizada TC22**

#### **Layout**
- ✅ **Resolução alvo**: 800x480px (landscape)
- ✅ **Layout vertical**: Scroll suave
- ✅ **Header fixo**: Info essencial sempre visível
- ✅ **Tabs horizontais**: Navegação fácil entre modos
- ✅ **Footer flutuante**: Stats da sessão

#### **Componentes Touch-Friendly**
- ✅ **Botões grandes**: Mínimo 48px de altura
- ✅ **Inputs amplos**: Padding generoso (16-20px)
- ✅ **Font-size adequado**: 16px+ (previne zoom no iOS)
- ✅ **Espaçamento**: Gap de 16px entre elementos
- ✅ **Feedback visual**: Hover, active states

#### **Tipografia**
- ✅ **Header**: 18-24px
- ✅ **Códigos**: 24px (mono)
- ✅ **Texto normal**: 14-16px
- ✅ **Labels**: 12-14px (semibold)

### 🔌 **Sistema Offline Integrado**

- ✅ **Indicador de conexão** no header (Wifi/WifiOff)
- ✅ **Funcionamento offline completo**
- ✅ **Salvamento local automático**
- ✅ **Sincronização quando online**
- ✅ **Queue persistente** (sobrevive a fechamento)
- ✅ **Retry inteligente** com backoff exponencial

### 📊 **Estatísticas em Tempo Real**

- ✅ **Contador de sucesso**: Pneus registrados
- ✅ **Contador de erros**: Falhas/duplicatas
- ✅ **Total da sessão**: Soma de entradas
- ✅ **Badge com total**: Sempre visível

### 🎯 **Feedback do Usuário**

- ✅ **Haptic feedback**: Vibração em ações (sucesso/erro/impact)
- ✅ **Animação de sucesso**: Confirmação visual
- ✅ **Toasts informativos**: Mensagens claras
- ✅ **Loading states**: Spinners durante salvamento
- ✅ **Progress bars**: Processamento em lote/planilha

## 🔍 Detecção Automática

### **Critérios de Detecção**

O sistema detecta automaticamente se é um coletor TC22 através de:

1. **Resolução da Tela**
   - 800x480 pixels (landscape)
   - 480x800 pixels (portrait)

2. **User Agent**
   - Contém "zebra"
   - Contém "tc22"
   - Contém "tc2"
   - Contém "mc33" (outros modelos Zebra)

3. **Android + Tela Pequena**
   - Android com largura ≤ 800px

4. **Flag Manual** (para testes)
   - localStorage: `force-mobile-stock-entry`

### **Como Funciona**

```typescript
// Estrutura de arquivos
TireStockEntryWrapper.tsx  (Detecta dispositivo)
├── TireStockEntryMobile.tsx  (Versão mobile TC22)
└── TireStockEntry.tsx  (Versão desktop original)
```

**Fluxo:**
1. Usuário acessa `/pneus/entrada`
2. Wrapper detecta o dispositivo
3. Renderiza versão apropriada
4. Zero mudanças necessárias no código

## 🛠️ Utilitários de Debug

### **No Console do Navegador**

```javascript
// Verifica qual versão está ativa
window.checkStockEntryVersion()
// Retorna: { version: 'mobile' | 'desktop', resolution, userAgent, forceMobile }

// Alterna modo mobile manualmente (para testes)
window.toggleStockEntryMobileMode()
// Força modo mobile e recarrega a página

// Verifica se modo mobile está forçado
localStorage.getItem('force-mobile-stock-entry')
// Retorna: 'true' ou null
```

### **Exemplos de Uso**

#### **Forçar Modo Mobile no Desktop (para testes)**
```javascript
// No console do navegador desktop:
window.toggleStockEntryMobileMode()
// Agora vai renderizar versão mobile mesmo no desktop
```

#### **Verificar Resolução**
```javascript
console.log(`${window.innerWidth}x${window.innerHeight}`)
// Exemplo: 800x480 (TC22)
```

#### **Desforçar Modo Mobile**
```javascript
// Executar novamente para voltar ao normal:
window.toggleStockEntryMobileMode()
```

## 📱 Especificações do TC22

### **Hardware**
- **Modelo**: Zebra TC22
- **Resolução**: 800x480 pixels
- **Orientação**: Landscape (principal)
- **Touchscreen**: Capacitivo multi-touch
- **Scanner**: Integrado (1D/2D)
- **SO**: Android

### **Otimizações Aplicadas**

#### **Performance**
- ✅ Debounce em inputs
- ✅ Throttle em scroll
- ✅ Lazy loading de imagens
- ✅ Memoização de cálculos
- ✅ Processamento assíncrono

#### **UX Mobile**
- ✅ Teclado numérico para códigos
- ✅ Auto-foco inteligente
- ✅ Scroll suave
- ✅ Botões espaçados (anti-fat-finger)
- ✅ Feedback imediato

#### **Acessibilidade**
- ✅ Contraste adequado (WCAG AA)
- ✅ Tamanho mínimo de toque (44x44px)
- ✅ Labels claros
- ✅ Estados visuais distintos

## 🎨 Guia de Cores

```css
/* Primárias Porsche */
--red-primary: #D50000      /* Botões principais */
--red-dark: #B00000         /* Hover vermelho */
--black: #000000            /* Texto importante */
--white: #FFFFFF            /* Background */

/* Cinzas */
--gray-50: #F9FAFB          /* Background secundário */
--gray-100: #F3F4F6         /* Hover cinza */
--gray-200: #E5E7EB         /* Borders */
--gray-300: #D1D5DB         /* Disabled */
--gray-400: #9CA3AF         /* Placeholder */
--gray-500: #6B7280         /* Labels */
--gray-600: #4B5563         /* Texto secundário */
--gray-700: #374151         /* Texto normal */
--gray-800: #1F2937         /* Texto escuro */
--gray-900: #111827         /* Texto principal */

/* Status */
--green-300: #6EE7B7        /* Online */
--green-500: #10B981        /* Sucesso */
--yellow-300: #FCD34D       /* Offline (aviso) */
--yellow-500: #F59E0B       /* Warning */
--blue-600: #2563EB         /* Modo Lote */
--purple-600: #9333EA       /* Modo Planilha */
--red-500: #EF4444          /* Erro */
```

## 📋 Comparação: Web vs Mobile

| Recurso | Web (Desktop) | Mobile (TC22) |
|---------|--------------|---------------|
| **Entrada Individual** | ✅ Completo | ✅ Completo |
| **Entrada em Lote** | ✅ Completo | ✅ Completo |
| **Entrada Planilha** | ✅ Completo | ✅ Completo |
| **Scanner Câmera** | ✅ Sim | ✅ Sim |
| **Auto-foco** | ✅ Com toggle | ✅ Sempre ativo |
| **Atalhos Teclado** | ✅ 1-7 ou A-G | ❌ Não (desnecessário) |
| **Page Header** | ✅ Completo | ✅ Compacto |
| **Breadcrumbs** | ✅ Sim | ❌ Não (economiza espaço) |
| **Sidebar** | ✅ Sim | ❌ Não (fullscreen) |
| **Feedback Haptic** | ❌ Não | ✅ Sim |
| **Stats Header** | ❌ Não | ✅ Sempre visível |
| **Layout** | 🖥️ Horizontal | 📱 Vertical scroll |

## 🧪 Cenários de Teste

### **1. Entrada Individual**
- [ ] Digitar código manualmente
- [ ] Usar scanner de código de barras
- [ ] Validar formato (7-8 dígitos)
- [ ] Verificar duplicata na sessão
- [ ] Verificar duplicata no banco
- [ ] Testar com internet
- [ ] Testar sem internet
- [ ] Auto-foco após registrar
- [ ] Remover registro da lista

### **2. Entrada em Lote**
- [ ] Processar 10 códigos válidos
- [ ] Processar códigos com separadores mistos
- [ ] Processar códigos com formato inválido
- [ ] Verificar barra de progresso
- [ ] Verificar contador em tempo real
- [ ] Testar com internet oscilante
- [ ] Toast de resumo correto

### **3. Entrada Planilha**
- [ ] Colar dados com TAB
- [ ] Colar dados com vírgula
- [ ] Modelo não encontrado (erro)
- [ ] Código inválido (erro)
- [ ] Busca parcial de modelo
- [ ] Processamento correto
- [ ] Relatório de erros

### **4. Sistema Offline**
- [ ] Indicador verde quando online
- [ ] Indicador vermelho quando offline
- [ ] Salva localmente quando offline
- [ ] Sincroniza ao voltar online
- [ ] Mantém dados após fechar app

### **5. Detecção de Dispositivo**
- [ ] TC22 real detecta como mobile
- [ ] Desktop detecta como web
- [ ] Tablet detecta como web
- [ ] Modo forçado funciona
- [ ] Resize não quebra

## 🐛 Troubleshooting

### **Versão mobile não carrega no TC22**

```javascript
// 1. Verificar detecção
window.checkStockEntryVersion()

// 2. Verificar resolução
console.log(`${window.innerWidth}x${window.innerHeight}`)

// 3. Verificar user agent
console.log(navigator.userAgent)

// 4. Forçar manualmente
window.toggleStockEntryMobileMode()
```

### **Scanner não funciona**

1. Verificar permissões de câmera no Android
2. Garantir que está em HTTPS (câmera requer secure context)
3. Testar no navegador Chrome nativo
4. Verificar se `BarcodeScanner` component existe

### **Performance ruim**

1. Verificar quantidade de registros na sessão (limite: ~1000)
2. Limpar cache do navegador
3. Reiniciar o app
4. Verificar memória disponível no TC22

### **Dados não sincronizam**

```javascript
// Verificar queue offline
import('./utils/offlineQueue').then(m => {
  console.log('Queue stats:', m.offlineQueue.getStats());
  // Forçar sincronização
  m.offlineQueue.forceSyncNow();
});
```

### **Layout quebrado**

1. Verificar se CSS está carregado
2. Limpar cache do navegador
3. Verificar console para erros
4. Recarregar página

## 📈 Métricas de Sucesso

### **Performance**
- ⏱️ Tempo de carregamento: < 2s
- ⏱️ Tempo de registro: < 1s por pneu
- ⏱️ FPS: 60fps em animações
- ⏱️ Resposta do input: < 100ms

### **Qualidade**
- ✅ Taxa de erro: < 1%
- ✅ Precisão do scanner: > 95%
- ✅ Duplicatas evitadas: 100%
- ✅ Sync offline: 100%

### **UX**
- 😊 Satisfação do usuário: > 90%
- 🎯 Facilidade de uso: > 90%
- ⚡ Produtividade: +50% vs papel

## 🚀 Próximas Melhorias

### **Em Consideração**
- [ ] Modo noturno (dark mode)
- [ ] Atalhos personalizáveis
- [ ] Histórico de sessões anteriores
- [ ] Export de relatório da sessão
- [ ] Estatísticas por operador
- [ ] Integração com impressora Zebra
- [ ] Reconhecimento por voz
- [ ] Modo offline-first avançado
- [ ] Cache inteligente preditivo

### **Feedback do Usuário**
- [ ] Coletar feedback dos operadores
- [ ] Ajustar tamanhos/cores conforme necessário
- [ ] Otimizar workflow baseado em uso real

## 📞 Suporte

### **Logs Úteis**

O sistema gera logs detalhados no console:

```javascript
// Versão ativa
"📱 Renderizando versão MOBILE otimizada para TC22"
"💻 Renderizando versão DESKTOP completa"

// Detecção
"📱 Coletor TC22/Mobile detectado: { ... }"

// Mudanças
"🔄 Mudança de dispositivo detectada: Desktop → Mobile"

// Stats
"✅ Sistema offline queue inicializado"
```

### **Informações para Suporte**

Ao reportar um problema, forneça:

1. **Dispositivo**: Modelo exato (ex: Zebra TC22)
2. **Resolução**: `window.innerWidth x window.innerHeight`
3. **User Agent**: `navigator.userAgent`
4. **Versão ativa**: Resultado de `window.checkStockEntryVersion()`
5. **Screenshot**: Se aplicável
6. **Passos para reproduzir**: Detalhados
7. **Console logs**: Erros ou avisos

---

**Versão**: 1.0.0  
**Data**: 17/03/2026  
**Autor**: Sistema Conecta Cup  
**Status**: ✅ Produção
