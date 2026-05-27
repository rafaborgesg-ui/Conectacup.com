# 📋 Instalação do Sistema de Avarias de Rodas

## 🎯 Visão Geral

Este guia explica como configurar a tabela e o storage para o sistema de gerenciamento de avarias de rodas com fotos.

## 🗄️ Passo 1: Criar a Tabela no Supabase

1. Acesse o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Execute o arquivo: `/supabase/migrations/create_wheel_damage_occurrences.sql`

O script irá criar:
- ✅ Tabela `wheel_damage_occurrences`
- ✅ Índices para performance
- ✅ Trigger para `updated_at`
- ✅ Políticas RLS para segurança

## 📁 Passo 2: Criar o Bucket de Storage

### Opção A: Via Dashboard (Recomendado)

1. Acesse **Storage** no Supabase Dashboard
2. Clique em **"New bucket"**
3. Configure:
   - **Name:** `wheel-damage-photos`
   - **Public:** ✅ **SIM** (importante!)
4. Clique em **"Create bucket"**

### Opção B: Via SQL

Execute no SQL Editor:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('wheel-damage-photos', 'wheel-damage-photos', true)
ON CONFLICT (id) DO NOTHING;
```

## 🔐 Passo 3: Configurar Políticas de Storage

1. No Supabase Dashboard, vá em **Storage**
2. Clique no bucket **wheel-damage-photos**
3. Vá em **Policies**
4. Crie as seguintes políticas:

### Política de SELECT (Visualizar)
```sql
CREATE POLICY "Authenticated users can view photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'wheel-damage-photos');
```

### Política de INSERT (Upload)
```sql
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'wheel-damage-photos');
```

### Política de UPDATE (Atualizar)
```sql
CREATE POLICY "Authenticated users can update photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'wheel-damage-photos')
WITH CHECK (bucket_id = 'wheel-damage-photos');
```

### Política de DELETE (Deletar)
```sql
CREATE POLICY "Authenticated users can delete photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'wheel-damage-photos');
```

## ✅ Passo 4: Verificar Instalação

Execute no SQL Editor:

```sql
-- Verifica se a tabela existe
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'wheel_damage_occurrences'
ORDER BY ordinal_position;

-- Verifica se o bucket existe
SELECT * FROM storage.buckets WHERE name = 'wheel-damage-photos';

-- Testa inserção (opcional)
INSERT INTO wheel_damage_occurrences (
  line_code,
  incident_date,
  stage_name,
  session,
  category,
  chassis,
  driver_name,
  driver_number,
  wheel_position,
  damage_type,
  destination
) VALUES (
  'L99999',
  CURRENT_DATE,
  'Teste',
  'treino_livre',
  'Carrera Cup',
  'TEST001',
  'Piloto Teste',
  '99',
  'dianteira_direita',
  'empenada',
  'INDEFINIDO'
);

-- Remove o teste
DELETE FROM wheel_damage_occurrences WHERE line_code = 'L99999';
```

## 🚀 Funcionalidades Implementadas

### ✅ Sistema Completo de Avarias
- Registro de avarias com formulário detalhado
- Upload de múltiplas fotos
- Editor de imagem com ajuste de posição/zoom
- Redimensionamento automático para 800x600
- Marca d'água dinâmica com:
  - Código sequencial único (L73, L74...)
  - Informações da etapa
  - Dados do piloto/chassi
  - Data e sessão
- Storage no Supabase
- Página de listagem com filtros

### 📊 Campos da Tabela

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | ID único da avaria |
| `line_code` | VARCHAR | Código sequencial (L73, L74...) |
| `incident_date` | DATE | Data da ocorrência |
| `stage_id` | UUID | Referência à etapa |
| `stage_name` | TEXT | Nome da etapa |
| `session` | TEXT | Sessão (treino, corrida, etc) |
| `category` | TEXT | Categoria do veículo |
| `classe` | TEXT | Classe do piloto |
| `chassis` | TEXT | Código do chassi |
| `driver_name` | TEXT | Nome do piloto |
| `driver_number` | TEXT | Número do piloto |
| `wheel_position` | TEXT | Posição da roda |
| `wheel_color` | TEXT | Cor da roda |
| `serial_number` | TEXT | Serial number (opcional) |
| `damage_type` | TEXT | Tipo de avaria |
| `action_taken` | TEXT | Ação tomada |
| `destination` | TEXT | Destino (CUP/CONTA/INDEFINIDO) |
| `observations` | TEXT | Observações |
| `photo_urls` | TEXT[] | URLs das fotos |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de atualização |

## 🎨 Páginas e Componentes

### `/pages/Avarias.tsx`
Página principal de listagem com:
- Filtros por etapa, tipo, destino, piloto
- Tabela responsiva
- Badges coloridos
- Layout claro e moderno

### `/components/NovaAvariaModal.tsx`
Modal de registro com:
- Formulário completo
- Validações
- Upload de múltiplas fotos
- Integração com editor de imagem

### `/components/ImageEditor.tsx`
Editor de fotos com:
- Redimensionamento 800x600
- Ajuste de posição/zoom
- Preview em tempo real
- Aplicação de marca d'água

## 🔧 Troubleshooting

### Erro ao salvar avaria

1. **Verifique se a tabela existe:**
   ```sql
   SELECT * FROM wheel_damage_occurrences LIMIT 1;
   ```

2. **Verifique políticas RLS:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'wheel_damage_occurrences';
   ```

3. **Verifique o console do navegador** para logs detalhados

### Erro ao fazer upload de fotos

1. **Verifique se o bucket existe:**
   ```sql
   SELECT * FROM storage.buckets WHERE name = 'wheel-damage-photos';
   ```

2. **Verifique se o bucket é público:**
   - No Dashboard, Storage → wheel-damage-photos → Settings
   - "Public bucket" deve estar ✅ ativado

3. **Verifique políticas de storage:**
   ```sql
   SELECT * FROM storage.policies WHERE bucket_id = 'wheel-damage-photos';
   ```

## 📝 Notas Importantes

- ⚠️ O bucket **DEVE** ser público para que as URLs das fotos funcionem
- 🔒 A segurança é garantida pelas políticas RLS (apenas usuários autenticados)
- 📸 Fotos são redimensionadas automaticamente para 800x600 pixels
- 🏷️ Código sequencial é gerado automaticamente usando timestamp
- 💾 As fotos são organizadas em pastas por ID da avaria no storage

## ✅ Checklist de Instalação

- [ ] Tabela `wheel_damage_occurrences` criada
- [ ] Índices criados
- [ ] Trigger de `updated_at` criado
- [ ] Políticas RLS habilitadas
- [ ] Bucket `wheel-damage-photos` criado
- [ ] Bucket configurado como público
- [ ] Políticas de storage criadas (SELECT, INSERT, UPDATE, DELETE)
- [ ] Teste de inserção executado com sucesso
- [ ] Teste de upload de foto executado com sucesso

## 🎉 Pronto!

Após seguir todos os passos, o sistema de avarias de rodas estará 100% funcional e pronto para uso!
