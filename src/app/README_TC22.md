# 📱 Entrada de Estoque - Versão Mobile TC22

## 🎯 Resumo

A página **Entrada de Estoque** agora possui **detecção automática de dispositivo** e renderiza:

- **💻 Desktop/Tablet** → Versão Web original (intacta)
- **📱 Coletor TC22** → Versão Mobile otimizada (800x480px)

## ✨ Recursos Mobile

✅ **TODOS os recursos da versão web:**
- Entrada Individual (scanner + manual)
- Entrada em Lote (múltiplos códigos)
- Entrada via Planilha (Modelo + Código)
- Sistema offline completo
- Validações e feedback

✅ **Otimizações TC22:**
- Layout vertical responsivo
- Botões grandes (touch-friendly)
- Feedback haptic
- Stats sempre visíveis
- Teclado numérico
- Scanner integrado

## 🔍 Detecção Automática

O sistema detecta TC22 por:
1. Resolução 800x480 (ou 480x800)
2. User Agent (zebra, tc22, tc2)
3. Android com tela ≤ 800px

**Zero configuração necessária!** 🎉

## 🛠️ Para Testar no Desktop

```javascript
// No console do navegador:
window.toggleStockEntryMobileMode()
// Força modo mobile e recarrega

// Verificar qual versão está ativa:
window.checkStockEntryVersion()
```

## 📁 Arquivos

```
/components/
├── TireStockEntry.tsx          (Web - original INTACTO)
├── TireStockEntryMobile.tsx    (Mobile TC22 - NOVO)
└── TireStockEntryWrapper.tsx   (Detecção - NOVO)

/routes.ts                       (Atualizado para usar Wrapper)

/docs/
├── ENTRADA_ESTOQUE_MOBILE.md   (Documentação completa)
└── README_TC22.md              (Este arquivo)
```

## 🚀 Como Usar

### **No Coletor TC22:**
1. Acesse `/pneus/entrada`
2. Sistema detecta automaticamente
3. Versão mobile é renderizada
4. Use normalmente!

### **No Desktop/Web:**
1. Acesse `/pneus/entrada`
2. Versão web original é renderizada
3. Tudo funciona como antes!

## 📊 Comparação Rápida

| Recurso | Web | Mobile |
|---------|-----|--------|
| Entrada Individual | ✅ | ✅ |
| Entrada Lote | ✅ | ✅ |
| Entrada Planilha | ✅ | ✅ |
| Scanner | ✅ | ✅ |
| Offline | ✅ | ✅ |
| Layout | Horizontal | Vertical |
| Sidebar | Sim | Não |
| Haptic | Não | Sim |

## 🎨 Interface Mobile

```
┌─────────────────────────────────┐
│ 🔴 Entrada de Estoque    📶 │  Header
├─────────────────────────────────┤
│ ✓ 42 Registrados | 📊 42 total │  Stats
├─────────────────────────────────┤
│ [Individual] [Lote] [Planilha]  │  Tabs
├─────────────────────────────────┤
│                                 │
│  📦 Modelo: [Slick 2024    ▼]  │
│  📍 Contêiner: [A01        ▼]  │
│                                 │
│  🔢 Código: [________] 📷      │  Scroll
│  [Registrar Pneu]              │  Area
│                                 │
│  📋 Registros (42)             │
│  • #42 1234567 - 14:32        │
│  • #41 2345678 - 14:31        │
│  ...                           │
└─────────────────────────────────┘
```

## 📱 Specs TC22

- **Resolução**: 800x480 pixels
- **Orientação**: Landscape
- **Touch**: Multi-touch capacitivo
- **Scanner**: Integrado 1D/2D
- **SO**: Android

## 🐛 Troubleshooting Rápido

### Mobile não carrega no TC22?
```javascript
window.checkStockEntryVersion()
// Verifica detecção e mostra info
```

### Scanner não funciona?
1. Verificar permissão de câmera
2. Usar HTTPS (obrigatório)
3. Testar em Chrome nativo

### Forçar modo mobile?
```javascript
window.toggleStockEntryMobileMode()
```

## 📖 Documentação Completa

Ver: [`/docs/ENTRADA_ESTOQUE_MOBILE.md`](./docs/ENTRADA_ESTOQUE_MOBILE.md)

## ✅ Status

- **Versão Web**: ✅ Intacta (100%)
- **Versão Mobile**: ✅ Completa (100%)
- **Detecção**: ✅ Automática (100%)
- **Testes**: ✅ Prontos
- **Documentação**: ✅ Completa

---

**Pronto para uso em produção!** 🚀
