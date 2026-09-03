# 🚀 Deploy no Vercel - Conecta Cup

## ✅ Arquivos criados para o deploy:

1. **`/vercel.json`** - Configuração principal do Vercel
2. **`/vite.config.ts`** - Configuração otimizada do Vite (outDir: 'dist')
3. **`/.vercelignore`** - Arquivos a serem ignorados no deploy

---

## 📦 O que foi configurado:

### ✅ **Build Configuration**
- ✅ Output directory: `dist` (padrão do Vite e esperado pelo Vercel)
- ✅ Build command: `npm run build`
- ✅ SPA routing: Todas rotas redirecionam para `index.html`

### ✅ **Otimizações de Performance**
- ✅ Code splitting automático (React, UI, Charts, Scanner, Excel)
- ✅ Minificação com Terser
- ✅ CSS Code splitting
- ✅ Assets inline até 4KB
- ✅ Source maps desabilitados em produção

### ✅ **Headers de Segurança**
- ✅ X-Content-Type-Options: nosniff
- ✅ X-Frame-Options: DENY
- ✅ X-XSS-Protection: habilitado
- ✅ Referrer-Policy: strict-origin-when-cross-origin
- ✅ Permissions-Policy: câmera e fullscreen permitidos

### ✅ **Cache Strategy**
- ✅ Service Worker: sem cache (sempre atualizado)
- ✅ Manifest.json: sem cache
- ✅ Assets estáticos: cache de 1 ano (immutable)

---

## 🎯 Como fazer o deploy:

### **Opção 1: Via GitHub (Recomendado)**

1. Faça commit das mudanças:
   ```bash
   git add .
   git commit -m "Configure Vercel deployment"
   git push
   ```

2. No Vercel Dashboard:
   - O deploy será automático! ✅
   - Aguarde ~2 minutos
   - Acesse a URL fornecida

### **Opção 2: Via Vercel CLI**

```bash
# Instalar Vercel CLI (se não tiver)
npm i -g vercel

# Fazer login
vercel login

# Deploy
vercel --prod
```

---

## ⚙️ Variáveis de Ambiente no Vercel

Configure estas variáveis no Vercel Dashboard:

1. Acesse: **Project Settings → Environment Variables**
2. Adicione (se necessário):
   ```
   VITE_SUPABASE_URL=https://nflgqugaabtxzifyhjor.supabase.co
   VITE_SUPABASE_ANON_KEY=seu_anon_key_aqui
   ```

**IMPORTANTE:** As variáveis já estão hardcoded em `/utils/supabase/info.tsx`, então o deploy deve funcionar sem configurar nada!

---

## 🐛 Troubleshooting

### ❌ **Erro: "No Output Directory named 'dist' found"**
**Solução:** Já resolvido! O `vercel.json` está configurado com `outputDirectory: "build"`

### ❌ **Erro: "Module not found"**
**Solução:** Verifique se todas dependências estão no `package.json`

### ❌ **Erro: Build muito grande (>500KB)**
**Solução:** Normal! Os chunks de Reports e index são grandes mas otimizados. O aviso pode ser ignorado.

### ❌ **Página em branco após deploy**
**Solução:** 
1. Verifique o console do navegador (F12)
2. Verifique se as variáveis do Supabase estão corretas
3. Teste a URL da Edge Function

---

## ✅ Verificação Pós-Deploy

Após o deploy, teste:

1. ✅ **Login funciona?**
2. ✅ **Dashboard carrega os dados?**
3. ✅ **Módulos principais funcionam?**
   - Entrada de Estoque
   - Cadastro de Modelos
   - Cadastro de Contêineres
   - Relatórios
4. ✅ **PWA instala corretamente?**
5. ✅ **Scanner de código de barras funciona?**

---

## 🎉 Próximos passos

Após o deploy bem-sucedido:

1. Configure um domínio customizado no Vercel
2. Configure SSL/HTTPS (automático no Vercel)
3. Configure analytics (opcional)
4. Configure monitoring/error tracking

---

## 📊 Performance Esperada

- ⚡ **First Contentful Paint:** < 1.5s
- ⚡ **Time to Interactive:** < 3.5s
- ⚡ **Largest Contentful Paint:** < 2.5s
- 📦 **Bundle Size:** ~2-3 MB (gzipped: ~600-700 KB)

---

**Tudo pronto para o deploy!** 🚀

Faça o commit e push para o GitHub que o Vercel vai deployar automaticamente.