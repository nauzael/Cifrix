# 🔐 Configuración de Secrets para GitHub Actions

Este documento te guiará para configurar los secrets necesarios en GitHub.

## 📝 Secrets Requeridos

### Para Deploy en Vercel (Recomendado)

| Secret | Descripción | Cómo obtenerlo |
|--------|-------------|----------------|
| `VERCEL_TOKEN` | Token de autenticación de Vercel | [vercel.com/account/tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | ID de tu organización en Vercel | URL: `vercel.com/{ORG_ID}/...` |
| `VERCEL_PROJECT_ID` | ID del proyecto en Vercel | URL: `vercel.com/{ORG_ID}/{PROJECT_ID}` |

### Para Security Scanning (Opcional)

| Secret | Descripción | Cómo obtenerlo |
|--------|-------------|----------------|
| `SNYK_TOKEN` | Token para Snyk security scan | [snyk.io/integrations](https://snyk.io/integrations) |

### Para Notificaciones (Opcional)

| Secret | Descripción | Cómo obtenerlo |
|--------|-------------|----------------|
| `DISCORD_WEBHOOK` | Webhook de Discord | Server Settings > Integrations > Webhooks |
| `SLACK_WEBHOOK` | Webhook de Slack | Slack Apps > Incoming Webhooks |

## 🛠️ Pasos para Configurar

### Paso 1: Ir a Settings del Repositorio

1. Abre tu repositorio en GitHub
2. Haz clic en **Settings** (pestaña superior)
3. En el sidebar izquierdo, haz clic en **Secrets and variables** > **Actions**

### Paso 2: Agregar Secrets

Haz clic en **New repository secret** y agrega:

```
Name: VERCEL_TOKEN
Value: tu_token_de_vercel_aqui
```

```
Name: VERCEL_ORG_ID
Value: tu_org_id_aqui
```

```
Name: VERCEL_PROJECT_ID
Value: tu_project_id_aqui
```

### Paso 3: Verificar

Deberías ver algo como:

```
Repository secrets:
  VERCEL_TOKEN      ••••••••••••••••
  VERCEL_ORG_ID     ••••••••••••••••
  VERCEL_PROJECT_ID ••••••••••••••••
```

## 📋 Obtener IDs de Vercel

### 1. VERCEL_TOKEN

1. Ve a [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Haz clic en **Create**
3. Dale un nombre (ej: `github-actions`)
4. Copia el token generado
5. **Importante:** Solo se muestra una vez

### 2. VERCEL_ORG_ID

1. Ve a tu dashboard en Vercel
2. Selecciona tu organización
3. Mira la URL: `https://vercel.com/{ORG_ID}/...`
4. El ORG_ID es la parte después de `vercel.com/`

Ejemplo:
```
URL: https://vercel.com/team_KRaFfOe8UEJ2wxh5eekQG7f6/dashboard
ORG_ID: team_KRaFfOe8UEJ2wxh5eekQG7f6
```

### 3. VERCEL_PROJECT_ID

1. Ve al proyecto en Vercel
2. La URL es: `https://vercel.com/{ORG_ID}/{PROJECT_ID}`
3. El PROJECT_ID es la parte final

Ejemplo:
```
URL: https://vercel.com/team_KRaFfOe8UEJ2wxh5eekQG7f6/cifrix
PROJECT_ID: cifrix
```

## 🔍 Verificar Configuración

Después de agregar los secrets, puedes verificar que el workflow funciona:

1. Ve a la pestaña **Actions** en GitHub
2. Selecciona el workflow **CI - Continuous Integration**
3. Haz clic en **Run workflow** (si está disponible)
4. Revisa los logs para confirmar que todo está correcto

## 🚨 Solución de Problemas

### Error: "No default is applied in non-interactive mode"

**Causa:** Falta el secret `VERCEL_ORG_ID` o `VERCEL_PROJECT_ID`

**Solución:**
```bash
# Asegúrate de tener ambos secrets configurados
VERCEL_ORG_ID=team_xxx
VERCEL_PROJECT_ID=cifrix
```

### Error: "Project names can be up to 100 characters..."

**Causa:** El nombre del proyecto en Vercel es inválido

**Solución:**
1. Ve a Vercel
2. Project Settings > General
3. Cambia el nombre a algo válido (solo minúsculas, números, guiones)

### Error: "Provide --scope or --team explicitly"

**Causa:** Falta el scope en el deploy

**Solución:**
Asegúrate de que el workflow use:
```yaml
vercel --prod --scope ${{ secrets.VERCEL_ORG_ID }}
```

## 📚 Recursos Adicionales

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Vercel Tokens](https://vercel.com/docs/concepts/projects/rest-api/vercel-tokens)
- [Vercel GitHub Integration](https://vercel.com/docs/concepts/deployments/integrations/github)

---

**¿Necesitas ayuda?** Revisa el [README.md](.github/workflows/README.md) para más detalles.
