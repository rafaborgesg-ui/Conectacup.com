# Migração de Chassis para Tabela Dedicada

## 📋 Resumo

Esta migração move os dados de **chassis** da tabela genérica `master_data` para uma nova tabela específica `chassis`, seguindo o mesmo padrão já implementado para `setor`, `projeto` e `conta_contabil`.

## 🎯 Objetivo

- **Melhor organização**: Dados de chassis em tabela dedicada
- **Mais flexibilidade**: Suporta campos adicionais (geração, ordem, status ativo)
- **Melhor performance**: Queries otimizadas e índices específicos
- **Facilita integrações**: API REST dedicada para chassis

## 🗂️ Estrutura da Nova Tabela

```sql
CREATE TABLE chassis (
  id UUID PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,  -- Ex: '#1', '#99', '#777'
  geracao TEXT,                  -- Ex: '991/I', '991/II', '992'
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER,                 -- Para ordenação customizada
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

## 📦 Dados Migrados

- **59 chassis** cadastrados (de #1 até #888)
- Dados de geração associados (quando disponíveis)
- Ordenação baseada no número do chassis

## 🚀 Como Executar

### 1. Criar a tabela

```bash
# Execute no SQL Editor do Supabase
supabase/migrations/CREATE_CHASSIS_TABLE.sql
```

### 2. Migrar dados

```bash
# Execute no SQL Editor do Supabase
supabase/migrations/MIGRATE_CHASSIS_FROM_MASTER_DATA.sql
```

## ✅ Verificação

Após executar as migrações, verifique:

```sql
-- Verificar total de chassis
SELECT COUNT(*) FROM chassis;
-- Deve retornar: 59

-- Verificar que master_data não tem mais chassis
SELECT COUNT(*) FROM master_data WHERE type IN ('carro', 'geracao');
-- Deve retornar: 0

-- Listar alguns chassis
SELECT codigo, geracao, ativo, ordem 
FROM chassis 
ORDER BY ordem 
LIMIT 10;
```

## 🔧 Arquivos Modificados

### Backend (Supabase)
- ✅ `/supabase/migrations/CREATE_CHASSIS_TABLE.sql` - Criação da tabela
- ✅ `/supabase/migrations/MIGRATE_CHASSIS_FROM_MASTER_DATA.sql` - Migração de dados

### Frontend (React)
- ✅ `/utils/chassisStorage.ts` - Funções CRUD para chassis
- ✅ `/components/ChassisManager.tsx` - Componente de gestão
- ✅ `/components/MasterData.tsx` - Removida gestão antiga, integrado novo componente

## 🎨 Interface

A nova interface de gestão de chassis oferece:

- ✨ **Grid visual** com cards de chassis
- ✏️ **Edição inline** de código e geração
- ➕ **Criação rápida** de novos chassis
- 🗑️ **Soft delete** (marca como inativo)
- 🔍 **Busca e filtros** (preparado para futuras melhorias)

## 📊 Comparação: Antes vs Depois

### Antes
```typescript
// Master Data genérico
master_data: {
  type: 'carro',
  name: '#99'
}
```

### Depois
```typescript
// Tabela dedicada
chassis: {
  id: 'uuid',
  codigo: '#99',
  geracao: '992',
  ativo: true,
  ordem: 99
}
```

## 🔐 Segurança (RLS)

- ✅ **Leitura**: Todos os usuários autenticados
- ✅ **Criação**: Apenas admins
- ✅ **Atualização**: Apenas admins
- ✅ **Exclusão**: Apenas admins (soft delete)

## 🎯 Próximos Passos

Considere migrar outras seções compostas de `master_data`:

1. ✅ `setor` (já migrado)
2. ✅ `projeto` (já migrado)
3. ✅ `conta_contabil` (já migrado)
4. ✅ `chassis` (ATUAL)
5. ⏳ `pista` (já tem tabela dedicada)
6. ⏳ Outras seções conforme necessário

## 📝 Notas

- Os chassis são ordenados automaticamente pelo campo `ordem`
- Chassis inativos não aparecem na listagem principal
- Hard delete só deve ser usado em casos extremos
- A geração é opcional e pode ser atribuída posteriormente

## 🆘 Troubleshooting

### Erro: "carrosSubTypes is not defined"

**Causa**: Código antigo de referência aos subtipos
**Solução**: Verifique se o arquivo MasterData.tsx foi atualizado corretamente

### Chassis não aparecem na interface

**Causa**: Migração não executada ou falhou
**Solução**: 
```sql
-- Verificar se a tabela existe
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'chassis'
);

-- Se retornar false, execute CREATE_CHASSIS_TABLE.sql
```

### Permissão negada ao criar chassis

**Causa**: Usuário não é admin
**Solução**: Verificar role do usuário:
```sql
SELECT raw_user_meta_data->>'role' as role 
FROM auth.users 
WHERE email = 'seu-email@exemplo.com';
```

## 📞 Suporte

Em caso de dúvidas ou problemas:
1. Verificar logs do console do navegador
2. Verificar logs do Supabase (SQL Editor)
3. Consultar a documentação das outras migrações (setor, projeto, conta_contabil)
