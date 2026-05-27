# 🎨 Guia de Consistência Visual & Feedback

**Versão:** 2.6.0  
**Data:** 24/01/2025  
**Status:** ✅ Implementado

---

## 🎯 Objetivos

### ✅ Feedback Visual Melhorado
- [x] Animações suaves com Motion
- [x] Transições entre telas padronizadas
- [x] Loading states informativos
- [x] Success/Error animations
- [x] Micro-interações

### ✅ Consistência Visual
- [x] Sistema de espaçamento padronizado
- [x] Hierarquia visual clara
- [x] Tokens CSS centralizados
- [x] Componentes reutilizáveis

---

## 📏 Sistema de Espaçamento

### Tokens CSS (globals.css)

```css
:root {
  /* Spacing System */
  --space-xs: 0.25rem;   /* 4px */
  --space-sm: 0.5rem;    /* 8px */
  --space-md: 1rem;      /* 16px */
  --space-lg: 1.5rem;    /* 24px */
  --space-xl: 2rem;      /* 32px */
  --space-2xl: 3rem;     /* 48px */
  --space-3xl: 4rem;     /* 64px */
  
  /* Touch Targets */
  --touch-target-sm: 44px;
  --touch-target-md: 48px;
  --touch-target-lg: 56px;
  
  /* Transitions */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-smooth: 300ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Uso em Tailwind

```tsx
// ✅ BOM - Usa tokens do sistema
<div className="p-4">      {/* 16px = --space-md */}
<div className="mb-6">     {/* 24px = --space-lg */}
<div className="gap-8">    {/* 32px = --space-xl */}

// ❌ EVITAR - Valores arbitrários
<div className="p-[13px]">
<div className="mb-[27px]">
```

### Escala Recomendada

| Token | Valor | Uso |
|-------|-------|-----|
| `space-xs` (4px) | `p-1` `gap-1` | Separadores finos, badges |
| `space-sm` (8px) | `p-2` `gap-2` | Espaçamento mínimo em grupos |
| `space-md` (16px) | `p-4` `gap-4` | **Padrão** - Cards, forms |
| `space-lg` (24px) | `p-6` `gap-6` | Seções, modais |
| `space-xl` (32px) | `p-8` `gap-8` | Páginas, layouts |
| `space-2xl` (48px) | `p-12` `gap-12` | Headers, footers |
| `space-3xl` (64px) | `p-16` `gap-16` | Landing pages |

---

## 🎨 Animações Padronizadas

### Componente AnimatedTransition

**Arquivo:** `/components/AnimatedTransition.tsx`

#### Variantes Disponíveis

```tsx
import { AnimatedTransition } from './components/AnimatedTransition';

// Fade In
<AnimatedTransition variant="fade">
  <Content />
</AnimatedTransition>

// Slide Up (recomendado para modais)
<AnimatedTransition variant="slideUp">
  <Modal />
</AnimatedTransition>

// Slide Down (recomendado para notificações)
<AnimatedTransition variant="slideDown">
  <Notification />
</AnimatedTransition>

// Slide Right/Left (recomendado para navegação)
<AnimatedTransition variant="slideRight">
  <Page />
</AnimatedTransition>

// Scale (recomendado para buttons/cards)
<AnimatedTransition variant="scale">
  <Card />
</AnimatedTransition>

// Bounce (recomendado para success)
<AnimatedTransition variant="bounce">
  <SuccessMessage />
</AnimatedTransition>
```

#### Com Delay/Duration Custom

```tsx
<AnimatedTransition 
  variant="slideUp" 
  delay={0.2}
  duration={0.5}
>
  <Content />
</AnimatedTransition>
```

### Lista com Stagger Effect

```tsx
import { AnimatedList, AnimatedListItem } from './components/AnimatedTransition';

<AnimatedList>
  {items.map(item => (
    <AnimatedListItem key={item.id}>
      <Card item={item} />
    </AnimatedListItem>
  ))}
</AnimatedList>
```

### Success/Error Animations

```tsx
import { SuccessAnimation, ErrorAnimation } from './components/AnimatedTransition';

// Success
<SuccessAnimation />

// Error
<ErrorAnimation />
```

### Loading Dots

```tsx
import { LoadingDots } from './components/AnimatedTransition';

<button disabled>
  Salvando <LoadingDots />
</button>
```

### Shake on Error

```tsx
import { ShakeAnimation } from './components/AnimatedTransition';

<ShakeAnimation trigger={hasError}>
  <Input error={errorMessage} />
</ShakeAnimation>
```

### Collapse/Expand

```tsx
import { Collapse } from './components/AnimatedTransition';

<Collapse isOpen={isExpanded}>
  <DetailedContent />
</Collapse>
```

### Hover Effects

```tsx
import { HoverScale } from './components/AnimatedTransition';

<HoverScale scale={1.05}>
  <Card />
</HoverScale>
```

---

## 🎯 Padrões de Feedback Visual

### 1. Transições de Página

```tsx
import { AnimatedTransition } from './components/AnimatedTransition';

