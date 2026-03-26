# Diseño: Importación de PUC desde Excel
**Fecha:** 2026-03-26

## Objetivos
Permitir a los usuarios cargar su propio Plan Único de Cuentas (PUC) a la plataforma Cifrix desde un archivo Excel (`.xlsx` o `.xls`) utilizando una plantilla estricta en la configuración de la organización. El enfoque de inserción será "Incremental e Ignorar Duplicados".

## 1. Arquitectura de Interfaz
Se expandirá el componente actual `PUCManager.tsx`:
- Nuevo botón `Importar Excel` en el header principal, junto a `Cargar Universal` y `Optimizar`.
- Nuevo componente/modal `PUCImportModal.tsx` o un modal interno en el propio `PUCManager` que solicitará al usuario subir el archivo.
- En este Modal habrá un enlace para descargar la plantilla de ejemplo `Plantilla_PUC.xlsx`.

## 2. Formato de la Plantilla
Las columnas obligatorias que debe contener el archivo en su primera fila (Cabecera) son:
1. **Código:** Numérico (ej. 110505).
2. **Nombre:** Texto (ej. Caja General).
3. **Clase:** Valores permitidos: `ACTIVO | PASIVO | PATRIMONIO | INGRESO | EGRESO`.
4. **Naturaleza:** Valores permitidos: `DEBITO | CREDITO`.
5. **Recibe_Movimientos:** Valores permitidos: `SI | NO` (SI si puede tener transacciones contables, NO si es cuenta padre/agrupación).

## 3. Lógica de Flujo de Datos
- **Procesamiento de Archivo Local:** Utilizando la librería `xlsx`, se parseará la hoja principal (`Sheet1`) convirtiéndola a JSON. Todo ocurre en el cliente.
- **Validación Estricta:**
  - Si falta alguna columna obligatoria, la operación falla inmediatamente.
  - Se revisará cada fila para verificar que los valores de Clase, Naturaleza y Recibe Movimientos entren dentro de las enumeraciones esperadas. Si hay entradas inválidas de formato, se rechaza la importación alertando sobre qué celda tiene error.
- **Cálculo Topológico de Jerarquías (Padres):**
  - Para cada registro del Excel a importar, el sistema buscará el código más cercano existente en la base de datos O en el propio archivo del nivel superior, para asignarlo como `parent_id`. Por ejemplo, la cuenta 110505 buscará a su padre 1105.
- **Inserción Incremental (Filtro Anti-Duplicados):**
  - Obtendremos las cuentas de IndexedDB mediante Dexie (`db.accounts.where('organization_id')`).
  - Crearemos un Set de códigos existentes.
  - Todo código del Excel que este en el Set, será descartado.
- **Batch Transaction:**
  - Las nuevas cuentas se guardarán en una sola transacción `db.transaction('rw', db.accounts)` para optimizar rendimiento.

## 4. Escenarios de Error Manejados
- **Archivo corrupto o sin extensión xlsx:** Mostramos toast rojo advirtiendo de extensión no válida.
- **Plantilla alterada:** Si las cabeceras no coinciden, notificamos "La estructura del archivo no cumple con la plantilla. Verifique la fila 1".
- **Sin cuentas a ingresar:** Si el archivo solo tiene cuentas que el usuario ya ha creado y todas caen en el Filtro Anti-Duplicados, mostramos toast "Todas las cuentas ya existían y fueron ignoradas".
