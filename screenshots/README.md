# 📸 Screenshots - Cifrix

Este directorio contiene capturas de pantalla del proyecto para uso en documentación y README.

---

## 📋 Cómo Agregar Screenshots

### Paso 1: Tomar Capturas de Pantalla

```bash
# 1. Inicia el servidor de desarrollo
npm run dev

# 2. Navega por la aplicación a través de http://localhost:5174

# 3. Toma capturas usando:
# Opción A: Herramientas del navegador
#   - Chrome/Edge: Ctrl+Shift+S (Cmd+Shift+S en Mac)
#   - Firefox: Ctrl+Shift+S (Cmd+Shift+S en Mac)
#   - Safari: Cmd+Shift+4 (Mac)
#
# Opción B: Herramientas de terceros (recomendado)
#   - Snagit
#   - ShareX
#   - Greenshot
#
# Opción C: Herramientas online
#   - Screenshot.guru
#   - Screenshotify
```

### Paso 2: Optimizar Imágenes

**Requisitos:**
- Formato: PNG (mejor compresión) o JPG
- Tamaño: Máximo 1920x1080 píxeles
- Tamaño de archivo: Máximo 2 MB
- Legibilidad: Texto debe ser legible

**Herramientas de optimización:**
```bash
# Option 1: ImageMagick (CLI)
magick convert input.png -quality 80 -resize 1920x1080 output.png

# Option 2: Squoosh (online)
# https://squoosh.app/

# Option 3: TinyPNG
# https://tinypng.com/
```

### Paso 3: Nombrar Archivos

Usar formato descriptivo: `{modulo}-{numero}.png`

**Ejemplos válidos:**
```
dashboard-1.png          # Panel principal
dashboard-2.png          # Dashboard con gráficos
accounting-1.png         # Módulo de contabilidad
accounting-asientos.png  # Pantalla de asientos
invoicing-1.png          # Módulo de facturación
invoicing-create.png     # Crear factura
renta-1.png              # Declaración de renta
exogenos-1.png           # Reportes exógenos
sync-offline.png         # Modo offline
mobile-dashboard.png     # Vista móvil
```

### Paso 4: Agregar a README

En el [README.md](../README.md), agregar en sección **Screenshots**:

```markdown
### 📸 Screenshots

#### Dashboard Principal
![Dashboard](screenshots/dashboard-1.png)
*Panel principal con resumen de datos*

#### Módulo de Contabilidad
![Contabilidad](screenshots/accounting-1.png)
*Interfaz de asientos contables*

#### Modo Offline
![Offline Mode](screenshots/sync-offline.png)
*Indicador de modo offline*
```

---

## 📸 Screenshots Recomendados

Este es un checklist de las capturas más útiles:

### Onboarding & Autenticación
- [ ] Login inicial
- [ ] Pantalla de bienvenida
- [ ] Registro de usuario
- [ ] Selección de organización

### Dashboard & Principal
- [ ] Dashboard principal con gráficos
- [ ] Dashboard con múltiples widgets
- [ ] Vista móvil del dashboard

### Módulo de Contabilidad
- [ ] Plan de cuentas
- [ ] Crear asiento contable
- [ ] Listado de asientos
- [ ] Reporte de mayor

### Módulo de Facturación
- [ ] Crear factura
- [ ] Listado de facturas
- [ ] Factura generada
- [ ] Exportar PDF

### Módulo de Renta
- [ ] Declaración de renta
- [ ] Cálculo de impuestos
- [ ] Resumen anual

### Reportes Exógenos
- [ ] Reporte de operaciones
- [ ] Exportar en formato DIAN

### Módulo Eclesiástico (Diezmos)
- [ ] Gestión de diezmos
- [ ] Trazabilidad de donaciones

### Característica Offline
- [ ] Indicador offline
- [ ] Sincronización en progreso
- [ ] Conflicto de sincronización resuelto

### Vista Móvil
- [ ] Dashboard en móvil
- [ ] Contabilidad en móvil
- [ ] Formulario responsive

### Configuración & Ajustes
- [ ] Panel de configuración
- [ ] Gestión de usuarios
- [ ] Variables de entorno

---

## 🎨 Especificaciones Técnicas

### Dimensiones Recomendadas

| Uso | Ancho | Alto | Ratio |
|-----|-------|------|-------|
| Desktop Full | 1920 | 1080 | 16:9 |
| Tablet | 1024 | 768 | 4:3 |
| Mobile | 375 | 812 | 9:19 |
| Small preview | 400 | 300 | 4:3 |

### Formatos Aceptados

| Formato | Ventajas | Desventajas |
|---------|----------|------------|
| PNG | Mejor compresión, sin pérdida | Archivo más grande |
| JPG | Archivo más pequeño | Pérdida de calidad, no transparencia |
| WebP | Excelente compresión | No soportado por todos los navegadores |

**Recomendación:** PNG para imágenes con UI, JPG para fotos

### Tamaño de Archivo

- **Ideal:** 100-500 KB
- **Máximo:** 2 MB
- **Mínimo:** 50 KB (evitar demasiado comprimido)

