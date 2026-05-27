# 📧 Guia Rápido - Envio de Planilha de Avarias

## 🎯 Funcionalidade

Sistema completo de envio automático de planilhas de avarias por e-mail, permitindo selecionar a etapa e adicionar destinatários extras além do gestor configurado.

---

## 📍 Onde está?

**Administração > Em Desenvolvimento > Jamyli > Rodas > Dashboard**

Botão: **"ENVIAR PLANILHA"** (botão preto, ao lado de "Iniciar Nova Ocorrência")

---

## 🔧 Configuração Inicial (OBRIGATÓRIO)

### 1. Executar SQL no Supabase

⚠️ **IMPORTANTE:** Execute o arquivo SQL:
📄 `/supabase/migrations/send_wheel_damage_report_email.sql`

**Passos:**
1. Acesse o **Dashboard do Supabase** > **SQL Editor**
2. Clique em **"New query"**
3. Cole TODO o conteúdo do arquivo acima
4. **Configure sua API Key da Resend** na linha 13 (substitua `COLE_SUA_API_KEY_AQUI`)
5. Configure o e-mail remetente na linha 14 (padrão: `onboarding@resend.dev`)
6. Clique em **"Run"**
7. ✅ Deve aparecer: "Success. No rows returned"

### 2. Definir Gestor de Avarias

1. Acesse: **Configurações > Notificações de Avarias**
2. Clique em **"Definir como Gestor"** no usuário que deve receber os relatórios
3. ✅ Um card verde deve aparecer no topo confirmando

---

## 📖 Como Usar

### Passo 1: Acessar o Dashboard
Navegue até: **Administração > Em Desenvolvimento > Jamyli > Rodas > Dashboard**

### Passo 2: Clicar em "Enviar Planilha"
Clique no botão preto **"ENVIAR PLANILHA"** no canto superior direito

### Passo 3: Selecionar a Etapa
No modal que abrir:
- Selecione a **etapa** no dropdown
- Apenas avarias **aprovadas** desta etapa serão incluídas

### Passo 4: Adicionar Destinatários (Opcional)
- O **gestor de avarias** receberá automaticamente
- Para adicionar mais destinatários:
  1. Digite o e-mail no campo
  2. Clique em **"Adicionar"** ou pressione **Enter**
  3. Repita para adicionar mais e-mails
  4. Para remover, clique no ícone de lixeira

### Passo 5: Enviar
- Clique em **"Enviar E-mail"**
- Aguarde o processamento (10-30 segundos)
- ✅ Uma mensagem de sucesso aparecerá com os destinatários e total de avarias

---

## 📊 Conteúdo da Planilha

### Formato
- **Arquivo:** XLSX (Excel nativo)
- **Nome:** `Avarias_[Nome_da_Etapa]_DD-MM-YYYY.xlsx`
- **Biblioteca:** SheetJS (xlsx)

### Colunas Incluídas (21 campos)

| Coluna | Descrição |
|--------|-----------|
| **Data Incidente** | Data do incidente (DD/MM/YYYY) |
| **Data Relatório** | Data de criação (DD/MM/YYYY) |
| **Etapa** | Nome completo da etapa |
| **Categoria** | Categoria do piloto |
| **Modelo** | Modelo do carro (992.1, 991.2, 991.1) |
| **Número Piloto** | Número do piloto |
| **Nome Piloto** | Nome completo |
| **Classe** | Classe (CARRERA, CHALLENGE, etc) |
| **Chassis** | Código do chassis |
| **Roda avariada** | Posição (DD, DE, TD, TE) |
| **Cor da roda** | Cor da roda |
| **Serial number** | Número de série |
| **Sessão** | Sessão (Treino Livre, Classificação, Corrida, Warm-up) |
| **Tipo Avaria** | Tipo de avaria |
| **Nível empenamento** | Nível de empenamento |
| **Ação Tomada** | Ação tomada |
| **Destino** | CUP, CONTA, etc |
| **Observações** | Observações gerais |
| **Legendas fotos** | L01.1, L01.2, etc (uma linha por foto) |
| **Índice Roda** | L01, L02, L03, etc |
| **Peças ADM** | Campo vazio para preenchimento |

