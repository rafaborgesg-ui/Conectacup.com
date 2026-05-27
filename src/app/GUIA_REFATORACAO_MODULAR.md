# 🔧 Guia Prático: Refatoração Modular do ConferirPneus
## Transformando 6500 linhas em arquitetura profissional

---

## 🎯 OBJETIVO

Transformar o monolito `ConferirPneus.tsx` em uma **arquitetura modular, testável e manutenível**, mantendo **100% das funcionalidades** existentes.

---

## 📋 PASSO A PASSO (INCREMENTAL)

### FASE 1: Preparação (1 dia)

#### 1.1 Criar estrutura de pastas
```bash
mkdir -p src/features/tire-conference/{domain,application,infrastructure,presentation}
mkdir -p src/features/tire-conference/domain/{entities,value-objects,rules}
mkdir -p src/features/tire-conference/application/{use-cases,hooks}
mkdir -p src/features/tire-conference/infrastructure/{repositories,services}
mkdir -p src/features/tire-conference/presentation/{components,hooks}
```

#### 1.2 Criar arquivo de tipos centralizado
```bash
touch src/features/tire-conference/domain/types.ts
```

---

### FASE 2: Extrair Tipos e Constantes (2 horas)

**Arquivo**: `/features/tire-conference/domain/types.ts`

```typescript
// ============================================
// TYPES - Centraliza TODOS os tipos
// ============================================

export interface TireCheckSession {
  id: string;
  etapa: string;
  created_at: string;
  user_id: string;
  user_name: string;
  status: 'active' | 'completed' | 'abandoned';
  chassis_count: number;
  completed_chassis_count: number;
}

export interface TireSet {
  jogo: number;
  label: string;
  tires: TireData[];
}

export interface TireData {
  posicao: string;
  codigo: string;
  piloto: string;
  ano: string;
  set: string;
  tipo: string;
  voltas: string;
  situacao: string;
  observacao?: string;
  validacao?: ValidationResult;
  _originalIndex?: number;
}

export type ValidationResult = 'OK' | 'TROCAR PNEU' | 'CUP - ANALISE VOLTAS' | null;
export type ScanAction = 'BIPAR' | 'LIMPAR' | 'OBSERVACAO';
export type TirePosition = 'DD' | 'DE' | 'TE' | 'TD';

export interface ChassisCheckData {
  numero: string;
  piloto: string;
  categoria: string;
  corrida: string;
  sheetName: string;
  jogos: TireSet[];
}

export interface ExcelChassisData {
  numero: string;
  piloto: string;
  categoria: string;
  corrida: string;
  sheetName: string;
  tiresChecked: number;
  totalTires: number;
}

// ============================================
// CONSTANTS
// ============================================

export const TIRE_POSITIONS: Record<number, TirePosition> = {
  0: 'DD',
  1: 'DE',
  2: 'TE',
  3: 'TD'
} as const;

export const TIRE_POSITIONS_FULL: Record<number, string> = {
  0: 'Dianteiro Direito',
  1: 'Dianteiro Esquerdo',
  2: 'Traseiro Esquerdo',
  3: 'Traseiro Direito'
} as const;

export const VALIDATION_RULES = {
  TROCAR_PNEU: 'TROCAR PNEU',
  ANALISE_VOLTAS: 'CUP - ANALISE VOLTAS',
  OK: 'OK'
} as const;
```

---

### FASE 3: Extrair Regras de Negócio (3 horas)

**Arquivo**: `/features/tire-conference/domain/rules/TireValidationRules.ts`