function Dashboard() {
  return (
    <AnimatedTransition variant="slideRight">
      <div className="p-6">
        {/* Conteúdo */}
      </div>
    </AnimatedTransition>
  );
}
```

### 2. Modais/Dialogs

```tsx
import { Dialog } from './components/ui/dialog';
import { AnimatedTransition } from './components/AnimatedTransition';

<Dialog open={isOpen}>
  <AnimatedTransition variant="scale">
    <DialogContent>
      {/* Conteúdo */}
    </DialogContent>
  </AnimatedTransition>
</Dialog>
```

### 3. Toasts/Notificações

```tsx
import { VisualFeedback } from './components/VisualFeedback';

// Success
<VisualFeedback
  type="success"
  message="Pneu registrado com sucesso!"
  description="Código: 12345678"
  action={{
    label: 'Desfazer',
    onClick: handleUndo
  }}
/>

// Error
<VisualFeedback
  type="error"
  message="Erro ao salvar"
  description="Tente novamente"
/>

// Loading
<VisualFeedback
  type="loading"
  message="Salvando..."
/>
```

### 4. Loading States

```tsx
import { LoadingProgress } from './components/VisualFeedback';

// Com progresso
<LoadingProgress
  message="Importando dados..."
  progress={uploadProgress}
/>

// Sem progresso
<LoadingProgress message="Carregando..." />
```

### 5. Action Feedback

```tsx
import { ActionFeedback } from './components/VisualFeedback';

<ActionFeedback
  type="upload"
  status={uploadStatus}
  progress={uploadProgress}
/>
```

### 6. Empty States

```tsx
import { AnimatedEmptyState } from './components/VisualFeedback';

<AnimatedEmptyState
  icon={<Package className="w-16 h-16" />}
  title="Nenhum pneu encontrado"
  description="Tente ajustar os filtros"
  action={
    <Button onClick={handleAdd}>
      Adicionar Pneu
    </Button>
  }
/>
```

---

## 📱 Touch Targets (Mobile)

### Tamanhos Mínimos

```tsx
// ✅ BOM - Touch-friendly
<Button className="min-h-[48px] px-6">
  Salvar
</Button>

<button className="min-h-[44px] min-w-[44px]">
  <Icon className="w-5 h-5" />
</button>

// ❌ EVITAR - Muito pequeno
<button className="h-8 w-8">
  <Icon />
</button>
```

### Helper Classes

```css
/* Usa tokens do sistema */
.touch-target-sm { min-height: var(--touch-target-sm); } /* 44px */
.touch-target-md { min-height: var(--touch-target-md); } /* 48px */
.touch-target-lg { min-height: var(--touch-target-lg); } /* 56px */
```

---

## 🎨 Hierarquia Visual

### Títulos

```tsx
// ✅ Hierarquia consistente
<h1 className="text-2xl font-bold text-gray-900">
  Título Principal
</h1>

<h2 className="text-xl font-semibold text-gray-900">
  Subtítulo
</h2>

<h3 className="text-lg font-medium text-gray-900">
  Seção
</h3>

<h4 className="text-base font-medium text-gray-900">
  Subseção
</h4>
```

### Texto

```tsx
// Texto principal
<p className="text-base text-gray-700">
  Conteúdo principal
</p>

// Texto secundário
<p className="text-sm text-gray-600">
  Informação adicional
</p>

// Texto auxiliar
<p className="text-xs text-gray-500">
  Metadata, timestamps
</p>
```

### Labels

```tsx
<Label className="text-sm font-medium text-gray-900">
  Nome do Campo
</Label>

<span className="text-xs text-gray-500">
  Descrição do campo
</span>
```

---

## 🎯 Cards e Containers

### Card Padrão

```tsx
import { Card } from './components/ui/card';
import { HoverScale } from './components/AnimatedTransition';

<HoverScale>
  <Card className="p-6 space-y-4">
    <h3 className="text-lg font-semibold">Título</h3>
    <p className="text-sm text-gray-600">Conteúdo</p>
  </Card>
</HoverScale>
```

### Card Mobile-Optimized

```tsx
<Card className="p-4 sm:p-6 space-y-3 sm:space-y-4">
  {/* Usa espaçamento responsivo */}
</Card>
```

### Grid de Cards

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => (
    <HoverScale key={item.id}>
      <Card className="p-6">
        {/* Conteúdo */}
      </Card>
    </HoverScale>
  ))}
</div>
```

---

## 🎭 Micro-Interações

### Button Press

```tsx
<motion.button
  whileTap={{ scale: 0.95 }}
  className="px-6 py-3 bg-[#D50000] text-white rounded-lg"
>
  Clique Aqui
</motion.button>
```

### Card Hover

```tsx
import { HoverScale } from './components/AnimatedTransition';

<HoverScale scale={1.02}>
  <Card>
    {/* Conteúdo */}
  </Card>
</HoverScale>
```

### Input Focus

```tsx
<input
  className="
    px-4 py-3 border-2 border-gray-200 rounded-lg
    focus:border-[#D50000] focus:ring-2 focus:ring-[#D50000]/20
    transition-all duration-200
  "
/>
```

### Toggle Animation

