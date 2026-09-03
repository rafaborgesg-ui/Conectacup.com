# 📊 Relatório Protheus - Exportação Excel

## Visão Geral

O **Relatório Protheus** é um formato de exportação especializado criado para integração com o sistema Protheus. Este relatório gera um arquivo Excel (.xlsx) com dados formatados especificamente para importação e reconciliação com o ERP.

**Filtros Automáticos:**
- ✅ Status: Apenas pneus com status **"Piloto"**
- ✅ Temporada: Selecionada no modal
- ✅ Etapa: Selecionada no modal

## Como Acessar

1. Navegue até **Relatórios & Histórico**
2. Clique no botão **"Exportar"**
3. Selecione **"Protheus"** no menu dropdown
4. **Modal será exibido:**
   - Selecione a **Temporada** desejada
   - Selecione a **Etapa** desejada
   - Clique em **"Exportar Excel"**
5. O arquivo será baixado automaticamente

## Estrutura do Arquivo

O arquivo gerado contém **apenas 1 aba** com **9 colunas**:

| Coluna | Nome | Descrição | Origem dos Dados |
|--------|------|-----------|------------------|
| **A** | Código Protheus | Código do produto no ERP | `tire_models.protheus_code` |
| **B** | Código de Barras | Identificador único do pneu | `stock_entries.barcode` |
| **C** | Modelo | Nome do modelo do pneu | `tire_models.name` |
| **D** | Status | Status atual (sempre "Piloto") | `stock_entries.status` |
| **E** | Piloto | Nome do piloto | `stock_entries.pilot` |
| **F** | Temporada | Ano da temporada | `stock_entries.ano` |
| **G** | Etapa | Número da etapa | `stock_entries.etapa` |
| **H** | Preço Compra (€) | Valor de compra em euros | `tire_models.price_by_year` |
| **I** | Preço Venda (R$) | Valor de venda em reais | `tire_models.sale_price_by_year` |

### 📋 Regras de Preenchimento

#### Colunas A, H e I (Busca Automática)

Estas 3 colunas **não existem** na tabela `stock_entries` do Supabase. Os valores são preenchidos automaticamente durante a exportação:

1. **Sistema busca o modelo** do pneu na tabela `tire_models`
2. **Extrai o Código Protheus** (`protheus_code`)
3. **Extrai os preços** do ano mais recente cadastrado:
   - `price_by_year` → Preço de Compra (€)
   - `sale_price_by_year` → Preço de Venda (R$)

#### Se o modelo não tiver dados:
- **Código Protheus:** Campo vazio
- **Preços:** `0` (zero)

### 🎯 Nome do Arquivo

Formato: `Relatorio_Protheus_T{temporada}_E{etapa}_{data}.xlsx`

**Exemplos:**
- `Relatorio_Protheus_T2025_E3_2025-02-05.xlsx`
- `Relatorio_Protheus_T2024_E12_2025-02-05.xlsx`

## Exemplo de Dados Exportados

```
| A          | B            | C          | D      | E       | F    | G | H     | I      |
|------------|--------------|------------|--------|---------|------|---|-------|--------|
| PR-2024-01 | PN000123456  | Pirelli P1 | Piloto | João    | 2025 | 3 | 1200  | 6500   |
| PR-2024-01 | PN000123457  | Pirelli P1 | Piloto | Maria   | 2025 | 3 | 1200  | 6500   |
|            | PN000123458  | Michelin M | Piloto | Pedro   | 2025 | 3 | 0     | 0      |
```

**Observações do exemplo:**
- ✅ Linhas 1-2: Modelo com código Protheus e preços cadastrados
- ⚠️ Linha 3: Modelo sem código Protheus (coluna A vazia) e sem preços (0)

## Fluxo de Trabalho Recomendado

### 1️⃣ Preparação (Antes da Exportação)

**Configure os Modelos de Pneus:**

1. Acesse **Cadastro de Modelos de Pneus**
2. Para cada modelo usado pelos pilotos:
   - ✅ Preencha o campo **"Código do Protheus"**
   - ✅ Adicione **Preço de Compra (€)** para o ano atual
   - ✅ Adicione **Preço de Venda (R$)** para o ano atual
   - ✅ Salve o modelo

**Verifique o Status dos Pneus:**

1. Acesse **Relatórios & Histórico**
2. Filtre por: Status = **Piloto**
3. Confirme que todos os pneus estão com:
   - ✅ Piloto preenchido
   - ✅ Temporada correta
   - ✅ Etapa correta

### 2️⃣ Exportação

1. No módulo **Relatórios & Histórico**
2. Clique em **Exportar → Protheus**
3. No modal que abrir:
   - Selecione a **Temporada** (ex: 2025)
   - Selecione a **Etapa** (ex: 3)
   - Clique em **"Exportar Excel"**
4. Aguarde a mensagem de sucesso
5. Verifique o arquivo baixado

### 3️⃣ Validação (Antes de Importar no Protheus)

Abra o arquivo no Excel e verifique:

| Item | Verificação | Ação se Falhar |
|------|-------------|----------------|
| **Coluna A** | Todos têm código Protheus? | Cadastre códigos faltantes nos modelos |
| **Coluna H** | Preços de compra corretos? | Atualize preços nos modelos |
| **Coluna I** | Preços de venda corretos? | Atualize preços nos modelos |
| **Linhas** | Contagem bate com esperado? | Verifique filtros de status/temporada |