```typescript
import { TireData, ValidationResult } from '../types';

export interface ChassisContext {
  piloto: string;
  corrida: string;
}

export class TireValidationRules {
  /**
   * REGRA 1: Piloto Vai Correr + Pneu para DESCARTAR = TROCAR PNEU
   * 
   * Lógica: Se o piloto está confirmado para correr, mas o pneu
   * está marcado para descarte, isso é uma divergência crítica.
   */
  static validateConfirmedWithDiscard(
    tire: TireData,
    context: ChassisContext
  ): ValidationResult | null {
    const isConfirmed = context.corrida.toUpperCase() === 'SIM';
    const isDiscard = tire.situacao === 'Descartar';
    
    if (isConfirmed && isDiscard) {
      return 'TROCAR PNEU';
    }
    
    return null;
  }

  /**
   * REGRA 2: Piloto Não Corre + Pneu para GUARDAR = TROCAR PNEU
   * 
   * Lógica: Se o piloto não vai correr, mas o pneu está marcado
   * para guardar (usado), isso indica erro de classificação.
   */
  static validateNotConfirmedWithSave(
    tire: TireData,
    context: ChassisContext
  ): ValidationResult | null {
    const isNotConfirmed = ['NÃO', 'NAO', 'INDEF.', 'INDEF', 'INDEFINIDO']
      .includes(context.corrida.toUpperCase());
    const isSave = tire.situacao === 'Guardar';
    
    if (isNotConfirmed && isSave) {
      return 'TROCAR PNEU';
    }
    
    return null;
  }

  /**
   * REGRA 3: Piloto Não Corre + Pneu para DESCARTAR = CUP - ANALISE VOLTAS
   * 
   * Lógica: Se o piloto não vai correr e o pneu está para descarte,
   * precisa de análise da CUP sobre as voltas.
   */
  static validateNotConfirmedWithDiscard(
    tire: TireData,
    context: ChassisContext
  ): ValidationResult | null {
    const isNotConfirmed = ['NÃO', 'NAO', 'INDEF.', 'INDEF', 'INDEFINIDO']
      .includes(context.corrida.toUpperCase());
    const isDiscard = tire.situacao === 'Descartar';
    
    if (isNotConfirmed && isDiscard) {
      return 'CUP - ANALISE VOLTAS';
    }
    
    return null;
  }

  /**
   * REGRA 4: Pneu OK
   * 
   * Lógica: Piloto correto, vai correr, pneu para guardar = tudo certo
   */
  static validateOk(
    tire: TireData,
    context: ChassisContext,
    isPilotCorrect: boolean
  ): ValidationResult | null {
    const isConfirmed = context.corrida.toUpperCase() === 'SIM';
    const isSave = tire.situacao === 'Guardar';
    
    if (isPilotCorrect && isSave && isConfirmed) {
      return 'OK';
    }
    
    return null;
  }

  /**
   * Aplica TODAS as regras em ordem de prioridade
   */
  static validate(
    tire: TireData,
    context: ChassisContext,
    isPilotCorrect: boolean
  ): ValidationResult {
    if (tire.codigo === '-') return null;
    
    // Ordem importa! Regras mais críticas primeiro
    const rules = [
      this.validateConfirmedWithDiscard,
      this.validateNotConfirmedWithSave,
      this.validateNotConfirmedWithDiscard,
      this.validateOk
    ];
    
    for (const rule of rules) {
      const result = rule(tire, context, isPilotCorrect);
      if (result !== null) return result;
    }
    
    return null;
  }
}

/**
 * Helper para validar piloto
 */
export function isPilotMatch(tirePilot: string, chassisPilot: string): boolean {
  return normalizePilotName(tirePilot) === normalizePilotName(chassisPilot);
}

function normalizePilotName(name: string | null | undefined): string {
  if (!name) return '';
  
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
```

