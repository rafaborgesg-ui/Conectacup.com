Haja como um especialista mundial em RFID industrial, logística Porsche Motorsport, UX/UI premium e sistemas de rastreabilidade em tempo real.

Crie uma experiência FULL PREMIUM para a tela “Movimentação de Pneus > Portal RFID” do sistema ConectaCup, inspirada em operações industriais ultra rápidas de leitura em massa RFID, onde o operador apenas passa o carrinho de pneus sob um portal RFID e TODOS os pneus são identificados instantaneamente sem precisar clicar em nada.

Objetivo principal:
Transformar a movimentação de pneus em uma experiência AUTOMÁTICA, FLUIDA e EM TEMPO REAL, semelhante a um pedágio inteligente RFID industrial.

CONCEITO OPERACIONAL:
- O operador empurra um carrinho cheio de pneus através de um portal RFID físico.
- Assim que os pneus passam sob o portal:
  - Todos os tags RFID devem ser capturados instantaneamente
  - Os pneus devem aparecer automaticamente na tela em tempo real
  - Sem necessidade de ENTER, botão ou confirmação manual
  - Sem exibir registros duplicados
  - Leituras repetidas devem ser ignoradas automaticamente
  - Deve existir um buffer inteligente anti-duplicidade
  - Interface deve transmitir velocidade, confiabilidade e tecnologia premium

UX / EXPERIÊNCIA:
A interface deve parecer um sistema industrial de alta tecnologia utilizado por equipes de motorsport, logística automatizada e estoque inteligente.

Criar uma NOVA ABA:
“Portal RFID”
ao lado de:
- Individual
- Em Massa
- Histórico

LAYOUT DA TELA:
Criar um dashboard moderno, escuro, tecnológico e extremamente clean.

ESTRUTURA VISUAL:

1. HEADER OPERACIONAL
- Status do Portal RFID
- Indicador ONLINE / OFFLINE
- Animação pulsante verde quando lendo tags
- Contador em tempo real:
  “20 TAGS LIDAS”
- Velocidade de leitura:
  “Leitura instantânea ativa”
- Taxa:
  “69 tags/min”

2. ÁREA CENTRAL — LEITURA AO VIVO
Grande painel em tempo real exibindo:
- Lista dos pneus detectados instantaneamente
- Adicionar cada leitura automaticamente no topo
- Animação suave ao aparecer
- Somente registros únicos
- Sem duplicidade visual
- Caso a mesma tag seja lida novamente:
  - apenas destacar rapidamente
  - NÃO adicionar nova linha

Cada linha deve mostrar:
- RFID
- Código do pneu
- Piloto
- Categoria
- Tipo do pneu
- Container atual
- Hora da leitura
- Status visual:
   ✓ LIDO COM SUCESSO

Adicionar efeito:
- brilho verde neon discreto quando novo pneu entrar
- feedback visual de leitura confirmada

3. SIDEBAR DIREITA — RESUMO DA OPERAÇÃO
Painel fixo mostrando:
- Quantidade total lida
- Quantidade válida
- Quantidade ignorada (duplicadas)
- Última leitura
- Tempo da operação
- Intensidade do sinal RFID
- Status da antena

4. ÁREA DE MOVIMENTAÇÃO
Após finalizar a leitura:
- operador seleciona:
   “Mover pneus lidos para:”
- dropdown moderno com containers disponíveis
- botão premium:
   “CONFIRMAR MOVIMENTAÇÃO”

Ao confirmar:
- mover TODOS os pneus lidos simultaneamente
- registrar histórico automaticamente
- salvar:
   - data
   - hora
   - operador
   - origem
   - destino
   - RFID lido
   - lote da leitura

5. FUNCIONALIDADES CRÍTICAS
Implementar visualmente:
- Anti-duplicidade automática
- Buffer inteligente de leitura
- Debounce RFID
- Janela anti-repetição de tags
- Leitura contínua sem travar interface
- Processamento em lote
- Atualização em tempo real via websocket/sse
- Performance ultra fluida

6. EXPERIÊNCIA VISUAL
Visual inspirado em:
- Porsche Motorsport
- logística industrial premium
- scanners industriais Zebra
- centros automatizados Amazon
- telemetria de corrida

7. MICROINTERAÇÕES
Adicionar:
- contador animado
- animação de entrada dos pneus
- indicador “TAG CAPTURADA”
- efeito ripple ao detectar leitura
- feedback instantâneo sem reload

8. FLUXO OPERACIONAL
Fluxo ideal:
1. Operador abre “Portal RFID”
2. Sistema conecta automaticamente ao leitor
3. Portal fica “Aguardando leitura…”
4. Carrinho passa sob o portal
5. Tags aparecem instantaneamente
6. Sistema ignora duplicados automaticamente
7. Operador revisa quantidade
8. Seleciona container destino
9. Confirma movimentação
10. Histórico é salvo automaticamente

9. PERFORMANCE
A tela deve suportar:
- leitura simultânea de dezenas de pneus
- sem travamento
- atualização instantânea
- renderização otimizada
- scroll virtualizado
- processamento assíncrono

10. IMPORTANTE
A interface NÃO deve parecer um formulário comum.
Ela deve parecer:
- um centro de operação industrial em tempo real
- extremamente rápida
- extremamente confiável
- minimalista
- premium
- moderna
- tecnológica

11. REFERÊNCIA VISUAL
Usar como inspiração:
- portais RFID industriais de logística
- leitura automática em massa
- UX semelhante ao vídeo de referência:
“passou no portal -> tudo aparece instantaneamente”
- sem duplicados
- sem ação manual
- experiência frictionless


Objetivo final:
Criar a MELHOR experiência possível de movimentação de pneus via portal RFID para motorsport, onde o operador apenas passa os pneus sob o portal e o sistema identifica tudo automaticamente em tempo real, sem duplicados, com velocidade absurda e visual premium de operação industrial.