```tsx
import { motion } from 'motion/react';

<motion.div
  animate={{ rotate: isOn ? 180 : 0 }}
  transition={{ duration: 0.3 }}
>
  <Icon />
</motion.div>
```

---

## 📊 Estados de Loading

### Skeleton Loading

```tsx
import { Skeleton } from './components/ui/skeleton';

// Card skeleton
<Card className="p-6 space-y-4">
  <Skeleton className="h-6 w-3/4" />
  <Skeleton className="h-4 w-full" />
  <Skeleton className="h-4 w-5/6" />
</Card>

// List skeleton
<div className="space-y-3">
  {[1, 2, 3].map(i => (
    <Skeleton key={i} className="h-12 w-full" />
  ))}
</div>
```

### Loading Spinner

```tsx
import { LoadingSpinner } from './components/LoadingSpinner';

// Inline
<LoadingSpinner size="sm" />

// Centered
<div className="flex items-center justify-center min-h-[200px]">
  <LoadingSpinner size="lg" text="Carregando..." />
</div>
```

### Progress Bar

```tsx
import { Progress } from './components/ui/progress';

<Progress value={uploadProgress} className="w-full" />
```

---

## 🎨 Paleta de Cores Consistente

### Primary (Porsche Red)

```tsx
// Backgrounds
className="bg-[#D50000]"           // Normal
className="bg-[#A80000]"           // Hover/Pressed
className="bg-[#FF5252]"           // Light variant

// Text
className="text-[#D50000]"         // Normal
className="text-[#A80000]"         // Dark

// Borders
className="border-[#D50000]"       // Normal
```

### Status Colors

```tsx
// Success
className="text-green-600 bg-green-50"

// Error
className="text-red-600 bg-red-50"

// Warning
className="text-yellow-600 bg-yellow-50"

// Info
className="text-blue-600 bg-blue-50"
```

### Gray Scale

```tsx
// Text
className="text-gray-900"  // Primary text
className="text-gray-700"  // Body text
className="text-gray-600"  // Secondary text
className="text-gray-500"  // Placeholder/disabled

// Backgrounds
className="bg-gray-50"     // Background alt
className="bg-gray-100"    // Hover states
className="bg-white"       // Cards/containers
```

---

## ✅ Checklist de Implementação

### Para Cada Novo Componente

- [ ] Usa tokens de espaçamento (`space-*`)
- [ ] Touch targets mínimo 44px em mobile
- [ ] Animação de entrada (AnimatedTransition)
- [ ] Feedback visual em ações (hover, active, focus)
- [ ] Loading state apropriado
- [ ] Error state claro
- [ ] Empty state informativo
- [ ] Transições suaves (< 300ms)
- [ ] Cores da paleta oficial
- [ ] Hierarquia visual clara

### Para Formulários

- [ ] Labels com hierarquia correta
- [ ] Inputs com altura mínima 48px (mobile)
- [ ] Estados de focus visíveis
- [ ] Validação inline com animação
- [ ] Loading state no submit
- [ ] Success/Error feedback animado
- [ ] Campos obrigatórios marcados

### Para Listas/Tabelas

- [ ] Skeleton loading durante carregamento
- [ ] Empty state quando vazio
- [ ] Stagger animation nos itens
- [ ] Hover effects em items
- [ ] Loading infinito suave
- [ ] Paginação ou virtualização

---

## 🎯 Exemplos Práticos

### Formulário Completo

```tsx
import { AnimatedTransition, ShakeAnimation } from './components/AnimatedTransition';
import { VisualFeedback } from './components/VisualFeedback';
import { LoadingSpinner } from './components/LoadingSpinner';

function Form() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  return (
    <AnimatedTransition variant="slideUp">
      <Card className="p-6 space-y-6">
        <h2 className="text-xl font-semibold">Novo Registro</h2>

        <ShakeAnimation trigger={!!error}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Código de Barras</Label>
              <Input
                className="min-h-[48px]"
                error={error}
              />
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
            </div>
          </div>
        </ShakeAnimation>

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full min-h-[48px]"
        >
          {isSubmitting ? (
            <>Salvando... <LoadingDots /></>
          ) : (
            'Salvar'
          )}
        </Button>

        {success && (
          <VisualFeedback
            type="success"
            message="Salvo com sucesso!"
          />
        )}
      </Card>
    </AnimatedTransition>
  );
}
```

### Lista Animada

```tsx
import { AnimatedList, AnimatedListItem } from './components/AnimatedTransition';

function ItemList({ items }) {
  if (items.length === 0) {
    return (
      <AnimatedEmptyState
        icon={<Package className="w-16 h-16" />}
        title="Nenhum item encontrado"
        action={<Button>Adicionar Item</Button>}
      />
    );
  }

  return (
    <AnimatedList className="space-y-3">
      {items.map(item => (
        <AnimatedListItem key={item.id}>
          <HoverScale>
            <Card className="p-4">
              {item.name}
            </Card>
          </HoverScale>
        </AnimatedListItem>
      ))}
    </AnimatedList>
  );
}
```

---

## 📚 Recursos

- [Motion (Framer Motion)](https://motion.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)

---

**Última atualização:** 24/01/2025  
**Status:** ✅ Pronto para uso
