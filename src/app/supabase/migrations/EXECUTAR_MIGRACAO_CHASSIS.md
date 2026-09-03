# 🚀 Guia Rápido: Migração de Chassis

## ⚡ Execução Rápida (5 minutos)

### Passo 1: Criar Tabela Chassis
1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Clique em **New Query**
4. Cole o conteúdo de `CREATE_CHASSIS_TABLE.sql`
5. Clique em **Run** (ou pressione `Ctrl+Enter`)

**Resultado esperado:**
```
✅ 59 rows affected
```

### Passo 2: Migrar Dados
1. No SQL Editor, crie uma **New Query**
2. Cole o conteúdo de `MIGRATE_CHASSIS_FROM_MASTER_DATA.sql`
3. Clique em **Run**

**Resultado esperado:**
```
NOTICE: ✅ MIGRAÇÃO CONCLUÍDA
NOTICE: 📊 Resultado:
NOTICE:    - Chassis na nova tabela: 59
NOTICE:    - Chassis restantes em master_data: 0
NOTICE:    - Gerações restantes em master_data: 0
NOTICE: ✅ Todos os dados foram migrados com sucesso!
```

### Passo 3: Verificar no Frontend
1. Acesse a aplicação
2. Navegue para: **Cadastro → Master Data → Carros**
3. Você deve ver a nova interface com grid de chassis

## ✅ Checklist de Validação

- [ ] SQL 1 executado sem erros
- [ ] SQL 2 executado com sucesso
- [ ] 59 chassis aparecendo na interface
- [ ] Possível criar novo chassis
- [ ] Possível editar chassis existente
- [ ] Possível deletar chassis (marca como inativo)

## 🎯 O que mudou?

### Antes
- Chassis em `master_data` (tabela genérica)
- Apenas código do chassis (#1, #99, etc)
- Sem ordenação customizada
- Sem suporte a gerações

### Depois
- Chassis em tabela `chassis` (dedicada)
- Código + geração + status ativo + ordenação
- Interface visual moderna
- CRUD completo

## 📸 Preview da Nova Interface

```
┌─────────────────────────────────────────┐
│  🏎️ Chassis          59 chassis cadastrados │
│                        [+ Adicionar Chassis] │
├─────────────────────────────────────────┤
│  [#1]  [#2]  [#3]  [#4]  [#5]  [#7]     │
│  [#8]  [#10] [#11] [#12] [#17] [#18]    │
│  [#19] [#21] [#22] [#23] [#25] [#27]    │
│  ...                                     │
└─────────────────────────────────────────┘
```

Cada card mostra:
- **Código** do chassis (grande)
- **Geração** (badge opcional)
- **Botões** de editar/remover (ao hover)

## 🔄 Rollback (se necessário)

Se algo der errado, você pode reverter:

```sql
-- 1. Restaurar dados em master_data
INSERT INTO master_data (id, type, name, created_at)
SELECT 
  gen_random_uuid(),
  'carro',
  codigo,
  created_at
FROM chassis
WHERE ativo = true;

-- 2. Deletar tabela chassis
DROP TABLE IF EXISTS chassis CASCADE;
```

⚠️ **ATENÇÃO**: Faça backup antes de executar rollback!

## 💡 Dicas

1. **Faça backup** do banco antes de migrar (opcional mas recomendado)
2. **Teste primeiro** em ambiente de desenvolvimento
3. **Execute em horário de baixo uso** para evitar conflitos
4. **Monitore os logs** durante a migração

## 🆘 Problemas Comuns

### "relation chassis does not exist"
👉 Execute primeiro `CREATE_CHASSIS_TABLE.sql`

### "duplicate key value violates unique constraint"
👉 Tabela já foi criada. Pule para o passo 2.

### "permission denied"
👉 Verifique se está usando credenciais de admin no Supabase

### Chassis não aparecem na interface
👉 Limpe o cache do navegador e recarregue a página

## 📞 Precisa de Ajuda?

1. Verifique o arquivo `README_CHASSIS_MIGRATION.md` para detalhes completos
2. Consulte os logs do console (F12 no navegador)
3. Verifique os logs do Supabase SQL Editor

---

**Tempo estimado**: 5 minutos  
**Dificuldade**: ⭐⭐☆☆☆ (Fácil)  
**Risco**: ⭐☆☆☆☆ (Muito baixo)  
**Reversível**: ✅ Sim  
