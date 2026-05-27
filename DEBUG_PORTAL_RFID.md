# Debug: Portal RFID - Guia de Troubleshooting

**Data:** 26/05/2026  
**Status:** 🔧 Debugging

---

## 🐛 Problema Reportado

Portal RFID não está capturando leituras da antena RFID física, mesmo com o leitor funcionando.

---

## ✅ Melhorias Implementadas

### 1. Listener Global de Teclado
- Sistema agora captura TODAS as teclas pressionadas quando portal está ativo
- Não depende mais apenas do input invisível ter foco
- Log detalhado no console de cada tecla pressionada

### 2. Buffer de Scan Visível
- Indicador visual mostrando caracteres sendo capturados em tempo real
- Aparece no topo da lista de leituras: `Capturando: 3018... (15/24)`

### 3. Painel de Debug
- Barra azul no topo mostrando status em tempo real
- Exibe buffer atual, quantidade de caracteres, e número de leituras

### 4. Logs Detalhados
- Console mostra CADA tecla pressionada
- Indica se RFID é válido ou não
- Mostra processo completo de decodificação

### 5. Auto-Focus Agressivo
- Input invisível recebe foco automaticamente a cada 500ms
- Garante que scanner sempre tem onde "digitar"

---

## 🧪 Como Testar

### Teste 1: Verificar Captura de Teclado

1. **Abra o Portal RFID**
   - Menu: Movimentação de Pneus → Portal RFID
   - Clique em **"Iniciar Portal"**

2. **Abra o Console do Navegador**
   - Pressione **F12**
   - Vá na aba **Console**

3. **Teste com o Teclado**
   - Digite qualquer coisa (ex: `ABC123`)
   - **Resultado esperado no console:**
     ```
     🎯 Portal RFID ativado - listener de teclado registrado
     ⌨️ Tecla pressionada: A Buffer atual: 
     ⌨️ Tecla pressionada: B Buffer atual: A
     ⌨️ Tecla pressionada: C Buffer atual: AB
     ⌨️ Tecla pressionada: 1 Buffer atual: ABC
     ```
   - **Resultado esperado na tela:**
     - Barra azul de debug mostra: `Buffer: "ABC123" (6 chars)`
     - Indicador amarelo: `Capturando: ABC123 (6/24)`

4. **Se NÃO aparecer nada:**
   - ❌ Listener de teclado não está funcionando
   - Verifique se há algum erro no console
   - Tente recarregar a página (F5)

### Teste 2: Verificar Scanner RFID

1. **Com Portal Ativo e Console Aberto**
   - Escaneie um pneu com RFID

2. **O que deve acontecer:**
   - Console mostra cada caractere sendo capturado
   - Buffer na tela vai preenchendo: `30185...`
   - Quando atingir 24 caracteres OU pressionar ENTER:
     ```
     ✅ ENTER detectado! Buffer completo: 301854AAE059B8000149614B
     🔍 handleRFIDInput chamado! Valor recebido: 301854AAE059B8000149614B
        Ativo: true
        Valor limpo: 301854AAE059B8000149614B Tamanho: 24
     ✅ RFID VÁLIDO detectado! Processando...
     ```

3. **Se aparecer caracteres mas não processar:**
   - ✅ Scanner está funcionando
   - ❌ Código não tem 24 caracteres OU não é hexadecimal
   - Verifique no console qual é o tamanho exato do código

### Teste 3: Verificar Configuração do Scanner

1. **Configure o scanner RFID para:**
   - ✅ Modo teclado USB (HID Keyboard)
   - ✅ Enviar ENTER após cada leitura
   - ✅ Sem prefixo/sufixo adicional
   - ✅ Formato hexadecimal (0-9, A-F)

2. **Teste o scanner em um Bloco de Notas:**
   - Abra o Bloco de Notas (Notepad)
   - Escaneie um pneu
   - Veja exatamente o que o scanner envia
   - **Deve aparecer algo como:**
     ```
     301854AAE059B8000149614B
     ```
   - Se aparecer algo diferente (ex: com espaços, quebras de linha estranhas, caracteres especiais), o problema está na configuração do scanner

---

## 🔍 Diagnósticos Possíveis

### Problema 1: Nada Aparece no Console
**Sintoma:** Pressiona teclas mas console não mostra nada

**Causa:** Listener de teclado não registrado

**Solução:**
1. Verifique se há erros JavaScript no console
2. Recarregue a página (F5)
3. Clique em "Iniciar Portal" novamente
4. Verifique se a mensagem aparece: `🎯 Portal RFID ativado - listener de teclado registrado`

### Problema 2: Caracteres Aparecem Mas Não Processam
**Sintoma:** Buffer mostra caracteres mas não decodifica

**Possíveis causas:**

**A) Menos de 24 caracteres**
- RFID deve ter EXATAMENTE 24 caracteres hexadecimais
- Verifique o tamanho no console: `Tamanho: XX`
- Se < 24, scanner pode estar configurado errado