### Exemplo de Dados

```
Data Incidente,Data Relatório,Etapa,Categoria,...,Legendas fotos,Índice Roda
10/02/2026,11/02/2026,"Etapa 1 - Interlagos","CARRERA CUP",...,L01.1,L01
10/02/2026,11/02/2026,"Etapa 1 - Interlagos","CARRERA CUP",...,L01.2,L01
11/02/2026,11/02/2026,"Etapa 1 - Interlagos","CHALLENGE",...,L02.1,L02
```

⚠️ **NOTA:** Se uma avaria tiver 3 fotos, serão geradas 3 linhas (uma para cada foto).

---

## ✉️ E-mail Enviado

### Assunto
`📊 Relatório de Avarias - [Nome da Etapa]`

### Conteúdo
- **Header:** Visual com gradiente vermelho
- **Informações:**
  - Nome da etapa
  - Total de avarias incluídas
- **Anexo:** Planilha CSV
- **Botão:** Link para acessar o sistema
- **Footer:** Assinatura Conecta Cup

### Remetente
- **Nome:** Conecta Cup
- **E-mail:** `onboarding@resend.dev` (ou seu domínio configurado)

---

## 🔍 Verificação de Envio

### Frontend
Após clicar em "Enviar E-mail", aparecerá um alerta com:
```
✅ E-mail enviado com sucesso!

Destinatários:
gestor@example.com
extra1@example.com
extra2@example.com

Total de avarias: 15
```

### Backend (SQL)
Verificar logs de envio:
```sql
SELECT 
  id,
  created,
  status_code,
  content::text as response
FROM net._http_response 
ORDER BY created DESC 
LIMIT 5;
```

**Status esperado:** `200` ou `201` (sucesso)

---

## ❌ Possíveis Erros

### "Nenhum gestor de avarias definido"
**Solução:** Acesse `/configuracoes-notificacoes` e defina um gestor

### "Etapa não encontrada"
**Solução:** Verifique se a etapa existe e está vinculada à temporada ativa

### "Nenhuma avaria encontrada para esta etapa"
**Solução:** A etapa selecionada não possui avarias aprovadas

### "E-mail inválido"
**Solução:** Verifique o formato dos e-mails extras adicionados

### Status 400 (Bad Request) nos logs
**Solução:** Verifique se a API Key da Resend está correta na função SQL

### Status 401 (Unauthorized) nos logs
**Solução:** A API Key da Resend está incorreta ou expirada

---

## 🎯 Regras de Negócio

1. ✅ Apenas avarias **aprovadas** são incluídas (status != 'rejected')
2. ✅ O gestor de avarias **sempre** recebe o e-mail
3. ✅ Destinatários extras são **opcionais**
4. ✅ Uma linha é gerada para **cada foto** da avaria
5. ✅ Se a avaria não tiver fotos, gera **apenas uma linha**
6. ✅ O arquivo é em formato **XLSX** (Excel nativo)
7. ✅ A planilha segue o **mesmo formato** da exportação da página Avarias

---

## 🚀 Melhorias Futuras (Sugestões)

- [ ] Permitir envio para múltiplas etapas de uma vez
- [ ] Adicionar opção de incluir fotos como anexo ZIP
- [ ] Permitir agendamento de envio automático
- [ ] Criar template customizável de e-mail
- [ ] Adicionar histórico de e-mails enviados
- [ ] Permitir filtros adicionais (categoria, piloto, tipo de avaria)

---

## 📞 Suporte

Em caso de dúvidas ou problemas:
1. Verifique os logs SQL com a query acima
2. Confirme que o gestor está definido
3. Valide a API Key da Resend
4. Verifique se a extensão `pg_net` está habilitada no Supabase

---

**Desenvolvido para Conecta Cup** 🏁
Sistema de Gestão de Avarias de Rodas