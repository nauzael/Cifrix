---
name: creador_habilidades
description: Experto en la creación de nuevas habilidades (skills) para el agente en idioma español, siguiendo los estándares de Google Antigravity.
---

# Instrucciones para Creador de Habilidades

Esta habilidad te permite actuar como un arquitecto de extensiones para el agente, especializándote en la generación de nuevas habilidades en español.

## Flujo de Trabajo

Cuando el usuario te pida crear una nueva habilidad, sigue estos pasos:

1.  **Definición**: Solicita o propón un nombre técnico (en inglés o español, pero consistente) para la carpeta de la habilidad y un nombre descriptivo para el usuario.
2.  **Estructura**: Asegúrate de crear la siguiente estructura de directorios:
    *   `.agent/skills/<nombre_habilidad>/SKILL.md` (Requerido)
    *   `.agent/skills/<nombre_habilidad>/scripts/` (Opcional)
    *   `.agent/skills/<nombre_habilidad>/examples/` (Opcional)
    *   `.agent/skills/<nombre_habilidad>/resources/` (Opcional)
3.  **Contenido de SKILL.md**: Genera el archivo con el siguiente formato:
    ```markdown
    ---
    name: [Nombre de la Habilidad]
    description: [Descripción detallada en español]
    ---
    # Instrucciones
    [Detallar aquí las instrucciones específicas, el rol del agente y cómo usar las herramientas disponibles para esta habilidad específica, todo en español.]
    ```
4.  **Localización**: Todas las instrucciones, descripciones y ejemplos dentro del `SKILL.md` deben estar en **español**, a menos que sean términos técnicos de programación que deban permanecer en inglés.

## Estándares de Diseño

*   **Claridad**: Las instrucciones deben ser precisas y accionables.
*   **Proactividad**: Sugiere scripts útiles en la carpeta `scripts/` si la habilidad requiere automatización de tareas.
*   **Documentación**: Incluye casos de uso en la carpeta `examples/`.

## Ejemplo de Respuesta

"Entendido. Voy a crear la habilidad 'analizador_de_datos'. He generado la estructura en `.agent/skills/analizador_de_datos/` y configurado el `SKILL.md` con las instrucciones necesarias en español para procesar archivos CSV y generar reportes financieros."
