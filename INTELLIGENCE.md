# Cifrix Intelligence System

Sistema avanzado de optimización, aprendizaje y orquestación para el programa contable Cifrix.

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                    Intelligence Orchestrator                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │    Token    │  │   Memory    │  │    Continuous Learning   │ │
│  │ Optimization│  │ Persistence │  │                          │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ Verification│  │Paralleliza- │  │  Subagent Orchestration  │ │
│  │    Loops    │  │    tion     │  │                          │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Módulos

### 1. Token Optimization (`token-optimizer.ts`)

Sistema de optimización de contexto para reducir el uso de tokens.

**Características:**
- Análisis de contenido (tokens, palabras, líneas)
- Priorización de secciones por importancia
- Compresión inteligente de contexto
- Historial de compresión

**Uso:**
```typescript
import { tokenOptimizer } from '@/lib/intelligence';

const analysis = tokenOptimizer.analyze("contenido a analizar");
// { tokens: number, words: number, lines: number }

const budget = tokenOptimizer.getBudget();
// { maxTokens, currentUsage, reservedForResponse, compressionRatio }

const available = tokenOptimizer.getAvailableForContext();
const compressed = tokenOptimizer.compress(context, available);
```

### 2. Memory Persistence (`memory-persistence.ts`)

Sistema de persistencia de memoria para mantener contexto entre sesiones.

**Características:**
- Almacenamiento en localStorage
- TTL configurable (30 días por defecto)
- Máximo 1000 entradas
- Sistema de confianza por acceso
- Query por tipo, prefijo, confianza mínima

**Uso:**
```typescript
import { memoryPersistence } from '@/lib/intelligence';

// Guardar valor
memoryPersistence.set('user_preference', { theme: 'dark' }, {
  type: 'preference',
  confidence: 0.9,
  ttl: 30 * 24 * 60 * 60 * 1000 // 30 días
});

// Obtener valor
const value = memoryPersistence.get('user_preference');

// Query avanzada
const patterns = memoryPersistence.query({
  type: 'learning',
  minConfidence: 0.7,
  limit: 10
});

// Estadísticas
const stats = memoryPersistence.getStats();
// { totalEntries, byType, averageConfidence, oldestEntry, newestEntry }
```

### 3. Continuous Learning (`continuous-learning.ts`)

Sistema de aprendizaje continuo que mejora basado en interacciones.

**Características:**
- Registro de patrones de ejecución
- Feedback de éxito/fallo
- Tasa de aprendizaje configurable
- Decaimiento de confianza
- Tasa de exploración para descubrimiento

**Uso:**
```typescript
import { continuousLearning } from '@/lib/intelligence';

// Registrar un patrón
const patternId = continuousLearning.registerPattern({
  name: 'Validación de Asiento',
  description: 'Patrón para verificar asientos contables',
  trigger: 'journal_entry_validation',
  action: 'verify_double_entry',
  context: { accountTypes: ['ACTIVO', 'PASIVO'] }
});

// Registrar ejecución
await continuousLearning.recordExecution(patternId, { 
  transactionId: 'tx123',
  balance: 5000000 
});

// Recibir feedback
await continuousLearning.receiveFeedback({
  patternId,
  success: true,
  context: { verificationTime: 150 }
});

// Encontrar patrón coincidente
const pattern = continuousLearning.findMatchingPattern('journal_entry_validation', context);

// Recomendaciones
const recommendations = continuousLearning.getRecommendations(context, 3);
```

### 4. Verification Loops (`verification-loop.ts`)

Sistema de verificación para operaciones contables críticas.

**Características:**
- Verificación de integridad de balance
- Verificación de doble partida
- Validación de naturaleza de cuentas
- Verificación de fechas de transacciones
- Consistencia de años fiscales

**Uso:**
```typescript
import { verificationLoop } from '@/lib/intelligence';

// Verificar todo el sistema
const result = await verificationLoop.verifyAll();
// { verified: boolean, errors: [], warnings: [], metadata: {} }

// Verificar una transacción específica
const txResult = await verificationLoop.verifyTransaction('tx_id');
// { verified: boolean, errors: [], warnings: [], metadata: { entries, iterations } }

// Ejecutar con verificación
const { result, verification } = await verificationLoop.runWithVerification(
  async () => {
    // operación contable
    return await createJournalEntry(tx);
  }
);

if (!verification.verified) {
  console.error('Errores de verificación:', verification.errors);
}
```