---

## 📝 Plantilla para Describir Screenshots

Cuando agreges screenshots al README, usa este formato:

```markdown
#### [Título Descriptivo]
![Descripción corta](screenshots/nombre.png)
*Texto explicativo: qué se ve, por qué es importante*

**Características mostradas:**
- Característica 1
- Característica 2
- Característica 3
```

**Ejemplo:**
```markdown
#### Asientos Contables
![Pantalla de asientos contables](screenshots/accounting-asientos.png)
*Interfaz para crear y gestionar asientos contables del PUC*

**Características mostradas:**
- Creación de asientos con múltiples líneas
- Validación automática de ecuación contable
- Búsqueda de cuentas por código o nombre
- Guardado en tiempo real
```

---

## 🔐 Consideraciones de Privacidad

**IMPORTANTE:** Antes de agregar screenshots:

- [ ] No contiene datos reales de clientes
- [ ] No muestra credenciales o API keys
- [ ] No contiene información sensible
- [ ] No muestra nombres reales
- [ ] Los datos mostrados son de ejemplo/demo

**Cómo preparar:**
```bash
# 1. Usar datos de demostración en dev
# 2. Bloquear información sensible con herramientas
# 3. Usar mock data en lugar de datos reales
# 4. Verificar antes de publicar
```

---

## 🖼️ Herramientas Útiles

### Captura de Pantalla
- [ShareX](https://getsharex.com/) - Gratis, open source
- [Snagit](https://www.techsmith.com/screen-capture.html) - Pagado
- [Greenshot](https://getgreenshot.org/) - Gratis
- [Built-in Tools](https://www.techsmith.com/blog/how-to-take-a-screenshot/) - Navegadores

### Edición & Anotación
- [Canva](https://www.canva.com/) - Diseño online
- [Photopea](https://www.photopea.com/) - Editor online
- [GIMP](https://www.gimp.org/) - Gratis, desktop

### Compresión
- [TinyPNG](https://tinypng.com/) - Online, excelente compresión
- [Squoosh](https://squoosh.app/) - Google, múltiples formatos
- [ImageMagick](https://imagemagick.org/) - CLI, poderoso

### Animaciones GIF
- [Gifcap](https://gifcap.dev/) - Crear GIFs
- [Screencast-o-Matic](https://screencast-o-matic.com/) - Grabar pantalla

---

## 📊 Estadísticas de Imágenes

Para monitorear el tamaño del repositorio:

```bash
# Ver tamaño de screenshots
du -sh screenshots/

# Contar archivos
ls -1 screenshots/ | wc -l

# Ver archivos más grandes
du -sh screenshots/* | sort -hr | head -10
```

---

## ✅ Checklist para Agregar Screenshots

- [ ] Imagen tomada desde http://localhost:5174 o build de producción
- [ ] Archivo nombrado descriptivamente
- [ ] Tamaño máximo: 2 MB
- [ ] Resolución: máximo 1920x1080
- [ ] Formato: PNG (preferido) o JPG
- [ ] Sin datos sensibles (credenciales, nombres reales)
- [ ] Texto legible, no pixelado
- [ ] Agregado a sección en README.md
- [ ] Con descripción clara
- [ ] Imagen verifica en navegador

---

## 🔄 Actualizar Screenshots

Cuando la UI cambie:

```bash
# 1. Toma nuevas capturas
# 2. Sigue los pasos de agregar screenshots
# 3. Reemplaza archivos antiguos
# 4. Actualiza URLs en README si cambió el nombre
# 5. Abre PR con cambios
```

---

## 📚 Más Información

- [README.md](../README.md) - Documentación principal
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Guía de contribuciones
- [docs/](../docs/) - Documentación técnica

---

<div align="center">

**Gracias por ayudar a documentar Cifrix visualmente**

Happy screenshotting 📸

</div>

### Características
- [ ] `feature-offline.png` - Indicador offline funcionando
- [ ] `feature-sync.png` - Sistema de sincronización
- [ ] `feature-pwa.png` - APP instalada en desktop/mobile
- [ ] `feature-dark-mode.png` - Interfaz en tema oscuro

### Mobile (Responsive)
- [ ] `mobile-dashboard.png` - Dashboard en móvil
- [ ] `mobile-form-input.png` - Formulario en móvil
- [ ] `mobile-menu.png` - Navegación mobile

## Editar Screenshots Existentes

Si encuentras un screenshot desactualizado:

1. **Marca como deprecated** en nombre: `_OLD_dashboard.png`
2. **Reemplázalo** con nueva versión
3. **Actualiza referencia** en README.md

## Herramientas Recomendadas

- **Captura:** Chrome DevTools, Snagit, ShareX
- **Edición:** Figma, Photoshop, GIMP
- **Optimización:** TinyPNG, ImageOptim, pngquant
- **Hosting:** GitHub (este repo)

## Preguntas?

Ver [CONTRIBUTING.md](../CONTRIBUTING.md) para más detalles sobre cómo contribuir.

---

**Última actualización:** 28 de Abril, 2026
