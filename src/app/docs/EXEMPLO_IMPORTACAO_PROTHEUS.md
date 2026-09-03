# 📊 Exemplo de Importação de Dados Protheus via Excel

## Formato do Arquivo

O arquivo Excel deve conter cabeçalhos que identificam cada seção. As seções podem estar na mesma planilha ou em planilhas separadas.

---

## 🏢 Seção: SETOR

### Colunas Obrigatórias:
- **Setor**: Código único do setor (ex: "ADM", "LOG", "MKT")
- **Descrição**: Nome completo do setor

### Colunas Opcionais:
- **Responsável**: Nome do responsável pelo setor

### Exemplo:

| Setor | Descrição         | Responsável      |
|-------|-------------------|------------------|
| ADM   | ADMINISTRATIVO    | CARLOS           |
| LOG   | LOGISTICA         | GESSE ALVES      |
| MKT   | MARKETING         | CARLOS           |
| ALM   | ALMOXARIFADO      | RAFAEL BORGES    |

---

## 📊 Seção: PROJETO

### Colunas Obrigatórias:
- **Projeto**: Código único do projeto (ex: "25ET1", "25CHAL1")
- **Descrição**: Nome completo do projeto

### Colunas Opcionais:
- **Temporada**: Ano da temporada (ex: 2025)

### Exemplo:

| Projeto  | Descrição         | Temporada |
|----------|-------------------|-----------|
| 25ET1    | Etapa 1           | 2025      |
| 25ET2    | Etapa 2           | 2025      |
| 25CHAL1  | Challenge Etapa 1 | 2025      |
| 25TROPHY1| Trophy Etapa 1    | 2025      |

---

## 💰 Seção: CONTA CONTÁBIL

### Colunas Obrigatórias:
- **Conta Contábil**: Código da conta (ex: "311010001")
- **Descrição**: Descrição da conta

### Exemplo:

| Conta Contábil | Descrição                      |
|----------------|--------------------------------|
| 311010001      | RECEITA REVENDA DE MERCADORIAS |
| 321010001      | CUSTO DAS MERCADORIAS VENDIDAS |
| 322010001      | SALARIOS                       |
| 383010002      | IPTU                           |

---

## 📋 Layouts Aceitos

### Layout 1: Todas as seções em uma planilha

```
Setor | Descrição         | Responsável
ADM   | ADMINISTRATIVO    | CARLOS
LOG   | LOGISTICA         | GESSE ALVES

Projeto  | Descrição         | Temporada
25ET1    | Etapa 1           | 2025
25ET2    | Etapa 2           | 2025

Conta Contábil | Descrição
311010001      | RECEITA REVENDA DE MERCADORIAS
321010001      | CUSTO DAS MERCADORIAS VENDIDAS
```

### Layout 2: Cada seção em uma planilha diferente

**Planilha "Setores":**
| Setor | Descrição         | Responsável      |
|-------|-------------------|------------------|
| ADM   | ADMINISTRATIVO    | CARLOS           |

**Planilha "Projetos":**
| Projeto  | Descrição         | Temporada |
|----------|-------------------|-----------|
| 25ET1    | Etapa 1           | 2025      |

**Planilha "Contas":**
| Conta Contábil | Descrição                      |
|----------------|--------------------------------|
| 311010001      | RECEITA REVENDA DE MERCADORIAS |

---

## ⚙️ Comportamento da Importação

### ✅ Criação de Novos Registros
Se o código (Setor, Projeto ou Conta Contábil) não existir no banco de dados, um novo registro será criado com os dados da planilha.

### 🔄 Atualização de Registros Existentes
Se o código já existir no banco de dados, os campos serão atualizados com os valores da planilha.

### 📌 Preservação de Dados Não Presentes
Registros que estão no banco de dados mas **não estão na planilha** serão **mantidos sem alteração**.

---

## 🎯 Dicas Importantes

1. **Códigos Únicos**: Os campos "Setor", "Projeto" e "Conta Contábil" são identificadores únicos. Não use códigos duplicados na mesma seção.

2. **Nomes de Colunas Flexíveis**: O sistema aceita pequenas variações nos nomes das colunas:
   - "Descrição" ou "Descricao"
   - "Responsável" ou "Responsavel"
   - "Conta Contábil" ou "Conta Contabil"

3. **Campos Opcionais**: Colunas marcadas como opcionais podem ser omitidas ou deixadas em branco.

4. **Encoding**: Use UTF-8 para evitar problemas com acentos.

5. **Formato**: Arquivo deve ser .xlsx ou .xls

---

## 🔐 Funcionalidade de Limpeza (Apenas Administradores)

Administradores têm acesso ao botão **"Limpar Banco"** que deleta **todos os registros** das três tabelas (Setor, Projeto, Conta Contábil).

⚠️ **ATENÇÃO**: Esta ação é permanente e não pode ser desfeita!

---

## 📝 Exemplo Completo

Baixe um exemplo de planilha pronta para importação:
👉 [exemplo_protheus.xlsx](./exemplo_protheus.xlsx)

Ou copie e cole os dados de exemplo acima em um novo arquivo Excel.

---

## 🆘 Troubleshooting

### Erro: "Seção não encontrada"
- Verifique se os cabeçalhos estão escritos corretamente
- Certifique-se de que não há linhas vazias antes dos cabeçalhos

### Erro: "Código duplicado"
- Há dois registros com o mesmo código na planilha
- Revise e mantenha apenas um registro por código

### Erro: "Arquivo inválido"
- Verifique se o arquivo é .xlsx ou .xls
- Tente salvar novamente usando "Salvar Como" no Excel

### Importação parcial (alguns erros)
- Verifique a lista de erros detalhada no card de resultado
- Corrija os registros com problema e importe novamente

---

## 📞 Suporte

Para dúvidas ou problemas, entre em contato com o administrador do sistema.