**Checks registrados:**
| Check | Crítico | Descripción |
|-------|---------|-------------|
| balance_integrity | ✓ | Verifica saldos positivos en cuentas de patrimonio |
| double_entry | ✓ | Asegura que débitos = créditos |
| account_nature | | Valida naturaleza vs tipo de cuenta |
| transaction_dates | | Detecta transacciones en años cerrados |
| fiscal_year_consistency | ✓ | Consistencia de cierre de año fiscal |

### 5. Parallelization Engine (`parallel-executor.ts`)

Motor de ejecución paralela para tareas concurrentes.

**Características:**
- Cola de tareas con prioridad
- Control de concurrencia (max 5 por defecto)
- Timeout configurable
- Reintentos automáticos
- Graph de dependencias entre tareas

**Uso:**
```typescript
import { parallelExecutor, TaskGraph } from '@/lib/intelligence';

// Encolar tarea individual
const taskId = parallelExecutor.enqueue({
  type: 'generate_report',
  priority: 10,
  timeout: 60000,
  execute: async () => {
    return await generateFinancialReport();
  }
});

// Encolar lote
const taskIds = parallelExecutor.enqueueBatch([
  { type: 'task1', priority: 10, execute: async () => {} },
  { type: 'task2', priority: 5, execute: async () => {} }
]);

// Esperar resultado
const result = await parallelExecutor.waitForTask(taskId, 30000);

// Esperar todos
const allResults = await parallelExecutor.waitForAll();

// Estado
const status = parallelExecutor.getStatus();
// { queueLength, runningCount, completedCount, isProcessing }

// TaskGraph para dependencias
const graph = new TaskGraph();
graph.addNode({ type: 'task1', priority: 10, execute: async () => {}, dependencies: [] });
graph.addNode({ type: 'task2', priority: 5, execute: async () => {}, dependencies: ['task1'] });
const order = graph.getExecutionOrder(); // [[id1], [id2]]
```

### 6. Subagent Orchestration (`subagent-orchestrator.ts`)

Sistema de orquestación de múltiples subagentes especializados.

**Subagentes registrados:**

| ID | Nombre | Rol | Prioridad | Capacidades |
|----|--------|-----|-----------|-------------|
| accounting-agent | Contabilidad | accounting | 10 | balance_sheet, income_statement, journal_entry, closing |
| tax-agent | Impuestos | tax | 9 | renta_declaration, exogenos, dian_integration |
| reports-agent | Reportes | reports | 8 | financial_reports, cash_flow, equity_statement |
| validation-agent | Validación | validation | 10 | transaction_verification, balance_verification |
| general-agent | General | general | 5 | member_management, settings |

**Uso:**
```typescript
import { subagentOrchestrator } from '@/lib/intelligence';

// Dispatch simple
const result = await subagentOrchestrator.dispatchTask(
  'balance_sheet',
  { organizationId: 'org1', date: '2024-12-31' },
  { timeout: 60000 }
);
// { success: boolean, result?: any, error?: Error, agentId?: string }

// Orquestación secuencial
const orchResult = await subagentOrchestrator.orchestrate(
  'Generar Balance y verificaciones',
  [
    { type: 'balance_sheet', payload: { orgId: '1' }, provides: ['balance_data'] },
    { type: 'transaction_verification', payload: {}, requires: ['balance_data'] }
  ]
);

// Orquestación paralela
const parallelResult = await subagentOrchestrator.orchestrateParallel(
  'Generar múltiples reportes',
  [
    { type: 'balance_sheet', payload: {} },
    { type: 'income_statement', payload: {} },
    { type: 'cash_flow', payload: {} }
  ]
);

// Planificar
const plan = subagentOrchestrator.createPlan('Generar Balance', tasks);

// Estado
const status = subagentOrchestrator.getStatus();
// { totalSubagents, idleCount, busyCount, offlineCount, pendingMessages }
```

## Intelligence Orchestrator

Orquestador central que integra todos los módulos.

```typescript
import { intelligenceOrchestrator } from '@/lib/intelligence';

// Inicializar
await intelligenceOrchestrator.initialize();

// Estado
const status = intelligenceOrchestrator.getStatus();
// {
//   initialized: boolean,
//   memory: { entries, avgConfidence },
//   learning: { patterns, avgSuccess },
//   verification: { checks },
//   parallel: { queue, running },
//   agents: { total, idle, busy }
// }

// Ejecutar mantenimiento
const maintenance = await intelligenceOrchestrator.runMaintenance();
// { expiredCleared, decayApplied, verificationPassed }
```

