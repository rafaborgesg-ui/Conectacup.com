# 🔧 Correção: Constraints da Tabela business_rules

## ❌ Problema Identificado

A tabela `business_rules` no Supabase possui **CHECK CONSTRAINTS fixos** que limitam os valores aceitos:

```sql
categoria TEXT NOT NULL CHECK (categoria IN ('Carrera', 'Challenge', 'Trophy')),
campeonato TEXT NOT NULL CHECK (campeonato IN ('Sprint', 'Endurance')),
```

Isso impede que novos valores sejam adicionados, como:
- **Campeonatos:** `Endurance 300km`, `Endurance 500km`
- **Categorias:** Qualquer nova categoria cadastrada

## ✅ Solução

Execute a migration `FIX_BUSINESS_RULES_CONSTRAINTS.sql` no Supabase SQL Editor para:

1. **Remover** os CHECK CONSTRAINTS fixos
2. **Adicionar** constraints básicas que apenas validam valores não vazios
3. **Permitir** valores dinâmicos baseados no que está cadastrado em `master_data`

## 📋 Passo a Passo

### 1. Acessar o Supabase SQL Editor

```
https://supabase.com/dashboard/project/nflgqugaabtxzifyhjor/sql
```

### 2. Executar a Migration

Copie e cole o conteúdo do arquivo:
```
/docs/migrations/sql/FIX_BUSINESS_RULES_CONSTRAINTS.sql
```

### 3. Executar o SQL

Clique em **"Run"** para executar a migration.

### 4. Limpar Regras Antigas (IMPORTANTE!)

As regras antigas no banco ainda usam os valores antigos. Execute também:
```
/docs/migrations/sql/CLEAN_OLD_BUSINESS_RULES.sql
```

Isso irá **deletar todas as regras antigas** do banco. Não se preocupe, elas serão regeneradas automaticamente!

### 5. Regenerar as Regras na Interface

1. Recarregue a página da aplicação (F5)
2. Vá para **Master Data > Regras**
3. Clique no botão **"Regenerar Regras"**
4. ✅ As regras serão criadas para TODOS os campeonatos cadastrados!

### 6. Verificar o Resultado

Você deve ver:
- ✅ Constraints antigas removidas
- ✅ Novas constraints básicas criadas
- ✅ Comentários atualizados
- ✅ Regras geradas para todos os campeonatos (incluindo Endurance 300km e 500km)

## 🎯 Comportamento Após a Correção

### ✅ ACEITA (Valores Dinâmicos)

- Qualquer categoria cadastrada em `master_data` (tipo: 'categoria')
- Qualquer campeonato cadastrado em `master_data` (tipo: 'campeonato')
- Exemplos:
  - `Sprint`, `Endurance`, `Endurance 300km`, `Endurance 500km`
  - `Carrera`, `Challenge`, `Trophy`, `Nova Categoria`

### ❌ REJEITA

- Valores vazios ou nulos
- Strings com apenas espaços em branco
- Duplicatas (constraint UNIQUE mantida)

## 🔄 Sistema de Sincronização

Após a correção, o sistema funciona assim:

1. **Usuário cadastra** nova categoria ou campeonato em Master Data
2. **Sistema sincroniza** automaticamente as regras (via `useEffect`)
3. **Novas regras** são geradas com valores padrão
4. **Usuário edita** as quantidades conforme necessário
5. **Sistema salva** sem problemas de constraint

## 🧪 Testar Após a Migration

1. Vá para **Master Data > Campeonatos**
2. Verifique se `Endurance 300km` e `Endurance 500km` estão cadastrados
3. Vá para **Master Data > Regras**
4. Verifique se as regras foram geradas para os novos campeonatos
5. Tente **editar** uma quantidade
6. Clique em **Salvar Regras**
7. ✅ Deve salvar sem erro de constraint!

## 💡 Observações Importantes

- As constraints **rule_type** e **quantidade** permanecem inalteradas
- A constraint **UNIQUE** (rule_type, categoria, campeonato) permanece ativa
- O **Row Level Security (RLS)** permanece inalterado
- As **policies** de acesso permanecem ativas

## 📊 Estrutura Final das Constraints

```sql
-- Constraints MANTIDAS:
✅ rule_type CHECK (rule_type IN ('curinga', 'slick', 'wet'))
✅ quantidade CHECK (quantidade >= 0)
✅ UNIQUE (rule_type, categoria, campeonato)

-- Constraints REMOVIDAS:
❌ categoria CHECK (categoria IN (...))
❌ campeonato CHECK (campeonato IN (...))

-- Constraints ADICIONADAS:
✅ categoria CHECK (LENGTH(TRIM(categoria)) > 0)
✅ campeonato CHECK (LENGTH(TRIM(campeonato)) > 0)
```

## 🎉 Resultado Final

Agora o sistema aceita **valores dinâmicos** para categorias e campeonatos, permitindo total flexibilidade na configuração das regras de negócio!

---

**Criado em:** 2024
**Última atualização:** 2024
