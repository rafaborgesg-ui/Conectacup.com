# Integração RFID com Campo CAI - Guia Completo

**Data:** 18/05/2026  
**Status:** ✅ Implementado

---

## 📋 Resumo das Alterações

Foi adicionado o campo **CAI (Código de Identificação RFID)** ao cadastro de modelos de pneus, permitindo que a leitura RFID identifique automaticamente o modelo correto.

---

## 🔧 Alterações Técnicas

### 1. Interface TireModel (`src/app/utils/storage.ts`)
```typescript
export interface TireModel {
  id: string;
  name: string;
  code: string;
  type: string;
  protheus_code?: string;
  cai?: string; // ✅ NOVO CAMPO
  price_by_year?: Record<string, number>;
  sale_price_by_year?: Record<string, number>;
}
```

### 2. Página Cadastro de Modelos (`src/app/components/TireModelRegistration.tsx`)
- ✅ Adicionado input "Código CAI (RFID)" no formulário
- ✅ Campo aceita até 6 dígitos numéricos
- ✅ Badge roxo 📡 CAI exibido na listagem de modelos
- ✅ Campo incluído em save/update/edit

### 3. Entrada de Estoque (`src/app/components/TireStockEntry.tsx`)
- ✅ Removida tabela hardcoded `CAI_TO_MODEL_MAP`
- ✅ Busca agora feita pelo CAI cadastrado no banco: `tireModels.find(m => m.cai === rfidData.cai)`
- ✅ Mensagens de erro melhoradas para indicar quando CAI não está cadastrado

---

## 📊 Tabela de Códigos CAI

| Modelo Pneu | Código Pneu | CAI |
|-------------|-------------|-----|
| Slick 991 Dianteiro | 27/65-18 N2 | **907466** |
| Slick 991 Traseiro | 31/71-18 N2 | **297596** |
| Slick 992 Dianteiro | 30/65-18 N3 | **530030** |
| Slick 992 Traseiro | 31/71-18 N3R | **242655** |
| Wet 991 Dianteiro | 27/65-18 P2L | **463077** |
| Wet 992 Dianteiro | 30/65-18 P2L | **619653** |
| Wet 991 e 992 Traseiro | 31/71-18 P2L | **797297** |

---

## 🚀 Como Usar

### Passo 1: Executar Migration no Supabase
1. Abra o arquivo **`ADD_CAI_COLUMN.sql`**
2. Acesse [Supabase Dashboard](https://supabase.com/dashboard)
3. Vá em **SQL Editor**
4. Cole o código SQL completo
5. Clique em **RUN**

✅ Isso irá:
- Adicionar a coluna `cai` na tabela `tire_models`
- Criar índice para busca rápida
- Popular os 7 modelos existentes com seus respectivos códigos CAI

### Passo 2: Verificar Cadastros
1. Acesse a página **"Cadastro de Modelos"** no sistema
2. Verifique se os modelos existentes já têm o badge **📡 CAI** exibido
3. Se necessário, edite cada modelo e adicione o código CAI manualmente

### Passo 3: Testar Leitura RFID
1. Acesse **"Entrada de Estoque"**
2. Selecione um **Container**
3. Escaneie um código RFID (ex: `301854AAE059B8000149614B`)
4. O sistema deve:
   - Detectar automaticamente que é RFID (24 caracteres hex)
   - Decodificar o CAI (ex: 530030)
   - Selecionar automaticamente o modelo **30/65-18 N3**
   - Pedir apenas a confirmação e continuar o registro

---

## 🔍 Fluxo de Leitura RFID

```
Código RFID Escaneado
    ↓
301854AAE059B8000149614B (24 chars hex)
    ↓
Detectado como RFID ✅
    ↓
Decodificação SGTIN-96
    ↓
Extrai Serial Number: 21586251
Extrai Item Reference: 8480480
    ↓
CAI = ItemReference / 16 = 530030
Código Barras = Serial / 4 = 05396562
    ↓
Busca modelo com CAI=530030
    ↓
Modelo encontrado: 30/65-18 N3 ✅
    ↓
Seleção automática do modelo
    ↓
Usuário seleciona container
    ↓
Pneu registrado com:
  - Modelo: 30/65-18 N3
  - Código: 05396562
  - Container: (selecionado)
```

---

## 📝 Logs de Debug

Ao escanear um RFID, o console (F12) mostrará:

```
🎯 registerEntry chamado com: "301854AAE059B8000149614B" (24 caracteres)
🔍 isRFIDCode("301854AAE059B8000149614B") = true (24 chars)
📡 ========================================
📡 CÓDIGO RFID DETECTADO!
📡 Código: 301854AAE059B8000149614B
📡 Iniciando decodificação...
📊 RFID Decodificado: Filter=3, Partition=0, Company=1566, ItemRef=8480480, Serial=21586251
🔑 Código CAI extraído: 530030 (ItemReference original: 8480480)
✅ RFID decodificado com sucesso!
📊 CAI: 530030
📊 Item Reference: 8480480
🔍 Buscando modelo com CAI: "530030"
📋 Modelos disponíveis no sistema: ["27/65-18 N2" (CAI: 907466), "30/65-18 N3" (CAI: 530030), ...]
🔍 Modelo encontrado: "30/65-18 N3" (CAI: 530030)
```

---

## ⚠️ Troubleshooting

### Erro: "Nenhum modelo com CAI XXX está cadastrado"
**Solução:** 
1. Vá em "Cadastro de Modelos"
2. Encontre o modelo correspondente
3. Edite e adicione o código CAI correto
4. Salve

### Erro: "Código inválido - 24 caracteres esperados"
**Causa:** O coletor RFID pode estar configurado para enviar formato diferente  
**Solução:** Verifique se o coletor está configurado para EPC Hex (24 caracteres)

### RFID não está sendo reconhecido
**Diagnóstico:**
1. Abra o console do navegador (F12)
2. Digite o código manualmente no campo
3. Verifique os logs para identificar onde o processamento falha

---

## 📦 Arquivos Modificados

```
✅ /src/app/utils/storage.ts
✅ /src/app/components/TireModelRegistration.tsx
✅ /src/app/components/TireStockEntry.tsx
✅ /ADD_CAI_COLUMN.sql (NOVO)
✅ /INTEGRACAO_RFID_CAI.md (NOVO - este arquivo)
```

---

## 🎯 Benefícios

1. **Flexibilidade:** Novos modelos podem ser adicionados sem alterar código
2. **Manutenibilidade:** CAI gerenciado via interface administrativa
3. **Rastreabilidade:** Cada modelo tem seu CAI claramente identificado
4. **Escalabilidade:** Fácil adicionar novos códigos RFID
5. **Auditoria:** Logs detalhados de cada leitura RFID

---

**Desenvolvido em:** 18/05/2026  
**Versão:** 1.0.0  
**Status:** Pronto para uso em produção ✅
