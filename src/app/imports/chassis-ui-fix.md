A página “Conferência de Chassi” está funcional em termos de regras de negócio e registro no banco de dados. Todas as funcionalidades atuais devem ser preservadas.

No entanto, existe um problema crítico de experiência do usuário na forma como a lógica da interface foi implementada.

Atualmente, quando um código é escaneado e registrado:

o código aparece na interface

alguns segundos depois ele desaparece

em seguida aparece novamente

muitas vezes acompanhado de um pop-up de confirmação

Esse comportamento gera uma “piscada” visual na interface, que é extremamente prejudicial em um fluxo de leitura contínua de códigos de barras.

Quando vários códigos são escaneados rapidamente, essa lógica causa:

instabilidade visual na tela

sobreposição de eventos

perda de foco do campo de leitura

confusão na sequência de registros

risco de códigos não serem registrados corretamente

Esse comportamento de desaparecer e reaparecer o código não é aceitável e precisa ser eliminado.

Objetivo

Refazer a lógica de atualização da interface para que, após o escaneamento de um código:

o código seja registrado imediatamente

o código permaneça visível de forma estável

não exista nenhum comportamento de sumir e reaparecer

não exista re-renderização desnecessária da tabela ou da tela

Requisitos obrigatórios

manter todas as funcionalidades atuais

manter a integridade do registro no banco de dados

garantir estabilidade para leituras rápidas e consecutivas

evitar qualquer piscada ou reconstrução completa da interface

manter o foco no campo de leitura automaticamente

garantir que nenhum código seja perdido no processo

A solução deve priorizar:

atualização incremental da interface

processamento estável das leituras

experiência fluida para escaneamento contínuo

O comportamento final esperado é que o operador consiga escanear vários códigos em sequência sem qualquer atraso, piscada ou instabilidade visual.