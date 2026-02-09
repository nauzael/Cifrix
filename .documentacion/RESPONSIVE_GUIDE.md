# Guía de Clases Responsive - Cifrix

## Breakpoints Optimizados para Laptops

El sistema de diseño de Cifrix ha sido optimizado para proporcionar una mejor experiencia en laptops. Los breakpoints configurados son:

- **sm**: 640px (Móviles grandes)
- **md**: 768px (Tablets)
- **lg**: 1024px (Laptops pequeñas)
- **laptop**: 1366px (Laptops estándar - 1366x768, muy común)
- **xl**: 1280px (Laptops estándar)
- **2xl**: 1536px (Pantallas grandes)

## Optimizaciones Específicas para Móviles

### Prevención de Zoom en iOS
Los inputs tienen un tamaño mínimo de fuente de 16px en móviles para prevenir el zoom automático en iOS.

### Touch Targets
Todos los botones y elementos interactivos tienen un tamaño mínimo de 44x44px (recomendación de Apple) para facilitar la interacción táctil.

### Scroll Suave
El scroll en móviles usa `-webkit-overflow-scrolling: touch` para una experiencia fluida.

### Safe Areas
Soporte para notch y áreas seguras en dispositivos modernos mediante las clases `safe-top`, `safe-bottom`, `safe-left`, `safe-right`.

## Tipografía Responsive

El tamaño base de fuente se ajusta automáticamente según el dispositivo:
- Móviles: 14px
- Tablets: 15px
- Laptops: 16px
- Full HD+: 17px

### Clases de Texto Responsive

```tsx
// Texto pequeño responsive
<p className="text-responsive-sm">Texto pequeño</p>
// xs → sm → base

// Texto base responsive
<p className="text-responsive-base">Texto normal</p>
// sm → base → lg

// Texto grande responsive
<h3 className="text-responsive-lg">Título mediano</h3>
// base → lg → xl → 2xl

// Texto extra grande responsive
<h1 className="text-responsive-xl">Título principal</h1>
// lg → xl → 2xl → 3xl
```

## Padding y Espaciado

### Clases de Padding Responsive

```tsx
// Padding completo responsive
<div className="responsive-padding">
  // p-3 → p-4 → p-6 → p-8 → p-10
</div>

// Padding horizontal responsive
<div className="responsive-padding-x">
  // px-3 → px-4 → px-6 → px-8 → px-10
</div>

// Padding vertical responsive
<div className="responsive-padding-y">
  // py-3 → py-4 → py-6 → py-8 → py-10
</div>
```

### Clases Específicas para Móviles

```tsx
// Padding móvil
<div className="mobile-padding">
  // px-3 py-2
</div>

// Card móvil
<div className="mobile-card">
  // p-4 rounded-xl
</div>

// Botón móvil
<button className="mobile-button">
  // px-4 py-3 text-sm font-semibold rounded-xl
</button>

// Input móvil
<input className="mobile-input">
  // px-4 py-3 text-base rounded-xl
</input>

// Touch target (44x44px mínimo)
<button className="touch-target">
  // min-h-[44px] min-w-[44px]
</button>
```

## Contenedores

### Contenedor Estándar

```tsx
<div className="responsive-container">
  // max-w-7xl con padding responsive
</div>
```

### Contenedor Ancho

```tsx
<div className="responsive-container-wide">
  // max-w-[1600px] con padding responsive
</div>
```

## Grids Responsive

### Grid Estándar

```tsx
<div className="responsive-grid">
  // 1 col → 2 cols (md) → 3 cols (lg) → 4 cols (xl)
</div>
```

### Grid Auto-ajustable

```tsx
<div className="responsive-grid-auto">
  // 1 col → 2 cols (sm) → 3 cols (lg) → 4 cols (xl) → 5 cols (2xl)
</div>
```

## Scroll Horizontal en Móviles

```tsx
// Scroll horizontal suave sin scrollbar visible
<div className="mobile-scroll">
  <div className="flex gap-4">
    {/* Contenido que hace scroll horizontal */}
  </div>
</div>

// Ocultar scrollbar manteniendo funcionalidad
<div className="hide-scrollbar overflow-auto">
  {/* Contenido */}
</div>
```

## Ejemplos de Uso en Componentes

### Dashboard Stats Grid (Optimizado para Móviles)

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 laptop:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 lg:gap-6">
  <div className="bg-white p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl">
    <div className="flex items-center justify-between mb-3 sm:mb-4">
      <div className="size-10 sm:size-12 bg-green-100 rounded-lg sm:rounded-xl">
        <TrendingUp className="size-5 sm:size-6 md:size-7" />
      </div>
      <span className="text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5">+5%</span>
    </div>
    <p className="text-[10px] sm:text-xs md:text-sm">Ingresos</p>
    <h3 className="text-xl sm:text-2xl md:text-3xl">$1,234</h3>
  </div>
</div>
```

### Header Móvil Optimizado

```tsx
<header className="h-14 sm:h-16 px-3 sm:px-4 md:px-8">
  <button className="touch-target p-2">
    <Menu className="size-5 sm:size-6" />
  </button>
  <input className="pl-8 sm:pl-9 md:pl-10 py-2 sm:py-2.5 text-xs sm:text-sm" />
</header>
```

### Cards con Espaciado Responsive

```tsx
<div className="bg-white dark:bg-slate-900 p-4 sm:p-5 lg:p-6 xl:p-8 rounded-xl sm:rounded-2xl">
  <h3 className="text-responsive-lg mb-3 sm:mb-4">Título</h3>
  <p className="text-responsive-sm">Descripción</p>
</div>
```

## Mejores Prácticas para Móviles

1. **Touch Targets**: Usa `touch-target` para botones pequeños
2. **Tamaños Progresivos**: `size-5 sm:size-6 md:size-7` para iconos
3. **Padding Compacto**: `p-4 sm:p-5 md:p-6` en lugar de `p-6`
4. **Texto Escalable**: `text-[10px] sm:text-xs md:text-sm` para labels
5. **Bordes Redondeados**: `rounded-xl sm:rounded-2xl` para suavizar en móviles
6. **Gaps Progresivos**: `gap-3 sm:gap-4 md:gap-5 lg:gap-6`

## Migración de Código Existente

### Antes (No optimizado para móvil)
```tsx
<div className="p-6 rounded-2xl">
  <div className="size-12">
    <Icon className="size-7" />
  </div>
  <h3 className="text-3xl">Título</h3>
</div>
```

### Después (Optimizado para móvil)
```tsx
<div className="p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl">
  <div className="size-10 sm:size-12">
    <Icon className="size-5 sm:size-6 md:size-7" />
  </div>
  <h3 className="text-xl sm:text-2xl md:text-3xl">Título</h3>
</div>
```

## Checklist de Optimización Móvil

- [ ] Todos los botones tienen `touch-target` o `min-h-[44px]`
- [ ] Los inputs tienen `text-base` o mayor en móviles (prevenir zoom iOS)
- [ ] El padding se reduce en móviles (`p-4` en lugar de `p-6`)
- [ ] Los iconos escalan: `size-5 sm:size-6 md:size-7`
- [ ] El texto escala: `text-xs sm:text-sm md:text-base`
- [ ] Los gaps son progresivos: `gap-3 sm:gap-4 md:gap-5`
- [ ] Los bordes son más suaves en móvil: `rounded-xl sm:rounded-2xl`
- [ ] El header tiene altura reducida: `h-14 sm:h-16`

