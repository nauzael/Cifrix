# Contribuyendo a Cifrix

Primero, ¡**gracias por contribuir**! Todas las contribuciones son bienvenidas y apreciadas.

---

## 📋 Tabla de Contenidos

1. [Código de Conducta](#código-de-conducta)
2. [Instalación del Entorno](#instalación-del-entorno)
3. [Convenciones de Código](#convenciones-de-código)
4. [Proceso de Trabajo](#proceso-de-trabajo)
5. [Commits y Pull Requests](#commits-y-pull-requests)
6. [Testing](#testing)
7. [Documentación](#documentación)
8. [Preguntas Frecuentes](#preguntas-frecuentes)

---

## 🤝 Código de Conducta

- Sé respetuoso con otros contribuyentes
- Sé inclusivo y acogedor
- Enfócate en lo mejor para la comunidad
- Reporta comportamiento inapropiado a través de issues privados

---

## 🛠️ Instalación del Entorno

### Requisitos

- Node.js 18.0.0+
- npm 8+ o yarn 3+
- Git
- Editor de código (VS Code recomendado)

### Configuración Inicial

```bash
# 1. Fork y clona el repositorio
git clone https://github.com/TU_USUARIO/Cifrix.git
cd Cifrix

# 2. Agrega el repositorio original como upstream
git remote add upstream https://github.com/nauzael/Cifrix.git

# 3. Instala dependencias
npm install

# 4. Crea archivo .env.local
cp .env.example .env.local

# 5. Configura las credenciales de Supabase
# Edita .env.local con tus valores

# 6. Inicia el servidor de desarrollo
npm run dev

# 7. Verifica que todo funciona
npm test
```

### Configuración de VS Code (Recomendado)

Extensiones útiles:
- **ES7+ React/Redux/React-Native snippets** (dsznajder.es7-react-js-snippets)
- **ESLint** (dbaeumer.vscode-eslint)
- **Prettier** (esbenp.prettier-vscode)
- **TypeScript Vue Plugin** (Vue.volar)
- **Thunder Client** (rangav.vscode-thunder-client) - Testing de APIs

Configuración recomendada en `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

---

## 🎨 Convenciones de Código

### Estructura de Directorios

```
src/
├── components/        # Componentes React
│   ├── accounting/    # Módulo de contabilidad
│   ├── invoicing/     # Módulo de facturación
│   ├── renta/        # Módulo de renta
│   ├── exogenos/     # Reportes exógenos
│   ├── ui/           # Componentes de UI reutilizables
│   ├── layout/       # Layout y estructura
│   └── ...
├── hooks/            # Custom React hooks
├── lib/              # Funciones utilitarias
│   ├── db.ts         # Operaciones de DB
│   ├── sync.ts       # Lógica de sincronización
│   └── ...
├── pages/            # Páginas principales
├── types/            # Tipos TypeScript
├── services/         # Servicios y APIs
├── store/            # Estado global (Zustand)
├── utils/            # Utilidades
└── main.tsx          # Punto de entrada
```

### Convenciones de Nombres

**Componentes React:**
```typescript
// ✅ Correcto - PascalCase
export function DashboardCard() {}
export const AccountingModule = () => {}

// ❌ Incorrecto
export const dashboardCard = () => {}
export function accounting_module() {}
```

**Variables y Funciones:**
```typescript
// ✅ Correcto - camelCase
const userName = "John"
function calculateTotal() {}

// ❌ Incorrecto
const user_name = "John"
function calculate_total() {}
```

**Constantes:**
```typescript
// ✅ Correcto - UPPER_CASE
const API_TIMEOUT = 30000
const DEFAULT_SYNC_INTERVAL = 180000

// ❌ Incorrecto
const apiTimeout = 30000
```

**Interfaces y Types:**
```typescript
// ✅ Correcto
interface IAccountingEntry {}
type AccountStatus = 'active' | 'inactive'

// ❌ Incorrecto
type accounting_entry = {}
interface accountStatus {}
```

### Estilo de Código

Usamos **ESLint** y **Prettier** para mantener consistencia.

**Comando para verificar:**
```bash
npm run lint
```

**Comando para autoformato:**
```bash
npx prettier --write src/
```

**Reglas principales:**
- Semicolons: Requeridos
- Comillas: Dobles (`"`)
- Indentación: 2 espacios
- Longitud máxima de línea: 100 caracteres (guideline)
- Imports: Organizados alfabéticamente por grupo

**Ejemplo de código bien formateado:**
```typescript
import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useAsync } from '@/hooks/useAsync'
import { calculateTotal } from '@/lib/utils'

interface IProps {
  data: IData[]
  onSubmit: (data: IData) => Promise<void>
}

export function DataForm({ data, onSubmit }: IProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { error, execute } = useAsync(onSubmit)

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      await execute(data)
    } catch (err) {
      console.error('Error submitting data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Button onClick={handleSubmit} disabled={isLoading}>
        {isLoading ? 'Loading...' : 'Submit'}
      </Button>
      {error && <p className="text-red-500">{error.message}</p>}
    </div>
  )
}
```

---

## 🔄 Proceso de Trabajo

### 1. Elige qué trabajar

- Ve a [Issues](https://github.com/nauzael/Cifrix/issues)
- Busca issues con etiqueta `good first issue` o `help wanted`
- Comenta en el issue que quieres trabajar en él
- Espera confirmación del maintainer

### 2. Crea una rama

```bash
# Actualiza tu fork
git fetch upstream
git checkout upstream/main

# Crea una rama con naming descriptivo
git checkout -b feature/nombre-caracteristica
# o
git checkout -b fix/nombre-del-fix
# o
git checkout -b docs/nombre-documentacion
```

**Prefijos de rama:**
- `feature/` - Nueva característica
- `fix/` - Bug fix
- `docs/` - Documentación
- `refactor/` - Refactorización de código
- `test/` - Tests
- `chore/` - Tareas de mantenimiento

### 3. Desarrolla

```bash
# Asegúrate de tener dependencias actualizadas
npm install

# Corre servidor de desarrollo
npm run dev

# En otra terminal, corre tests
npm test:watch
```

### 4. Prueba localmente

```bash
# Lint
npm run lint

# Tests
npm test

# Build
npm run build

# Preview del build
npm run preview
```

### 5. Commit

Ver sección [Commits y Pull Requests](#commits-y-pull-requests)

### 6. Push y Pull Request

```bash
# Push a tu fork
git push origin feature/nombre-caracteristica

# Ve a GitHub y abre un PR
```

---

## 💾 Commits y Pull Requests

### Convención de Commits

Usamos **Conventional Commits** para mantener un historial limpio:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types disponibles:**
- `feat` - Nueva característica
- `fix` - Bug fix
- `docs` - Cambios de documentación
- `style` - Cambios de formato (espacios, etc)
- `refactor` - Refactorización sin cambiar funcionamiento
- `test` - Agregar o actualizar tests
- `chore` - Cambios en build, dependencies, etc
- `perf` - Mejoras de performance

**Scopes disponibles:**
- `accounting` - Módulo de contabilidad
- `invoicing` - Módulo de facturación
- `renta` - Módulo de declaración de renta
- `exogenos` - Reportes exógenos
- `diezmos` - Módulo eclesiástico
- `sync` - Sincronización offline
- `auth` - Autenticación
- `ui` - Componentes de UI
- `db` - Base de datos
- `core` - Core functionality

**Ejemplos válidos:**
```bash
git commit -m "feat(accounting): add new chart account types"
git commit -m "fix(sync): resolve conflict detection bug"
git commit -m "docs(contributing): improve setup instructions"
git commit -m "test(invoicing): add invoice generation tests"
git commit -m "refactor(ui): simplify button component"
git commit -m "perf(sync): optimize offline storage queries"
git commit -m "chore(deps): update dependencies"
```

**No válidos:**
```bash
git commit -m "fixed bugs"
git commit -m "Updated code"
git commit -m "work in progress"
```

### Pull Request Template

Cuando abras un PR, completa esta información:

```markdown
## Descripción
Breve descripción de los cambios.

## Tipo de Cambio
- [ ] 🐛 Bug fix
- [ ] ✨ Nueva característica
- [ ] 📚 Documentación
- [ ] 🎨 Refactoring
- [ ] ⚡ Performance

## Cambios
- Cambio 1
- Cambio 2

## Issues Relacionados
Closes #123

## Checklist
- [ ] He seguido las guías de estilo del proyecto
- [ ] He ejecutado `npm run lint` sin errores
- [ ] He ejecutado `npm test` y todos pasan
- [ ] He actualizado la documentación si aplica
- [ ] Mis cambios no generan nuevos warnings

## Testing
Describe cómo se pueden probar los cambios.

## Screenshots (si aplica)
Agregar screenshots de cambios visuales.
```

### Revisión de PR

**Qué esperar:**
1. Un maintainer hará review de tu código
2. Puede solicitar cambios
3. Cuando todo esté bien, se hará merge

**Cómo responder a feedback:**
- Agradece el feedback
- Haz los cambios solicitados
- Push de nuevos commits (no amend)
- Responde a los comentarios

---

## 🧪 Testing

### Ejecutar Tests

```bash
# Tests una sola vez
npm test

# Tests en modo watch (rerun on file change)
npm test:watch

# Coverage report
npm test:coverage
```

### Escribir Tests

Usa **Vitest** + **Testing Library**:

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/Button'

describe('Button Component', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick handler when clicked', async () => {
    const handleClick = vitest.fn()
    render(<Button onClick={handleClick}>Click</Button>)
    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalled()
  })
})
```

**Requerimientos:**
- Todo nuevo feature debe incluir tests
- Cobertura mínima: 70%
- Tests deben pasar antes de merge

---

## 📚 Documentación

### Actualizar README

Si tu cambio afecta la instalación o uso:
1. Actualiza [README.md](README.md)
2. Agrega ejemplos claros
3. Explica cualquier nueva variable de entorno

### Agregar Documentación Técnica

Para cambios arquitectónicos complejos:
1. Crea archivo en `docs/technical/`
2. Incluye diagramas si aplica
3. Documenta decisiones y trade-offs

### Cambios de API

Si cambias APIs públicas:
1. Actualiza JSDoc comments
2. Actualiza tipos TypeScript
3. Documenta breaking changes en PR

---

## 📋 Checklist para Contribuidores

Antes de abrir un PR, verifica:

- [ ] He creado una rama descriptiva
- [ ] Mi código sigue las convenciones del proyecto
- [ ] He ejecutado `npm run lint` sin errores
- [ ] He ejecutado `npm test` y todos pasan
- [ ] He actualizado la documentación si aplica
- [ ] Mis commits siguen Conventional Commits
- [ ] Mi PR tiene descripción clara
- [ ] He agregado tests para cambios nuevos
- [ ] No hay console.log() de debug sin propósito
- [ ] He rebasado con `upstream/main` si hay conflictos

```bash
# Rebase final antes de push
git fetch upstream
git rebase upstream/main
git push --force-with-lease origin feature/nombre
```

---

## ❓ Preguntas Frecuentes

### P: ¿Por dónde empiezo?
**R:** Ve a [Issues](https://github.com/nauzael/Cifrix/issues), busca `good first issue`, y comenta que quieres trabajar en él.

### P: ¿Cuánto tiempo tarda la revisión?
**R:** Usualmente 24-48 horas, pero puede variar según la complejidad.

### P: ¿Necesito hacer un issue antes de un PR?
**R:** Para features pequeñas no, pero para cambios grandes sí. Abre un issue primero para discutir.

### P: ¿Cómo reporto un bug?
**R:** Abre un [Issue](https://github.com/nauzael/Cifrix/issues/new) con:
- Descripción clara
- Pasos para reproducir
- Comportamiento esperado vs actual
- Ambiente (OS, navegador, Node version)

### P: ¿Dónde pregunto si no sé qué hacer?
**R:** Puedes:
1. Comentar en el Issue
2. Abrir una [Discussion](https://github.com/nauzael/Cifrix/discussions)
3. Contactar a través de un Issue privado

### P: ¿Mi PR fue rechazado, qué hago?
**R:** No es rechazo personal:
1. Lee el feedback cuidadosamente
2. Pregunta si algo no está claro
3. Haz los cambios sugeridos
4. Push de nuevos commits

### P: ¿Se pagan las contribuciones?
**R:** Este es un proyecto open source voluntario. Las contribuciones son por pasión y comunidad, pero tu trabajo será reconocido y apreciado.

### P: ¿Puedo contribuir sin programar?
**R:** ¡Claro! Puedes:
- Reportar bugs
- Mejorar documentación
- Sugerir features
- Ayudar a otros en discussions

---

## 🎓 Recursos Útiles

- [GitHub Docs - Contributing](https://docs.github.com/en/github/getting-started-with-github/finding-ways-to-contribute-to-open-source-on-github)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [React Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Vitest Docs](https://vitest.dev/)

---

## 📞 Preguntas?

- 💬 Abre una [Discussion](https://github.com/nauzael/Cifrix/discussions)
- 🐛 Reporta un bug en [Issues](https://github.com/nauzael/Cifrix/issues)
- 📧 Contacta al mantenedor vía GitHub

---

<div align="center">

**¡Gracias por contribuir a Cifrix!**

Happy coding 💻

</div>

## Código de Conducta

Por favor sé respetuoso y considerado con otros contribuyentes. El acoso o discriminación no será tolerado.

## ¿Cómo Empezar?

### 1. Fork el Repositorio

```bash
# En GitHub: Click en "Fork"
# Luego clona tu fork
git clone https://github.com/YOUR_USERNAME/Cifrix.git
cd Cifrix
```

### 2. Agrega Upstream

```bash
# Mantén tu fork sincronizado
git remote add upstream https://github.com/nauzael/Cifrix.git
```

### 3. Crea una Rama

```bash
# Actualiza main
git fetch upstream
git checkout main
git merge upstream/main

# Crea tu rama de feature
git checkout -b feature/descripcion-clara
```

**Nombres de rama recomendados:**
- `feature/nueva-funcionalidad`
- `fix/descripcion-del-bug`
- `docs/actualizacion-documentacion`
- `test/mejoras-testing`

## Configuración de Desarrollo

### Instalación

```bash
# Instalar dependencias
npm install

# Crear archivo .env.local
cp .env.example .env.local
```

### Editar .env.local

Solicita credenciales de desarrollo en Issues si es necesario.

### Verificar Setup

```bash
# Type checking
npm run check

# Linting
npm run lint

# Tests
npm test
```

## Convenciones de Código

### TypeScript & Componentes

```typescript
// ✅ BIEN - Nombres claros, tipos explícitos
interface UserProfile {
  id: string;
  name: string;
  email: string;
}

const UserCard: React.FC<{ user: UserProfile }> = ({ user }) => {
  return <div>{user.name}</div>;
};

// ❌ MAL - Nombres genéricos, sin tipos
const UserCard = ({ u }) => {
  return <div>{u.name}</div>;
};
```

### Hooks Personalizados

```typescript
// ✅ BIEN
const useUserProfile = (userId: string) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  useEffect(() => {
    // Lógica aquí
  }, [userId]);
  
  return profile;
};

// ❌ MAL
const getFn = () => { /* ... */ };
```

### Estilos Tailwind

```tsx
// ✅ BIEN - Clases organizadas, responsive
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Contenido */}
</div>

// ❌ MAL - Clases desordenadas
<div className="gap-4 md:grid-cols-2 grid grid-cols-1 lg:grid-cols-3">
  {/* Contenido */}
</div>
```

### Funciones Async

```typescript
// ✅ BIEN - Manejo de errores explícito
const fetchData = async (): Promise<Data> => {
  try {
    const response = await api.get('/data');
    return response.data;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw new Error('Failed to fetch data');
  }
};

// ❌ MAL - Sin manejo de errores
const fetchData = async () => {
  const response = await api.get('/data');
  return response.data;
};
```

### Validación Zod

```typescript
// ✅ BIEN - Validación explícita
const UserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().optional(),
});

type User = z.infer<typeof UserSchema>;

// ❌ MAL - Sin validación
const user = JSON.parse(data);
```

## Commits y Mensajes

Usa **Conventional Commits** para mensajes claros:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Tipos de Commit

- `feat:` Nueva funcionalidad
- `fix:` Bug fix
- `docs:` Cambios de documentación
- `style:` Cambios de formato (no cambio de lógica)
- `refactor:` Refactorización de código
- `test:` Agregar o actualizar tests
- `chore:` Cambios de dependencias, config, etc

### Ejemplos

```bash
# Feature nueva
git commit -m "feat(accounting): add journal entry validation"

# Bug fix
git commit -m "fix(sync): handle network timeout gracefully"

# Documentación
git commit -m "docs(readme): update installation instructions"

# Tests
git commit -m "test(auth): add offline authentication tests"

# Refactor
git commit -m "refactor(db): optimize dexie queries"
```

## Pull Requests

### Antes de Abrir un PR

1. **Actualiza tu rama**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Verifica que todo pase**
   ```bash
   npm run check    # Type check
   npm run lint     # Linting
   npm test         # Tests
   npm run build    # Build
   ```

3. **Escribe commits limpios**
   ```bash
   git log --oneline  # Verifica que sean descriptivos
   ```

### Abriendo el PR

**Título:**
- `feat: Agregar validación de movimientos contables`
- `fix: Corregir sincronización offline`
- `docs: Actualizar guía de instalación`

**Descripción:**

```markdown
## Descripción
Breve descripción de qué hace este PR.

## Tipo de Cambio
- [ ] Bug fix
- [ ] Nueva funcionalidad
- [ ] Breaking change
- [ ] Cambio de documentación

## ¿Cómo Testear?
Pasos para probar los cambios:
1. ...
2. ...

## Checklist
- [ ] Mi código sigue las convenciones del proyecto
- [ ] He actualizado la documentación relevante
- [ ] He agregado tests para mis cambios
- [ ] Todos los tests pasan localmente
- [ ] Mi código no introduce warnings de linting
```

## Testing

### Ejecutar Tests

```bash
# Modo watch
npm run test:watch

# Coverage
npm run test:coverage

# Test específico
npm test -- path/to/test.test.ts
```

### Escribir Tests

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { calculateTotal } from '../lib/utils';

describe('calculateTotal', () => {
  it('should sum array of numbers', () => {
    const result = calculateTotal([1, 2, 3]);
    expect(result).toBe(6);
  });

  it('should return 0 for empty array', () => {
    const result = calculateTotal([]);
    expect(result).toBe(0);
  });
});
```

**Regla:** Las nuevas funcionalidades deben incluir tests.

## Preguntas?

- 📖 Lee [README.md](README.md)
- 📚 Revisa [docs/](docs/)
- 💬 Abre una Discussión en GitHub
- 📧 Contacta al maintainer

---

**¡Gracias por contribuir a Cifrix! 🎉**