**Testes** (`TireValidationRules.test.ts`):
```typescript
import { TireValidationRules } from './TireValidationRules';

describe('TireValidationRules', () => {
  const mockContext = {
    piloto: 'João Silva',
    corrida: 'SIM'
  };

  const mockTire = {
    posicao: 'DD',
    codigo: 'E449',
    piloto: 'João Silva',
    ano: '2024',
    set: 'SET1',
    tipo: 'Slick',
    voltas: '10',
    situacao: 'Guardar'
  };

  describe('REGRA 1: Piloto Vai Correr + Descartar', () => {
    it('deve retornar TROCAR PNEU', () => {
      const tire = { ...mockTire, situacao: 'Descartar' };
      const result = TireValidationRules.validate(tire, mockContext, true);
      
      expect(result).toBe('TROCAR PNEU');
    });
  });

  describe('REGRA 2: Piloto Não Corre + Guardar', () => {
    it('deve retornar TROCAR PNEU', () => {
      const context = { ...mockContext, corrida: 'NÃO' };
      const result = TireValidationRules.validate(mockTire, context, true);
      
      expect(result).toBe('TROCAR PNEU');
    });
  });

  describe('REGRA 3: Piloto Não Corre + Descartar', () => {
    it('deve retornar CUP - ANALISE VOLTAS', () => {
      const context = { ...mockContext, corrida: 'NÃO' };
      const tire = { ...mockTire, situacao: 'Descartar' };
      const result = TireValidationRules.validate(tire, context, true);
      
      expect(result).toBe('CUP - ANALISE VOLTAS');
    });
  });

  describe('REGRA 4: Pneu OK', () => {
    it('deve retornar OK', () => {
      const result = TireValidationRules.validate(mockTire, mockContext, true);
      
      expect(result).toBe('OK');
    });
  });
});
```

---

### FASE 4: Criar Repositórios (4 horas)

**Arquivo**: `/features/tire-conference/infrastructure/repositories/TireCheckRepository.ts`

```typescript
import { createClient, SupabaseClient } from '@/utils/supabase/client';
import { TireCheckSession, TireSet, ScanAction } from '../../domain/types';

export interface TireScanDTO {
  sessionId: string;
  chassis: string;
  jogo: number;
  posicao: string;
  tireCode: string | null;
  action: ScanAction;
  userId: string;
  userName: string;
  tireData: any;
}

export interface CreateSessionDTO {
  etapa: string;
  userId: string;
  userName: string;
  chassisCount: number;
}

export class TireCheckRepository {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient();
  }

  /**
   * Cria nova sessão de conferência
   */
  async createSession(data: CreateSessionDTO): Promise<string> {
    const { data: session, error } = await this.supabase
      .from('tire_check_sessions')
      .insert({
        etapa: data.etapa,
        user_id: data.userId,
        user_name: data.userName,
        status: 'active',
        chassis_count: data.chassisCount,
        completed_chassis_count: 0,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create session: ${error.message}`);
    }

    return session.id;
  }

  /**
   * Salva scan de pneu individual
   */
  async saveTireScan(data: TireScanDTO): Promise<void> {
    const { error } = await this.supabase
      .from('tire_scan_history')
      .insert({
        session_id: data.sessionId,
        chassis: data.chassis,
        jogo: data.jogo,
        posicao: data.posicao,
        tire_code: data.tireCode,
        action: data.action,
        user_id: data.userId,
        user_name: data.userName,
        tire_data: data.tireData,
        created_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Failed to save tire scan: ${error.message}`);
    }
  }

  /**
   * Atualiza progresso da sessão
   */
  async updateSessionProgress(
    sessionId: string,
    chassis: string,
    progress: Record<string, any>
  ): Promise<void> {
    const { error } = await this.supabase
      .from('tire_check_sessions')
      .update({
        progress: {
          ...progress,
          [chassis]: progress[chassis]
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (error) {
      throw new Error(`Failed to update session: ${error.message}`);
    }
  }

  /**
   * Busca sessão ativa do usuário
   */
  async getActiveSession(userId: string): Promise<TireCheckSession | null> {
    const { data, error } = await this.supabase
      .from('tire_check_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Não encontrado
      throw new Error(`Failed to get active session: ${error.message}`);
    }

    return data;
  }

  /**
   * Busca histórico de scans de um chassis
   */
  async getTireHistory(sessionId: string, chassis: string) {
    const { data, error } = await this.supabase
      .from('tire_scan_history')
      .select('*')
      .eq('session_id', sessionId)
      .eq('chassis', chassis)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get tire history: ${error.message}`);
    }

    return data;
  }
}
```

---

### FASE 5: Criar Use Cases (5 horas)

**Arquivo**: `/features/tire-conference/application/use-cases/ScanTireUseCase.ts`

```typescript
import { TireCheckRepository } from '../../infrastructure/repositories/TireCheckRepository';
import { TireValidationRules, isPilotMatch } from '../../domain/rules/TireValidationRules';
import { TireData, TireSet, ChassisContext } from '../../domain/types';
import { getTireByBarcode } from '@/utils/storage';

