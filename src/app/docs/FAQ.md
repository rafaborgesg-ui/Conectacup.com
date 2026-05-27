# FAQ - Perguntas Frequentes

## 📚 Índice
- [Geral](#geral)
- [Exportação Excel](#exportação-excel)
- [Monitor de Ocupação](#monitor-de-ocupação)
- [Mapa de Containers](#mapa-de-containers)
- [Animações e Toast](#animações-e-toast)
- [Performance](#performance)
- [Troubleshooting](#troubleshooting)

---

## Geral

### Qual a versão atual do sistema?
**v2.2.0** - Lançada em 24/01/2025

### O que há de novo nesta versão?
6 grandes melhorias:
1. Exportação para Excel
2. Monitor de ocupação em tempo real
3. Mapa visual de containers
4. Sistema de toast padronizado
5. Animação de confirmação
6. Tabela virtualizada

Ver [Release Notes](./RELEASE_NOTES_2.2.0.md) para detalhes.

### Onde está a documentação completa?
Na pasta `/docs` do projeto. Comece pelo [README.md](./README.md).

---

## Exportação Excel

### Como exportar dados para Excel?
1. Vá em **Relatórios & Histórico**
2. Aplique os filtros desejados
3. Clique em **"Excel"** no header
4. O arquivo será baixado automaticamente

### O arquivo Excel não abre
Verifique:
- ✅ Se tem Microsoft Excel, Google Sheets ou LibreOffice instalado
- ✅ Se o arquivo termina em `.xlsx`
- ✅ Se o download completou (verifique tamanho)

### Posso exportar com filtros?
**Sim!** Os filtros aplicados são automaticamente incluídos no arquivo, com uma aba separada mostrando quais filtros foram usados.

### Qual o limite de registros?
Não há limite prático. Testado com 50.000 registros (~5MB de arquivo).

### Como exportar ocupação de containers?
*Em desenvolvimento* - Será adicionado na v2.2.1

### Posso agendar exportações automáticas?
Não ainda. Feature planejada para v2.3.0.

---

## Monitor de Ocupação

### Onde encontro o monitor?
Será integrado no **Dashboard** na v2.2.1 (próxima atualização).

### Com que frequência atualiza?
- ⏱️ Automaticamente a cada **30 segundos**
- 🔄 Instantaneamente ao salvar/mover/descartar pneus

### O que significam as cores?
- 🔴 **Cheio** (100%)
- 🟠 **Crítico** (90-99%)
- 🟡 **Alto** (70-89%)
- 🟢 **Normal** (40-69%)
- 🔵 **Baixo** (1-39%)
- ⚪ **Vazio** (0%)

### Posso configurar a frequência de atualização?
Sim, mas apenas programaticamente. Default é 30 segundos.

### Os dados são em tempo real?
Sim! O monitor escuta eventos do sistema e atualiza automaticamente quando há mudanças.

---

## Mapa de Containers

### Onde encontro o mapa?
Será integrado na aba **Containers** na v2.2.1.

### Como usar o mapa?
- Visualize todos containers em grid
- Click em um container para ver detalhes
- Cores indicam status de ocupação

### Posso reorganizar o layout?
Não no grid visual. O layout é automático baseado na ordem de cadastro.

### Como adicionar localização física?
Na tela de **Cadastro de Containers**, edite o campo "Localização".

### Quantos containers podem ser exibidos?
Sem limite. O grid é responsivo e se adapta.

---

## Animações e Toast

### A animação trava o sistema?
**Não!** A animação dura 1.5s mas **não bloqueia** operações. Você pode continuar escaneando normalmente.

### Como desativar o som?
O som pode ser mutado nas configurações do navegador. Não há toggle específico no sistema ainda.

### O som não toca
Alguns navegadores bloqueiam som automático por padrão. Você pode:
- Dar permissão de áudio ao site
- Interagir com a página primeiro
- Usar fone de ouvido

### Posso personalizar os toasts?
Não pela interface. As cores e timing são otimizados para a identidade Porsche.

### Toast desaparece muito rápido
Duração é otimizada por tipo:
- Sucesso: 2.5s
- Erro: 4s
- Aviso: 3.5s
- Info: 3s

Se precisar, pode ler o histórico no console do navegador.

---

## Performance

### O sistema está lento
Possíveis causas:
1. **Conexão lenta** - Verifique internet
2. **Muitos dados** - Use filtros para reduzir
3. **Cache cheio** - Limpe cache do navegador
4. **Dispositivo antigo** - Sistema otimizado mas requer hardware mínimo

### Quantos pneus o sistema suporta?
Testado com **50.000 registros** sem problemas de performance.

### A tabela trava ao scrollar
A tabela virtualizada resolve isso! Será integrada nos relatórios na v2.2.1.

### Como melhorar a velocidade?
- ✅ Use filtros para reduzir dados exibidos
- ✅ Feche abas não usadas
- ✅ Limpe cache periodicamente
- ✅ Use navegador moderno (Chrome, Firefox, Edge)

### O sistema funciona offline?
Parcialmente. PWA está instalado mas funcionalidade offline completa virá em v2.3.0.

---

## Troubleshooting

### Erro ao carregar dados
1. Verifique conexão com internet
2. Recarregue a página (Ctrl+F5)
3. Limpe cache do navegador
4. Entre em contato com suporte

### Botão Excel não aparece
1. Verifique se está na aba **Relatórios & Histórico**
2. Recarregue a página
3. Verifique se é versão 2.2.0+ (rodapé da página)

### Login não funciona
Credenciais padrão (desenvolvimento):
```
Email: rafael.borges@porschegt3cup.com.br
Senha: Porschegt3cupHere
```

Para produção, contate o administrador.

### Código de barras não registra
Verifique:
- ✅ Código tem **exatamente 8 dígitos**
- ✅ Código não está **duplicado**
- ✅ Container tem **espaço disponível**
- ✅ Modelo e container estão **selecionados**

### Container mostra ocupação errada
1. Aguarde atualização automática (30s)
2. Recarregue a página
3. Verifique se há **pneus descartados** não contabilizados

### Página em branco
1. Pressione F12 (abrir console)
2. Veja mensagens de erro
3. Tire screenshot
4. Entre em contato com suporte

---

## Compatibilidade

### Navegadores suportados
- ✅ Google Chrome 100+
- ✅ Mozilla Firefox 100+
- ✅ Microsoft Edge 100+
- ✅ Safari 15+
- ⚠️ Internet Explorer: **NÃO suportado**

### Dispositivos móveis
- ✅ iOS 15+
- ✅ Android 10+
- ✅ Tablets (iPad, Android)

### Requisitos mínimos
- **Internet**: 3G ou superior
- **RAM**: 2GB mínimo, 4GB recomendado
- **Tela**: 1024x768 mínimo (desktop), qualquer (mobile)
- **Processador**: Qualquer de 2015+

---

## Segurança

### Meus dados estão seguros?
Sim! 
- ✅ Conexão HTTPS criptografada
- ✅ Autenticação via Supabase Auth
- ✅ Row-Level Security no banco
- ✅ Backups automáticos diários

### Posso acessar de qualquer lugar?
Sim, desde que tenha as credenciais corretas e conexão com internet.

### Quanto tempo ficam os dados armazenados?
**Indefinidamente**. Descartados são marcados mas não deletados (auditoria).

### Posso deletar dados?
Apenas administradores podem deletar registros. Operadores podem apenas descartar.

---

## Funcionalidades Futuras

### Quando virá modo offline completo?
Planejado para **v2.3.0** (Q2 2025).

### Vai ter app mobile nativo?
Planejado para **v3.0.0** (Q3 2025).

### Posso sugerir funcionalidades?
Sim! Entre em contato:
- Email: suporte@porschecupbrasil.com.br
- GitHub Issues (se disponível)

### Roadmap do produto
Ver [ROADMAP](./ROADMAP.md) (em desenvolvimento).

---

## Suporte

### Como obter ajuda?
1. **Consulte esta FAQ**
2. **Leia a documentação** em `/docs`
3. **Entre em contato**: suporte@porschecupbrasil.com.br

### Horário de suporte
- Segunda a Sexta: 8h - 18h (Brasília)
- Fins de semana: Emergências apenas
- Dias de corrida: Suporte prioritário

### Tempo de resposta
- 🔴 **Crítico**: 1 hora
- 🟠 **Alto**: 4 horas
- 🟡 **Médio**: 24 horas
- 🟢 **Baixo**: 48 horas

---

## Termos e Definições

### PWA
Progressive Web App - Aplicação web que funciona como app instalável.

### Container
Recipiente físico que armazena pneus (ex: "Container A", "Trailer 1").

### Status
Estado atual do pneu (ex: "Novo", "Cup Ativo", "Descartado DSI").

### ARCS
Automated Racing Championship System - Sistema de dados da corrida.

### Modo Rápido
Feature que mantém modelo e container selecionados entre registros.

### Virtualização
Técnica que renderiza apenas itens visíveis em listas grandes.

### Toast
Notificação pop-up temporária que confirma ações.

---

**Não encontrou sua dúvida?**  
Entre em contato: suporte@porschecupbrasil.com.br

---

Sistema de Gestão de Pneus - Porsche Cup Brasil v2.2.0