## Configuración

```typescript
const config: IntelligenceConfig = {
  tokenOptimization: {
    enabled: true,
    maxContextTokens: 120000
  },
  memoryPersistence: {
    enabled: true,
    ttlDays: 30
  },
  continuousLearning: {
    enabled: true,
    minConfidenceThreshold: 0.6
  },
  verification: {
    enabled: true,
    maxIterations: 3
  },
  parallelization: {
    enabled: true,
    maxConcurrent: 5
  },
  subagentOrchestration: {
    enabled: true
  }
};

intelligenceOrchestrator.updateConfig({
  parallelization: { maxConcurrent: 10 }
});
```

## Casos de Uso

### 1. Generación de Reportes con Verificación

```typescript
const { result, verification } = await verificationLoop.runWithVerification(
  async () => {
    return await financialReportsService.getBalanceSheet(orgId, date);
  }
);

if (!verification.verified) {
  // Mostrar errores al usuario
  showErrors(verification.errors);
}
```

### 2. Procesamiento Paralelo de Transacciones

```typescript
const transactionIds = await db.transactions.toArray();

parallelExecutor.enqueueBatch(
  transactionIds.map(tx => ({
    type: 'verify_transaction',
    priority: 5,
    execute: async () => {
      return await verificationLoop.verifyTransaction(tx.id);
    }
  }))
);

const results = await parallelExecutor.waitForAll();
```

### 3. Orquestación de Cierre Anual

```typescript
const result = await subagentOrchestrator.orchestrate(
  'Cierre Anual 2024',
  [
    { type: 'transaction_verification', payload: { year: 2024 } },
    { type: 'closing', payload: { year: 2024 }, requires: ['transaction_verification'] },
    { type: 'balance_sheet', payload: { date: '2024-12-31' }, requires: ['closing'] }
  ]
);
```

### 4. Aprendizaje de Patrones de Validación

```typescript
continuousLearning.registerPattern({
  name: 'Validación Doble Partida',
  trigger: 'double_entry_check',
  action: 'verify_transaction_balance'
});

// Después de cada verificación
const pattern = continuousLearning.findMatchingPattern('double_entry_check', context);
if (pattern) {
  await continuousLearning.recordExecution(pattern.id, context);
}
```

## Patrones de Diseño

### Verification Loop Pattern
```typescript
async function verifyTransactionLoop(txId: string, maxIterations = 3): Promise<boolean> {
  for (let i = 0; i < maxIterations; i++) {
    const result = await verificationLoop.verifyTransaction(txId);
    if (result.verified) return true;
    if (i < maxIterations - 1) {
      await reconcileTransaction(txId);
    }
  }
  return false;
}
```

### Parallel with Dependencies Pattern
```typescript
async function processWithDependencies(tasks: Task[]): Promise<Map<string, any>> {
  const graph = new TaskGraph();
  tasks.forEach(t => graph.addNode(t));
  
  const executionOrder = graph.getExecutionOrder();
  const results = new Map();
  
  for (const level of executionOrder) {
    const levelResults = await Promise.all(
      level.map(id => executeTask(tasks.find(t => t.id === id)!))
    );
    levelResults.forEach((r, i) => results.set(level[i], r));
  }
  
  return results;
}
```

### Memory-Enhanced Learning Pattern
```typescript
async function learnFromOperation(
  operationType: string,
  context: any,
  success: boolean
): Promise<void> {
  const key = `pattern_${operationType}`;
  const existing = memoryPersistence.get(key);
  
  if (existing) {
    continuousLearning.updateConfidence(key, success ? 0.1 : -0.1);
  } else {
    const patternId = continuousLearning.registerPattern({
      name: operationType,
      trigger: operationType,
      action: 'process'
    });
    memoryPersistence.set(key, { patternId, context }, { type: 'pattern' });
  }
  
  await continuousLearning.receiveFeedback({ patternId, success });
}
```

## Métricas y Monitorización

```typescript
// Obtener métricas del sistema
const metrics = {
  memory: memoryPersistence.getStats(),
  learning: continuousLearning.getStats(),
  parallel: parallelExecutor.getStatus(),
  agents: subagentOrchestrator.getStatus(),
  orchestrator: intelligenceOrchestrator.getStatus()
};

// Historial de compresiones
const budgetHistory = tokenOptimizer.getBudget();

// Recomendaciones basadas en patrones
const recommendations = continuousLearning.getRecommendations(currentContext);
```