export interface ScanTireInput {
  code: string;
  jogo: number;
  position: number;
  chassisNumber: string;
  chassisContext: ChassisContext;
  sessionId: string;
  userId: string;
  userName: string;
}

export interface ScanTireOutput {
  tire: TireData;
  validation: string | null;
  shouldAutoFocusNext: boolean;
  nextPosition?: { jogo: number; position: number };
}

export class ScanTireUseCase {
  constructor(private repository: TireCheckRepository) {}

  async execute(input: ScanTireInput): Promise<ScanTireOutput> {
    // 1. Validar código
    if (!input.code || input.code.trim().length === 0) {
      throw new Error('Código de pneu inválido');
    }

    // 2. Buscar pneu no estoque
    const stockTire = await getTireByBarcode(input.code);
    
    if (!stockTire) {
      throw new Error('Pneu não encontrado no estoque');
    }

    // 3. Montar dados do pneu
    const tireData: TireData = {
      posicao: this.getPositionName(input.position),
      codigo: input.code,
      piloto: stockTire.piloto || '-',
      ano: stockTire.ano || '',
      set: stockTire.set || '',
      tipo: stockTire.tipo || '',
      voltas: stockTire.voltas || '',
      situacao: stockTire.situacao || '-',
      observacao: '',
      _originalIndex: input.position
    };

    // 4. Validar pneu
    const isPilotCorrect = isPilotMatch(tireData.piloto, input.chassisContext.piloto);
    const validation = TireValidationRules.validate(
      tireData,
      input.chassisContext,
      isPilotCorrect
    );

    tireData.validacao = validation;

    // 5. Salvar no Supabase
    await this.repository.saveTireScan({
      sessionId: input.sessionId,
      chassis: input.chassisNumber,
      jogo: input.jogo,
      posicao: this.getPositionName(input.position),
      tireCode: input.code,
      action: 'BIPAR',
      userId: input.userId,
      userName: input.userName,
      tireData: tireData
    });

    // 6. Calcular próxima posição
    const nextPosition = this.calculateNextPosition(input.jogo, input.position);

    return {
      tire: tireData,
      validation,
      shouldAutoFocusNext: true,
      nextPosition
    };
  }

  private getPositionName(index: number): string {
    const positions = ['DD', 'DE', 'TE', 'TD'];
    return positions[index] || `Pos ${index}`;
  }

  private calculateNextPosition(
    currentJogo: number,
    currentPosition: number
  ): { jogo: number; position: number } | undefined {
    // Se ainda tem posições no jogo atual
    if (currentPosition < 3) {
      return {
        jogo: currentJogo,
        position: currentPosition + 1
      };
    }

    // Se chegou ao fim do jogo, vai pro próximo
    if (currentJogo < 4) {
      return {
        jogo: currentJogo + 1,
        position: 0
      };
    }

    // Chegou ao fim de todos os jogos
    return undefined;
  }
}
```

**Testes**:
```typescript
import { ScanTireUseCase } from './ScanTireUseCase';
import { TireCheckRepository } from '../../infrastructure/repositories/TireCheckRepository';