**B) Caracteres não-hexadecimais**
- RFID só aceita: 0-9, A-F
- Se tiver letras G-Z ou caracteres especiais, scanner está enviando formato errado
- Console mostrará: `❌ Não é código RFID válido (precisa 24 chars hex)`

**C) Scanner não envia ENTER**
- Sistema espera ENTER para finalizar
- OU aguarda 100ms de inatividade após último caractere
- Configure scanner para enviar ENTER (carriage return)

### Problema 3: Scanner Envia em Formato Diferente
**Sintoma:** Scanner funciona em outros lugares mas não aqui

**Solução:**
1. Abra Bloco de Notas
2. Escaneie um pneu
3. Copie EXATAMENTE o que apareceu
4. Se tiver:
   - **Espaços:** Configure scanner para remover espaços
   - **Quebras de linha duplas:** Configure scanner para ENTER simples
   - **Prefixo/sufixo:** Configure scanner para modo "raw data"
   - **Letras minúsculas:** Sistema converte para maiúsculas automaticamente (OK)

---

## 🛠️ Configurações Recomendadas do Scanner

### Zebra DS3678 / DS9908 / Similar

```
Configuração via código de barras de setup:

1. Factory Reset
2. USB HID Keyboard Mode
3. Keyboard Layout: US
4. Suffix: CR (Carriage Return / ENTER)
5. Prefix: None
6. Data Format: Hexadecimal Uppercase
7. EPC Memory Bank: EPC (não TID)
8. Data Length: 24 bytes (96 bits SGTIN-96)
```

### Impinj Speedway / Similar

```
Configuração via software:

1. Mode: Keyboard Wedge
2. Output Format: Hexadecimal
3. Terminator: CR (\r)
4. Case: Uppercase
5. Memory Bank: EPC
```

---

## 📋 Checklist de Troubleshooting

Siga esta ordem:

- [ ] 1. Portal RFID está em aba ativa (não minimizada)
- [ ] 2. Clicou em "Iniciar Portal" (status ONLINE verde)
- [ ] 3. Abriu Console (F12) e vê mensagem de ativação
- [ ] 4. Testou digitando no teclado - caracteres aparecem no console
- [ ] 5. Scanner configurado para modo USB HID Keyboard
- [ ] 6. Scanner envia ENTER após cada leitura
- [ ] 7. Scanner envia exatamente 24 caracteres hexadecimais
- [ ] 8. Testou scanner no Bloco de Notas - funciona
- [ ] 9. Scanner está focado na janela do navegador (não outro programa)
- [ ] 10. Antena RFID está ligada e detectando tags

---

## 🔬 Logs Esperados (Normal)

### Quando Funciona Corretamente

```javascript
// Ao ativar portal
🎯 Portal RFID ativado - listener de teclado registrado

// Ao escanear RFID
⌨️ Tecla pressionada: 3 Buffer atual: 
⌨️ Tecla pressionada: 0 Buffer atual: 3
⌨️ Tecla pressionada: 1 Buffer atual: 30
⌨️ Tecla pressionada: 8 Buffer atual: 301
// ... 20 mais linhas ...
⌨️ Tecla pressionada: B Buffer atual: 301854AAE059B8000149614

// Timeout OU ENTER
✅ ENTER detectado! Buffer completo: 301854AAE059B8000149614B

// Processamento
🔍 handleRFIDInput chamado! Valor recebido: 301854AAE059B8000149614B
   Ativo: true
   Valor limpo: 301854AAE059B8000149614B Tamanho: 24
✅ RFID VÁLIDO detectado! Processando...

// Anti-duplicidade
⏱️ Tempo desde último caractere: 2547 ms

// Decodificação (dentro de decodeRFID)
📡 Decodificando RFID: 301854AAE059B8000149614B
📊 RFID Decodificado: ItemRef=8480480, Serial=21586251
🔑 Código CAI extraído: 530030
📊 Código de Barras extraído: 05396562

// Tag aparece na lista
✅ Tag adicionada à lista
```

---

## 🆘 Próximos Passos

**Se mesmo após este guia não funcionar:**

1. **Tire print do console completo**
   - Inicie portal
   - Escaneie um pneu
   - Print de TODA a saída do console

2. **Tire print da tela**
   - Mostrando barra de debug azul
   - Mostrando buffer capturado (se houver)

3. **Teste no Bloco de Notas**
   - Escaneie um pneu
   - Print do que apareceu EXATAMENTE
   - Conta quantos caracteres tem

4. **Informe:**
   - Modelo do scanner RFID
   - Como está conectado (USB? Bluetooth?)
   - Se funciona em outros sistemas
   - Qual navegador está usando (Chrome? Edge?)

---

**Desenvolvido em:** 26/05/2026  
**Status:** Troubleshooting ativo 🔧
