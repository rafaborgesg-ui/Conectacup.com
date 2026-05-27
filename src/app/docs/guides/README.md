# 📖 Guides & How-To

Guias de uso, deployment, otimização e referência rápida.

---

## 📂 Arquivos

```
guides/
├── README.md (este arquivo)
├── DEPLOYMENT.md
├── OPTIMIZATION_INDEX.md
├── COMO_COMPLETAR_LIMPEZA.md
├── LOCALIZACAO_BOTAO_COLUNAS.md
├── VISUAL_BOTAO_COLUNAS.md
├── VISUAL_FEEDBACK_SUMMARY.md
└── USE_DATA_FETCH_QUICK_REFERENCE.md
```

---

## 🚀 Deployment

📄 **[DEPLOYMENT.md](./DEPLOYMENT.md)**

Guia completo de deploy em produção:
- Configuração do ambiente
- Variáveis de ambiente
- Build e otimização
- Deploy no Vercel/Netlify
- CI/CD setup
- Monitoring

---

## ⚡ Otimização

📄 **[OPTIMIZATION_INDEX.md](./OPTIMIZATION_INDEX.md)**

Índice de todas as otimizações disponíveis:
- Performance optimization
- Query optimization
- Bundle size reduction
- Code splitting
- Lazy loading

---

## 🧹 Limpeza

📄 **[COMO_COMPLETAR_LIMPEZA.md](./COMO_COMPLETAR_LIMPEZA.md)**

Como completar a limpeza de código:
- Remover código duplicado
- Consolidar componentes
- Otimizar imports
- Eliminar dead code

---

## 🔧 Componentes

### **Botão de Colunas:**

📄 **[LOCALIZACAO_BOTAO_COLUNAS.md](./LOCALIZACAO_BOTAO_COLUNAS.md)**  
Onde encontrar o botão de personalização de colunas.

📄 **[VISUAL_BOTAO_COLUNAS.md](./VISUAL_BOTAO_COLUNAS.md)**  
Guia visual do componente ColumnSelector.

---

## 🎨 Visual Feedback

📄 **[VISUAL_FEEDBACK_SUMMARY.md](./VISUAL_FEEDBACK_SUMMARY.md)**

Resumo de todos os feedbacks visuais implementados:
- Toasts
- Animations
- Loading states
- Success/Error states
- Skeleton loaders

---

## 🎣 useDataFetch Hook

📄 **[USE_DATA_FETCH_QUICK_REFERENCE.md](./USE_DATA_FETCH_QUICK_REFERENCE.md)**

Referência rápida do hook useDataFetch:
- Como usar
- Opções disponíveis
- Exemplos práticos
- Cache strategies
- Error handling

**Exemplo:**
```typescript
const { data, loading, error } = useDataFetch(
  'tire-models',
  () => fetchTireModels(),
  { cache: true, refetchInterval: 5000 }
);
```

---

## 📚 Links Relacionados

- ✨ [Features](/docs/features/)
- 🎨 [UX Audits](/docs/ux-audit/)
- 📦 [Releases](/docs/releases/)
- 🐛 [Troubleshooting](/docs/troubleshooting/)

---

**Última atualização:** 2025-01-24  
**Sistema desenvolvido para Porsche Cup Brasil** 🏁