describe('ScanTireUseCase', () => {
  let useCase: ScanTireUseCase;
  let mockRepository: jest.Mocked<TireCheckRepository>;

  beforeEach(() => {
    mockRepository = {
      saveTireScan: jest.fn()
    } as any;

    useCase = new ScanTireUseCase(mockRepository);
  });

  it('deve escanear pneu com sucesso', async () => {
    const input = {
      code: 'E449',
      jogo: 1,
      position: 0,
      chassisNumber: '001',
      chassisContext: {
        piloto: 'João Silva',
        corrida: 'SIM'
      },
      sessionId: 'session-123',
      userId: 'user-1',
      userName: 'João'
    };

    const result = await useCase.execute(input);

    expect(result.tire.codigo).toBe('E449');
    expect(result.shouldAutoFocusNext).toBe(true);
    expect(result.nextPosition).toEqual({ jogo: 1, position: 1 });
    expect(mockRepository.saveTireScan).toHaveBeenCalled();
  });

  it('deve calcular próximo jogo corretamente', async () => {
    const input = {
      code: 'E449',
      jogo: 1,
      position: 3, // Última posição do jogo
      // ... outros campos
    };

    const result = await useCase.execute(input);

    expect(result.nextPosition).toEqual({ jogo: 2, position: 0 });
  });

  it('deve lançar erro para código inválido', async () => {
    const input = {
      code: '',
      // ... outros campos
    };

    await expect(useCase.execute(input)).rejects.toThrow('Código de pneu inválido');
  });
});
```

---

### FASE 6: Criar Custom Hooks (3 horas)

**Arquivo**: `/features/tire-conference/application/hooks/useTireConference.ts`

```typescript
import { useState, useCallback, useMemo } from 'react';
import { TireSet, ChassisContext, TireData } from '../../domain/types';
import { ScanTireUseCase } from '../use-cases/ScanTireUseCase';
import { TireCheckRepository } from '../../infrastructure/repositories/TireCheckRepository';
import { toast } from 'sonner';

