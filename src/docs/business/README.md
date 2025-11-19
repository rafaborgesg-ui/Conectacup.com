# 💼 Business Rules & Logic

Regras de negócio, lógica ARCS e schemas do sistema.

---

## 📂 Arquivos

```
business/
├── README.md (este arquivo)
├── BUSINESS_RULES_SCHEMA.md
├── ARCS_AUTO_REGISTRATION_LOGIC.md
└── ARCS_DATA_UPDATE_FIELDS.md
```

---

## 📋 Regras de Negócio

### **Schema Completo:**
📄 **[BUSINESS_RULES_SCHEMA.md](./BUSINESS_RULES_SCHEMA.md)**

Define todas as regras de negócio do sistema:
- Estados de pneus (Disponível, Piloto, Descartado, etc.)
- Transições permitidas entre estados
- Regras de validação
- Constraints de negócio
- Fluxos de trabalho

---

## 🔧 Lógica ARCS

### **Auto Registration Logic:**
📄 **[ARCS_AUTO_REGISTRATION_LOGIC.md](./ARCS_AUTO_REGISTRATION_LOGIC.md)**

Sistema ARCS (Auto-Registration on Code Scan):
- Auto-registro ao escanear código (8 dígitos)
- Lógica de detecção de código completo
- Validação em tempo real
- Feedback visual instantâneo
- <2 segundos por registro

### **Data Update Fields:**
📄 **[ARCS_DATA_UPDATE_FIELDS.md](./ARCS_DATA_UPDATE_FIELDS.md)**

Campos atualizáveis no sistema ARCS:
- Campos permitidos para edição
- Validações de dados
- Regras de atualização
- Auditoria de mudanças

---

## 🎯 Regras Principais

### **Estados de Pneus:**

| Estado | Código | Descrição |
|--------|--------|-----------|
| **Disponível** | DISP | Pneu em estoque disponível |
| **Piloto** | PILO | Alocado para piloto |
| **Usado** | USADO | Já utilizado |
| **Descartado - DSI** | DESC_DSI | Descartado por DSI |
| **Descartado - Piloto** | DESC_PILO | Descartado por piloto |

### **Transições Permitidas:**

```
DISPONÍVEL → PILOTO ✅
DISPONÍVEL → DESCARTADO ✅
PILOTO → USADO ✅
PILOTO → DESCARTADO ✅
USADO → DESCARTADO ✅

DESCARTADO → * ❌ (irreversível)
```

---

## 📚 Links Relacionados

- 🗄️ [Migrations](/docs/migrations/)
- 🐛 [Troubleshooting](/docs/troubleshooting/)
- 📖 [Guides](/docs/guides/)

---

**Última atualização:** 2025-01-24  
**Sistema desenvolvido para Porsche Cup Brasil** 🏁
