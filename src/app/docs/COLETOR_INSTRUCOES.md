# 📱 Instruções para Coletor de Dados - Conferência de Pneus

## 🔧 Especificações do Dispositivo

**Coletor de Dados Suportado:**
- **Resolução:** 800 x 480 pixels (WVGA)
- **Tamanho:** 4,0 polegadas (10,2 cm) na diagonal
- **Orientação:** Landscape (horizontal) ou Portrait (vertical)

---

## ✅ Funcionalidades Adaptadas

A página **Conferir Pneus** foi otimizada especificamente para o coletor de dados com as seguintes melhorias:

### 📐 Layout Responsivo
- ✅ Interface compacta com espaçamentos reduzidos
- ✅ Textos em tamanhos otimizados para leitura em tela pequena
- ✅ Botões maiores (mín. 44px de altura) para facilitar toques
- ✅ Inputs de scanner com fonte grande (18px) e negrito

### 🎯 Visualização de Pneus
- ✅ **Grid de cards** substitui a tabela em dispositivos pequenos
- ✅ Visualização em 2 colunas (portrait) ou 4 colunas (landscape)
- ✅ Cores intuitivas:
  - 🟢 **Verde**: Pneu validado (OK)
  - 🟡 **Amarelo/Laranja**: Análise de voltas necessária
  - 🔴 **Vermelho**: Erro - trocar pneu
  - 🔵 **Azul**: Posição ativa para escaneamento
  - ⚪ **Cinza tracejado**: Posição vazia

### 🔍 Scanner Otimizado
- ✅ Campo de entrada com **autofocus** ao abrir chassis
- ✅ Fonte grande e em **negrito** para fácil leitura do código
- ✅ Indicador visual da posição ativa destacado
- ✅ Botão "Confirmar" com tamanho mínimo de toque (52px)

### 🎨 Elementos Ocultos
Para economizar espaço na tela pequena, os seguintes elementos são **automaticamente ocultos**:
- ❌ Descrição do header ("Faça upload da Confirmação...")
- ❌ Botão "Gerar Dados de Teste"
- ❌ Texto "Pendente (X/Y)" nos cards de chassis
- ❌ Label "Posição Ativa:" no scanner

---

## 🚀 Como Usar no Coletor

### 1️⃣ Preparação
1. Acesse a aplicação no navegador do coletor
2. Navegue até: **Administração > Em Desenvolvimento > Jamyli > Conferência de Baias > Conferir Pneus**
3. A interface se adaptará automaticamente ao detectar a resolução 800x480

### 2️⃣ Upload e Configuração
1. **Upload da planilha Excel** (pode ser feito no computador antes)
2. **Selecione a etapa** da temporada ativa
3. Toque em **Continuar**

### 3️⃣ Seleção de Categoria
1. Visualize os cards de categorias (CARRERA CUP, SPRINT CHALLENGE, TROPHY)
2. Toque na categoria desejada
3. Veja a lista de chassis filtrada

### 4️⃣ Conferência de Pneus
1. **Toque no chassis** que deseja conferir
2. O modal de conferência abrirá com:
   - **Scanner no topo** (campo de código)
   - **Cards de pneus** em grid (2 ou 4 colunas)
   - **Navegação entre jogos** por abas

3. **Escaneando pneus:**
   - O campo de scanner está sempre com **foco automático**
   - Escaneie ou digite o código do pneu
   - Pressione **Enter** ou toque em **Confirmar**
   - O sistema avançará automaticamente para a próxima posição

4. **Visualização dos cards:**
   - **Posição** (DE, DD, TE, TD) em destaque
   - **Código do pneu** logo abaixo
   - **Informações** (Tipo, Voltas, Situação) resumidas
   - **Validação** com ícone e mensagem de erro se houver

5. **Reler um pneu:**
   - Toque no botão **🔄 Reler** dentro do card
   - O campo de scanner voltará para aquela posição

### 5️⃣ Finalização
1. Após conferir todos os pneus do chassis:
   - Toque em **Salvar Conferência Completa**
2. Volte para a lista de chassis:
   - Toque em **Fechar (salvar progresso)**
3. Continue com os demais chassis
4. Ao final, toque em **Salvar Etapa no Histórico**

---

## 💡 Dicas de Uso no Campo

### ⚡ Performance
- **Evite abrir muitas abas** no navegador do coletor
- **Feche aplicativos em segundo plano** para liberar memória
- A sessão é **salva automaticamente** - pode fechar e retomar depois

### 🔋 Bateria
- O coletor consome mais bateria durante escaneamento contínuo
- Faça pausas regulares para economizar energia
- Carregue o dispositivo entre etapas quando possível

### 🌐 Conectividade
- **Necessária conexão com internet** para:
  - Carregar dados do Supabase
  - Salvar progresso em tempo real
  - Validar códigos de pneus
- **Sem modo offline** - mantenha conexão estável

### 📊 Orientação da Tela
- **Landscape (horizontal)**: Grid com 4 colunas - melhor para visão geral
- **Portrait (vertical)**: Grid com 2 colunas - melhor para escaneamento focado
- Escolha a orientação mais confortável para você

### 🎯 Precisão no Toque
- Botões têm **mínimo de 44px** para facilitar toques
- Use a **ponta do dedo** para maior precisão
- **Zoom do navegador** pode ser ajustado se necessário

---

## 🐛 Resolução de Problemas

### ❓ Interface não está compacta
**Solução:** Verifique a resolução do navegador. Deve ser 800x480 ou menor para ativar o modo coletor.

### ❓ Scanner não tem foco
**Solução:** Toque uma vez no campo de entrada. O autofocus é ativado ao abrir o modal.

### ❓ Cards de pneus não aparecem
**Solução:** A visualização em cards é exclusiva para telas pequenas. Em telas grandes, aparece a tabela.

### ❓ Botões muito pequenos
**Solução:** 
1. Ajuste o zoom do navegador (geralmente Ctrl + "+")
2. Verifique se o coletor está em modo landscape para botões maiores

### ❓ Sessão foi perdida
**Solução:** A sessão é salva no localStorage. Se foi limpo:
1. Faça novo upload da planilha
2. Configure a etapa novamente
3. Os chassis já conferidos aparecerão como completos se salvos no histórico

---

## 🔐 Segurança

- ✅ **Todos os dados** são sincronizados com Supabase
- ✅ **Autenticação** necessária para acessar a página
- ✅ **Sem cache local** de dados sensíveis
- ✅ **Session storage** apenas para estado da interface

---

## 📞 Suporte

Em caso de problemas ou dúvidas:
1. Verifique a conexão com internet
2. Reinicie o navegador do coletor
3. Contate o administrador do sistema
4. Verifique os logs do console (F12 > Console) para mensagens de erro

---

## 🎉 Changelog - Versão Coletor

### v1.0 - Adaptação Inicial (26/01/2026)
- ✅ Layout responsivo para 800x480
- ✅ Grid de cards para visualização de pneus
- ✅ Botões e inputs otimizados para toque
- ✅ Elementos desnecessários ocultos
- ✅ Cores de validação intuitivas
- ✅ Autofocus no scanner
- ✅ Suporte para landscape e portrait

---

**Desenvolvido para Conecta Cup** | Sistema de Gestão de Pneus