export const useTireConference = (
  chassisNumber: string,
  chassisContext: ChassisContext,
  sessionId: string,
  userId: string,
  userName: string
) => {
  const [tireSets, setTireSets] = useState<TireSet[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  // Instancia use case (poderia ser injetado via DI)
  const repository = useMemo(() => new TireCheckRepository(), []);
  const scanUseCase = useMemo(() => new ScanTireUseCase(repository), [repository]);

  const handleScanTire = useCallback(async (
    code: string,
    jogo: number,
    position: number
  ) => {
    setIsScanning(true);

    try {
      const result = await scanUseCase.execute({
        code,
        jogo,
        position,
        chassisNumber,
        chassisContext,
        sessionId,
        userId,
        userName
      });

      // Atualiza estado local
      setTireSets(prev => prev.map(set => {
        if (set.jogo !== jogo) return set;

        return {
          ...set,
          tires: set.tires.map((tire, idx) => 
            idx === position ? result.tire : tire
          )
        };
      }));

      // Feedback
      if (result.validation === 'TROCAR PNEU') {
        toast.error('⚠️ TROCAR PNEU', {
          description: `Pneu ${code} tem divergência`
        });
      } else if (result.validation === 'OK') {
        toast.success('✅ Pneu OK');
      }

      return result;
    } catch (error: any) {
      toast.error('Erro ao escanear pneu', {
        description: error.message
      });
      throw error;
    } finally {
      setIsScanning(false);
    }
  }, [chassisNumber, chassisContext, scanUseCase, sessionId, userId, userName]);

  // Calcula progresso
  const progress = useMemo(() => {
    const total = tireSets.reduce((acc, set) => acc + set.tires.length, 0);
    const scanned = tireSets.reduce((acc, set) => 
      acc + set.tires.filter(t => t.codigo !== '-').length, 0
    );

    return {
      total,
      scanned,
      percentage: total > 0 ? Math.round((scanned / total) * 100) : 0
    };
  }, [tireSets]);

  return {
    tireSets,
    isScanning,
    progress,
    handleScanTire,
    setTireSets
  };
};
```

---

### FASE 7: Refatorar Componente Principal (4 horas)

**Arquivo**: `/features/tire-conference/presentation/ConferirPneusPage.tsx`

```typescript
import { useState } from 'react';
import { useTireConference } from '../application/hooks/useTireConference';
import { TireConferenceTable } from './components/TireConferenceTable';
import { ChassisSelectionModal } from './components/ChassisSelectionModal';

export default function ConferirPneusPage() {
  const [selectedChassis, setSelectedChassis] = useState(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const {
    tireSets,
    isScanning,
    progress,
    handleScanTire
  } = useTireConference(
    selectedChassis?.numero || '',
    {
      piloto: selectedChassis?.piloto || '',
      corrida: selectedChassis?.corrida || ''
    },
    sessionId || '',
    'user-id', // TODO: pegar do contexto
    'User Name' // TODO: pegar do contexto
  );

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Conferir Pneus</h1>

      {!selectedChassis ? (
        <ChassisSelectionModal
          onSelect={setSelectedChassis}
          onSessionCreated={setSessionId}
        />
      ) : (
        <TireConferenceTable
          tireSets={tireSets}
          chassisNumber={selectedChassis.numero}
          isScanning={isScanning}
          progress={progress}
          onScanTire={handleScanTire}
          onClose={() => setSelectedChassis(null)}
        />
      )}
    </div>
  );
}
```

---

## 🎯 CHECKLIST DE MIGRAÇÃO

### ✅ Preparação
- [ ] Criar branch `refactor/modular-architecture`
- [ ] Criar estrutura de pastas
- [ ] Configurar jest para testes
- [ ] Documentar funcionalidades atuais

### ✅ Fase 1: Domain Layer
- [ ] Extrair tipos para `domain/types.ts`
- [ ] Criar `TireValidationRules.ts`
- [ ] Escrever testes unitários das regras
- [ ] Validar que regras funcionam igual ao código atual

### ✅ Fase 2: Infrastructure Layer
- [ ] Criar `TireCheckRepository.ts`
- [ ] Mockar Supabase nos testes
- [ ] Testar todos os métodos do repositório
- [ ] Garantir error handling robusto

### ✅ Fase 3: Application Layer
- [ ] Criar `ScanTireUseCase.ts`
- [ ] Criar `useTireConference.ts`
- [ ] Escrever testes de integração
- [ ] Validar fluxo completo

### ✅ Fase 4: Presentation Layer
- [ ] Separar componentes
- [ ] Criar `TireInputField.tsx`
- [ ] Criar `ValidationBadge.tsx`
- [ ] Testar renderização

### ✅ Fase 5: Migration
- [ ] Migrar função por função incrementalmente
- [ ] Manter código antigo comentado inicialmente
- [ ] Testar cada migração isoladamente
- [ ] QA completo antes de deletar código antigo

### ✅ Fase 6: Cleanup
- [ ] Deletar código antigo
- [ ] Atualizar imports
- [ ] Atualizar documentação
- [ ] Code review final

---

## 📊 MÉTRICAS DE SUCESSO

### Antes
```
ConferirPneus.tsx: 6513 linhas
Complexidade: ~150
Testes: 0
Bugs/mês: ~5
```

### Depois
```
Total de arquivos: ~25
Maior arquivo: ~300 linhas
Complexidade média: ~8
Cobertura de testes: >80%
Bugs/mês: <1
```

---

## 🚨 PONTOS DE ATENÇÃO

1. **Não fazer tudo de uma vez**
   - Migrar incrementalmente
   - Testar após cada fase
   - Manter código antigo até validar

2. **Manter funcionalidades 100% iguais**
   - Não adicionar features novas
   - Não mudar comportamento
   - Apenas refatorar estrutura

3. **Comunicar com time**
   - Avisar sobre mudanças
   - Pedir code reviews frequentes
   - Documentar decisões

4. **Backup e rollback**
   - Commits pequenos e frequentes
   - Tags de versão estáveis
   - Plano de rollback pronto

---

## 🎓 RECURSOS DE APRENDIZADO

### Padrões Utilizados
- **Clean Architecture**: Robert C. Martin
- **Repository Pattern**: Martin Fowler
- **Use Case Pattern**: Uncle Bob
- **Custom Hooks**: React Best Practices

### Livros Recomendados
- "Clean Architecture" - Robert C. Martin
- "Refactoring" - Martin Fowler
- "Domain-Driven Design" - Eric Evans

### Vídeos
- [Clean Architecture in React](https://www.youtube.com/watch?v=...)
- [Testing React Applications](https://www.youtube.com/watch?v=...)

---

**Guia elaborado por: Sistema de IA - Conecta Cup**  
**Versão**: 1.0  
**Última atualização**: 2026-02-25
