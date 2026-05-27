# 🏁 Sistema de Gestão de Pneus - Porsche Cup Brasil

Sistema SaaS responsivo para gerenciamento de estoque de pneus da Porsche Cup Brasil, com identidade moderna e esportiva nas cores vermelho, preto, branco e cinza da marca Porsche.

![Versão](https://img.shields.io/badge/versão-2.2.1--dev-D50000)
![Status](https://img.shields.io/badge/status-produção-00A86B)
![Licença](https://img.shields.io/badge/licença-proprietário-gray)
![Limpeza](https://img.shields.io/badge/limpeza-fase_1_✅-00A86B)

---

## 🎉 Novidades v2.2.1-dev

### Limpeza e Organização (Fase 1 Concluída)
- ✅ **29 arquivos obsoletos removidos** (LEIA_ISTO, URGENTE, etc.)
- ✅ **Root limpo e profissional** 
- ✅ **Documentação consolidada** em `/docs`

### Próximos Passos (Esta Semana)
- 🔄 Integrar `ContainerOccupancyMonitor` no Dashboard
- 🔄 Integrar `ContainerGridMap` na aba Containers
- 🔄 Implementar `VirtualizedTable` em Reports
- 🔄 Adicionar mais opções de exportação

**Ver roadmap completo**: [`/docs/PROXIMAS_MELHORIAS.md`](./docs/PROXIMAS_MELHORIAS.md)  
**Próximos passos**: [`/PROXIMOS_PASSOS.md`](./PROXIMOS_PASSOS.md)

---

## 🎯 Visão Geral

Aplicação web completa (PWA) para gestão operacional de pneus no paddock, desenvolvida especificamente para as necessidades da Porsche Cup Brasil.

### Principais Funcionalidades

✅ **Entrada de Estoque**
- Registro individual e em massa
- Scanner de código de barras integrado
- Modo Rápido para operação acelerada
- Validação de duplicatas e capacidade

✅ **Gestão de Containers**
- Monitor de ocupação em tempo real
- Mapa visual interativo (grid layout)
- Alertas de capacidade crítica
- Movimentação entre containers

✅ **Descarte e Movimentação**
- Descarte individual e em massa
- Histórico completo de movimentações
- Rastreabilidade total

✅ **Relatórios e Análises**
- Dashboard em tempo real
- Gráficos interativos (Recharts)
- Filtros avançados (temporada, etapa, piloto, etc.)
- Exportação PDF e Excel

✅ **ARCS Data Update**
- Atualização de dados ARCS (Piloto, Equipe, Etapa, Categoria)
- Validação automática
- Auditoria de mudanças

---

## 🚀 Stack Tecnológico

### Frontend
- **React** 18+ com TypeScript
- **Tailwind CSS** 4.0 para estilização
- **shadcn/ui** para componentes
- **Motion/React** para animações
- **Recharts** para gráficos
- **Sonner** para notifications
- **xlsx** (SheetJS) para exportação Excel

### Backend
- **Supabase** (PostgreSQL + Edge Functions)
- **Deno** para serverless functions
- **Row-Level Security (RLS)**

### Mobile/PWA
- Service Worker para cache
- Manifest.json configurado
- Ícones otimizados (16px - 512px)
- Otimizações para uso em paddock

---

## 📱 Capturas de Tela

### Dashboard
![Dashboard](./docs/screenshots/dashboard.png)

### Entrada de Estoque
![Entrada](./docs/screenshots/entrada.png)

### Mapa de Containers
![Mapa](./docs/screenshots/mapa-containers.png)

---

## 🛠️ Instalação e Configuração

### Pré-requisitos
- Node.js 18+ ou Bun
- Conta Supabase configurada
- Git

### Instalação Local

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/porsche-cup-pneus.git
cd porsche-cup-pneus

# Instale dependências
npm install
# ou
bun install

# Configure variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais do Supabase

# Execute migrations do banco de dados
# Ver /docs/database/migrations/

# Inicie o servidor de desenvolvimento
npm run dev
# ou
bun dev
```

### Deploy em Produção

Ver [Guia de Deploy](./docs/deployment/DEPLOYMENT.md)

---

## 📚 Documentação

A documentação completa está em [`/docs`](./docs/):

- [CHANGELOG](./docs/CHANGELOG.md) - Histórico de versões
- [Guias de Funcionalidades](./docs/features/) - Documentação detalhada
- [Database Schema](./docs/database/SCHEMA.md) - Estrutura do banco
- [API](./docs/development/API.md) - Documentação da API
- [FAQ](./docs/FAQ.md) - Perguntas frequentes

---

## 🔐 Autenticação

O sistema utiliza **Supabase Auth** com:
- Login por email/senha
- Controle de acesso por role (admin/operator)
- Row-Level Security no banco de dados
- Sessões seguras com JWT

### Usuário Padrão (Desenvolvimento)
```
Email: rafael.borges@porschegt3cup.com.br
Senha: Porschegt3cupHere
```

---

## 🏗️ Estrutura do Projeto

```
porsche-cup-pneus/
├── components/           # Componentes React
│   ├── ui/              # Componentes shadcn/ui
│   ├── figma/           # Componentes importados do Figma
│   └── *.tsx            # Componentes principais
├── utils/               # Utilitários e helpers
├── styles/              # Estilos globais
├── public/              # Arquivos estáticos e PWA
├── supabase/            # Edge Functions
│   └── functions/
│       └── server/
├── docs/                # Documentação
│   ├── features/
│   ├── database/
│   ├── deployment/
│   └── development/
└── guidelines/          # Padrões de código
```

---

## 🎨 Design System

### Cores Principais
- **Porsche Red**: `#D50000` - Principal, botões de ação
- **Porsche Black**: `#1F1F1F` - Textos e header
- **White**: `#FFFFFF` - Fundos e cards
- **Gray Scale**: Variações de cinza para UI

### Tipografia
- Fonte principal: System fonts (otimizado)
- Mono: Monospace para códigos de barras

---

## 🧪 Testes

```bash
# Testes unitários
npm test

# Testes E2E (Cypress)
npm run test:e2e

# Lint
npm run lint
```

---

## 📊 Métricas e Performance

- **Lighthouse Score**: 95+ (Desktop), 90+ (Mobile)
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Bundle Size**: ~500KB (gzipped)

---

## 🤝 Contribuindo

Este é um projeto proprietário. Contribuições são aceitas apenas de desenvolvedores autorizados.

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

---

## 📞 Suporte

Para suporte técnico:
- Email: suporte@porschecupbrasil.com.br
- Issues: [GitHub Issues](https://github.com/.../issues)

---

## 📄 Licença

Proprietário © 2025 Porsche Cup Brasil. Todos os direitos reservados.

---

## 🙏 Agradecimentos

- Equipe Porsche Cup Brasil
- Desenvolvedores e testadores
- Comunidade React e Supabase

---

**Desenvolvido com ❤️ para Porsche Cup Brasil** 🏁