### 4️⃣ Importação no Protheus

1. Acesse o módulo de **Importação** no Protheus
2. Selecione o arquivo Excel gerado
3. Mapeie as colunas:
   - Coluna A → Campo de Produto
   - Coluna B → Código de Barras
   - Coluna H → Custo Unitário
   - Coluna I → Preço de Venda
4. Execute a importação
5. Verifique os registros importados

## Mensagens do Sistema

### ✅ Sucesso

```
✓ Relatório Protheus exportado!
{X} pneus exportados (Temporada 2025, Etapa 3)
```

### ❌ Erro: Nenhum Pneu Encontrado

```
✗ Erro ao exportar
Nenhum pneu encontrado com status "Piloto" 
para a temporada e etapa selecionadas
```

**Solução:**
- Verifique se existem pneus com status "Piloto"
- Confirme que a temporada/etapa estão corretas
- Tente outra combinação de temporada/etapa

### ⚠️ Aviso: Dados Incompletos

Se houver modelos sem código Protheus ou preços:

```
✓ Relatório Protheus exportado!
{X} pneus exportados (Temporada 2025, Etapa 3)
```

O arquivo será gerado normalmente, mas alguns campos estarão vazios/zerados.

**Recomendação:**
- Complete o cadastro dos modelos
- Exporte novamente para dados completos

## Perguntas Frequentes (FAQ)

### ❓ Por que alguns códigos Protheus estão vazios?

**R:** O campo "Código do Protheus" não foi preenchido no Cadastro de Modelos de Pneus.

**Solução:** Edite o modelo e adicione o código.

---

### ❓ Por que os preços aparecem como 0?

**R:** O modelo não tem preços cadastrados para nenhum ano, ou os preços foram deletados.

**Solução:** 
1. Acesse **Cadastro de Modelos de Pneus**
2. Edite o modelo
3. Adicione preços na seção "Preços por Ano"

---

### ❓ Como o sistema escolhe qual preço usar?

**R:** O sistema sempre usa o **ano mais recente** cadastrado. Por exemplo:
- Se há preços para 2023, 2024 e 2025
- O sistema usará os preços de **2025**

---

### ❓ E se eu quiser preços de um ano específico?

**R:** Atualmente não é possível escolher o ano. O sistema sempre pega o mais recente. 

**Workaround:** Antes de exportar, edite os modelos e deixe apenas o preço do ano desejado.

---

### ❓ Posso exportar outras etapas simultaneamente?

**R:** Não. Cada exportação gera um arquivo para 1 temporada + 1 etapa específicas.

**Solução:** Faça múltiplas exportações, uma para cada etapa.

---

### ❓ Por que só exporta pneus com status "Piloto"?

**R:** Esta é uma exigência do sistema Protheus. Apenas pneus ativos em uso por pilotos devem ser contabilizados.

Se precisar de todos os pneus, use a exportação **Excel** normal.

---

### ❓ O arquivo tem várias abas?

**R:** Não. O relatório Protheus tem **apenas 1 aba** com as 9 colunas principais.

Para relatórios mais completos com resumos, use a exportação **Excel** normal.

---

## Comparação com Outras Exportações

| Característica | Excel Normal | Relatório Protheus |
|----------------|--------------|-------------------|
| **Filtro de Status** | Personalizável | Apenas "Piloto" |
| **Filtro Temp/Etapa** | Opcional | Obrigatório |
| **Número de Colunas** | 16 colunas | 9 colunas |
| **Código Protheus** | ❌ Não | ✅ Sim |
| **Preços (€ e R$)** | ❌ Não | ✅ Sim |
| **Resumo de Filtros** | ✅ Sim (aba separada) | ❌ Não |
| **Totalizações** | ❌ Não | ❌ Não |
| **Objetivo** | Análise interna | Importação ERP |

## Tecnologia

- **Biblioteca:** `xlsx` (SheetJS)
- **Formato:** Excel 2007+ (.xlsx)
- **Tamanho Médio:** ~20KB para 100 registros
- **Compatibilidade:** Excel, LibreOffice, Google Sheets
- **Encoding:** UTF-8

## Troubleshooting Avançado

### Problema: Exportação trava no modal

**Possíveis causas:**
- Conexão lenta com Supabase
- Muitos registros para processar

**Solução:**
- Aguarde até 30 segundos
- Verifique a conexão com a internet
- Tente novamente

---

### Problema: Arquivo baixa mas não abre

**Possíveis causas:**
- Navegador bloqueou o download
- Arquivo corrompido

**Solução:**
1. Verifique a pasta de Downloads
2. Tente abrir com Excel/LibreOffice
3. Se não funcionar, exporte novamente

---

### Problema: Preços com vírgula ao invés de ponto

**R:** Isso é normal! Depende da configuração regional do Excel.

**Solução:**
- No Excel: Dados → Texto para Colunas
- Selecione separador decimal correto

---

## Suporte

Para problemas técnicos ou dúvidas:

1. Verifique se completou o cadastro de modelos
2. Confirme que há pneus com status "Piloto"
3. Teste com outra temporada/etapa
4. Contate o suporte técnico

---

**Desenvolvido para Conecta Cup** 🏁  
Versão: 2.0 | Data: Fevereiro 2025 | Atualizado com novo formato simplificado
