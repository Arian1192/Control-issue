## Requirements

### Requirement: Stack tecnológico del proyecto
El agente SHALL conocer y aplicar el stack tecnológico oficial del proyecto en todas las decisiones de implementación.

#### Scenario: Agente propone solución de UI
- **WHEN** el agente necesita crear o modificar un componente de interfaz
- **THEN** utiliza ShadCN/UI sobre Radix UI con clases Tailwind CSS, sin añadir otras librerías de componentes

#### Scenario: Agente propone solución de datos
- **WHEN** el agente necesita persistir, consultar o suscribirse a datos
- **THEN** usa el cliente `@supabase/supabase-js` desde `src/lib/supabaseClient.ts`, sin introducir ORMs ni clientes HTTP alternativos

#### Scenario: Agente configura el proyecto desde cero
- **WHEN** el agente inicializa el proyecto
- **THEN** usa `npm create vite@latest` con la plantilla `react-ts`, instala Tailwind CSS v3 con su plugin de Vite, e inicializa ShadCN con `npx shadcn-ui@latest init`

### Requirement: Convenciones de código
El agente SHALL seguir las convenciones de código establecidas para el proyecto.

#### Scenario: Creación de componente React
- **WHEN** el agente crea un componente React
- **THEN** usa PascalCase para el nombre del archivo y del componente, exporta el componente como named export, y coloca un componente por archivo

#### Scenario: Creación de custom hook
- **WHEN** el agente crea un hook reutilizable
- **THEN** el nombre empieza por `use` en camelCase y vive bajo `src/hooks/` o dentro del feature correspondiente

#### Scenario: Tipado TypeScript
- **WHEN** el agente escribe código TypeScript
- **THEN** no usa `any`; si el tipo es desconocido usa `unknown` con type guard explícito

#### Scenario: Orden de clases Tailwind
- **WHEN** el agente aplica clases Tailwind en JSX
- **THEN** las clases siguen el orden de `prettier-plugin-tailwindcss` (layout → spacing → typography → color → estado)

### Requirement: Estructura de carpetas
El agente SHALL respetar la estructura de carpetas `feature-based` definida para el proyecto.

#### Scenario: Añadir nueva funcionalidad
- **WHEN** el agente implementa una nueva funcionalidad
- **THEN** crea o extiende la carpeta correspondiente en `src/features/<nombre-feature>/` con sus propios componentes, hooks y tipos

#### Scenario: Componente compartido
- **WHEN** un componente es usado por más de un feature
- **THEN** se coloca en `src/components/` y no se duplica dentro de features individuales

### Requirement: Mensajes de commit
El agente SHALL generar mensajes de commit siguiendo Conventional Commits.

#### Scenario: Nuevo feature
- **WHEN** el agente realiza un commit de nueva funcionalidad
- **THEN** el mensaje sigue el formato `feat(<scope>): <descripción en minúsculas>`

#### Scenario: Corrección de bug
- **WHEN** el agente realiza un commit de corrección
- **THEN** el mensaje sigue el formato `fix(<scope>): <descripción>`

### Requirement: Seguridad en operaciones Supabase
El agente SHALL garantizar que todas las operaciones de base de datos respetan las políticas RLS y no exponen datos de otros usuarios.

#### Scenario: Consulta con filtro por usuario
- **WHEN** el agente escribe una query a una tabla protegida por RLS
- **THEN** no añade filtros manuales de `user_id` que dupliquen la política RLS; confía en que RLS los aplica automáticamente

#### Scenario: Service role key
- **WHEN** el agente necesita una operación con privilegios elevados (p.ej. en edge function)
- **THEN** usa `SUPABASE_SERVICE_ROLE_KEY` solo en servidor/edge function, nunca en código cliente
