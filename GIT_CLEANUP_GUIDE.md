# 🧹 Guía de Limpieza de Git - Cifrix

**Última actualización:** 28 de Abril, 2026

> ⚠️ **IMPORTANTE:** Lee esto completamente antes de ejecutar comandos. Algunos cambios son irreversibles.

---

## 🔍 Verificación Previa

Antes de hacer cualquier cambio, verifica el estado actual:

```bash
# Ver archivos actualmente trackeados por git
git ls-files | grep -E '\.lcm/|debug_|test_|\.agent/|dev-dist|ts_errors'

# Ver archivos modificados
git status

# Ver tamaño del repositorio
du -sh .git
```

---

## ✅ PASO 1: Actualizar .gitignore (YA HECHO)

El archivo [.gitignore](.gitignore) ya fue mejorado con:
- 70+ reglas organizadas
- Comentarios explicativos
- Cobertura completa de archivos sensibles

**Verificar que está correcto:**
```bash
git check-ignore -v .lcm/
# Output: .lcm/   .gitignore:37
```

---

## 🗑️ PASO 2: Remover Archivos del Tracking

Usa `git rm --cached` para remover archivos **sin eliminarlos localmente**:

### 2.1 Remover Directorio `.lcm/`

```bash
# Remover del tracking (mantiene archivos locales)
git rm --cached -r .lcm/

# Verificar que quedó local
ls -la .lcm/
```

### 2.2 Remover Directorio `.agent/`

```bash
git rm --cached -r .agent/
git rm --cached -r .agents/
git rm --cached -r .documentacion/
git rm --cached -r .trae/
```

### 2.3 Remover Scripts Debug

```bash
# Remover scripts específicos
git rm --cached scripts/debug_auth_users.js
git rm --cached scripts/debug_supabase_rls.js
git rm --cached scripts/test-admin-access.js
git rm --cached scripts/test-supabase.js
git rm --cached scripts/test_insert.js

# Remover archivos de output
git rm --cached scripts/output_exogena.txt
git rm --cached ts_errors.txt
```

### 2.4 Remover Build Artifacts

```bash
git rm --cached -r dev-dist/ --force
```

---

## 📦 PASO 3: Crear Commit de Limpieza

Una vez removidos todos los archivos:

```bash
# Ver qué va a commitearse
git status

# Stage todo
git add .

# Commit con mensaje descriptivo
git commit -m "chore: remove sensitive files from git tracking

- Remove .lcm/ (local database)
- Remove .agent/, .agents/, .documentacion/, .trae/ (IDE configs)
- Remove debug scripts (debug_*.js, test_*.js)
- Remove build artifacts (dev-dist/)
- Remove error logs (ts_errors.txt)
- Updated .gitignore with comprehensive rules

These files are still present locally but now ignored by git.
Future changes to these files won't be tracked."
```

---

## 🔄 PASO 4: Verificar Cambios

```bash
# Ver commit que se hizo
git log -1 --stat

# Verificar que archivos ya no están trackeados
git ls-files | grep -E '\.lcm/|debug_|test_|\.agent'
# Should return nothing (empty)

# Verificar que archivos siguen locales
ls -la .lcm/
ls -la .agent/
```

---

## 🚀 PASO 5: Push a Rama Feature

```bash
# Si no la has creado aún
git checkout -b feature/github-cleanup-docs

# Ver cambios antes de push
git log --oneline origin/main..HEAD

# Push
git push -u origin feature/github-cleanup-docs

# Crear PR
gh pr create \
  --title "chore: GitHub cleanup and documentation" \
  --body "- Remove sensitive files from git tracking
- Add professional documentation (README, CONTRIBUTING)
- Improve .gitignore with comprehensive rules
- Enhance .env.example with all variables

Fixes: nauzael/Cifrix#1" \
  --base main
```

---

## ⚠️ OPCIÓN AVANZADA: Limpiar Historial Completo

**SOLO si hay credenciales en el historial (no es el caso aquí)**

Si necesitas remover archivos del historial completo:

```bash
# ⚠️ ADVERTENCIA: Esto reescribe el historio y es destructivo
# Solo usar si hay credenciales versionadas

git filter-branch --tree-filter 'rm -f .lcm/*' -- --all

# O usar una herramienta más segura:
# brew install bfg
# bfg --delete-files ".lcm/*"
```

**⚠️ NO EJECUTES ESTO A MENOS QUE:**
1. Haya credenciales en el historial (no hay en Cifrix)
2. El repositorio sea nuevo o privado
3. Entiendas que cambiará todos los commits

---

## 🔒 Verificación de Seguridad

Después de limpiar, verifica que no hay datos sensibles:

```bash
# Buscar posibles credenciales en todo el historial
git log --all --full-history -p | grep -i "password\|secret\|key\|token\|credential" || echo "✅ No credentials found"

# Buscar archivos .env en historial
git log --all --full-history --name-only | grep -i "\.env" | grep -v "\.env\.example" || echo "✅ No .env files found"

# Buscar archivos versionados que deberían ignorarse
git log --all --full-history --name-status | grep -E "\.lcm/|debug_|test_" || echo "✅ No sensitive files found"
```

---

## 📋 Checklist de Limpieza

- [ ] Ejecuté `git rm --cached` para cada directorio sensible
- [ ] Creé commit con mensaje descriptivo
- [ ] Verifiqué que `.gitignore` está actualizado
- [ ] Confirmé que archivos siguen locales
- [ ] Ejecuté verificación de seguridad (sin credenciales encontradas)
- [ ] Hice push a rama feature
- [ ] Creé PR en GitHub
- [ ] PR pasó todas las checks
- [ ] PR fue mergeado a main

---

## 🔗 Archivos Relacionados

- [.gitignore](.gitignore) - Configuración completada
- [CLEANUP_PLAN.json](CLEANUP_PLAN.json) - Plan completo
- [CLEANUP_SUMMARY.md](CLEANUP_SUMMARY.md) - Resumen ejecutivo
- [CONTRIBUTING.md](CONTRIBUTING.md) - Guía de contribuciones

---

## ❓ Preguntas Frecuentes

**P: ¿Qué pasa con los archivos locales?**  
R: No se eliminan. `git rm --cached` solo los remueve del tracking de git.

**P: ¿Puedo recuperar los cambios?**  
R: Sí, con `git reset --soft HEAD~1` antes de hacer push.

**P: ¿Qué pasa si ejecuto `git rm` sin `--cached`?**  
R: ¡No hagas eso! Eliminaría los archivos también. Siempre usa `--cached`.

**P: ¿Por qué no usar `git clean -fd`?**  
R: Es más agresivo y puede eliminar archivos que necesitas. `git rm --cached` es más seguro.

---

**Última verificación:** Estado de git limpio, historial seguro, listo para GitHub público.
