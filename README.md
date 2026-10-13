# Costo3D

Calculadora del costo real y del precio de venta de impresiones 3D, pensada para la **FlashForge AD5X** y para trabajar en **quetzales (Q)**. Funciona 100 % en el navegador: no necesita servidor ni cuentas.

React + TypeScript + Vite · sin librerías pesadas (la gráfica es SVG propio) · datos en `localStorage` · pruebas con Vitest.

## Funciones

- Asistente inicial de 3 pasos; después abre directo el formulario rápido.
- Configuración general con guardado automático y perfiles de filamento (costo real por gramo).
- Formulario rápido: nombre, tiempo, filamento, gramos y piezas. Modo multicolor (hasta 4 filamentos).
- Panel plegable «Costos adicionales» (desglose de gramos con advertencia si no coincide, tiempos activos, empaque, entrega, comisiones y margen propios, notas).
- Resultados: 9 tarjetas, desglose completo y gráfica de composición del costo.
- Mis proyectos: búsqueda, filtro por estado, orden, abrir, editar, duplicar, eliminar (con confirmación), cambiar estado, cotización e informe interno.
- Respaldo JSON con validación y confirmación antes de reemplazar. Borradores automáticos. Modo oscuro. Responsive.

## Ejecutar en Visual Studio Code

1. Instala [Node.js 20 o superior](https://nodejs.org) (incluye `npm`).
2. En VS Code: **Archivo → Abrir carpeta…** y elige la carpeta `costo3d`.
3. Abre la terminal (**Terminal → Nueva terminal**) y ejecuta:

```bash
npm install        # instala dependencias (solo la primera vez)
npm run dev        # servidor de desarrollo
```

4. Abre la dirección que aparece (normalmente `http://localhost:5173`).

Otros comandos:

```bash
npm test           # pruebas unitarias
npm run typecheck  # revisión de tipos
npm run build      # compila a la carpeta dist/ (incluye revisión de tipos)
npm run preview    # prueba la compilación localmente
```

## Estructura

```
costo3d/
├─ index.html · vite.config.ts · tsconfig.json · package.json
├─ .github/workflows/deploy.yml     Publicación automática en GitHub Pages
├─ public/favicon.svg
└─ src/
   ├─ main.tsx · App.tsx · router.ts · styles.css
   ├─ models/types.ts               Modelos: Settings, Filament, Project, CalcResult…
   ├─ calculations/
   │  ├─ calculator.ts              ÚNICO módulo de fórmulas
   │  └─ calculator.test.ts
   ├─ storage/
   │  ├─ StorageRepository.ts       Interfaz (contrato)
   │  ├─ LocalStorageRepository.ts  Implementación actual
   │  ├─ FutureDatabaseRepository.ts Esqueleto para una base de datos (sin conectar)
   │  ├─ index.ts                   Fábrica: decide qué repositorio se usa
   │  ├─ migrations.ts · defaults.ts · validation.ts · backup.ts
   │  └─ storage.test.ts
   ├─ context/AppContext.tsx        Estado global; solo habla con StorageRepository
   ├─ utils/                        Formato, formularios, resumen, ejemplos…
   ├─ components/                   UI reutilizable (campos, diálogos, gráfica, resultados…)
   └─ pages/                        Calculator, Projects, ProjectDetail, Filaments, Settings, Backup, Dashboard, Onboarding, PrintView
```

## Fórmulas (todas en `src/calculations/calculator.ts`)

Los porcentajes se escriben como número (10 = 10 %). Internamente se conserva la precisión completa; el redondeo a 2 decimales es solo para mostrar.

| # | Concepto | Fórmula |
|---|----------|---------|
| 1 | Costo por gramo | (precio de bobina + envío e impuestos) / gramos de la bobina |
| 1 | Filamento usado | gramos consumidos × costo por gramo (se suma por cada color) |
| 2 | Electricidad | (watts / 1000) × horas × precio por kWh |
| 3 | Desgaste | (inversión / vida útil en horas) × horas de impresión |
| 4 | Mantenimiento | desgaste × % de mantenimiento |
| 5 | Mano de obra | minutos activos / 60 × valor de la hora (solo preparación + diseño + acabado) |
| 6 | Subtotal de producción | filamento + electricidad + desgaste + mantenimiento + mano de obra + empaque + entrega + otros |
| 7 | Reserva por fallos | subtotal × tasa / (1 − tasa); la tasa se limita a 99 % |
| 8 | Costo total | subtotal + reserva por fallos |
| 9 | Costo por unidad | costo total / piezas |
| 10 | Precio mínimo | (costo total + comisión fija) / (1 − comisión %) |
| 11 | Precio recomendado | (costo total + comisión fija) / (1 − comisión % − margen) — margen sobre el precio de venta |
| 12 | Ganancia | precio recomendado − costo total − comisión total |
| 13 | Margen real | ganancia / precio recomendado × 100 |

Notas de criterio:

- La comisión fija se aplica **una vez por venta** (el proyecto completo), no por pieza.
- Si hay desglose modelo/soportes/purga, su costo se calcula con el costo promedio por gramo del proyecto; el costo del filamento siempre sale del consumo **total**. Una diferencia se muestra como «Filamento sin clasificar».
- Cada proyecto guarda el costo por gramo que tenía su filamento; cambiar el precio de una bobina no altera proyectos viejos hasta que los edites y guardes de nuevo (al editar se recalcula con la configuración y precios actuales).
- La cotización muestra precio por unidad = total / piezas, redondeados a centavos. No incluye costos internos, desgaste, margen ni ganancia; esos solo salen en el informe interno.

## Cómo funciona el almacenamiento local

- Todo se guarda en `localStorage` bajo la clave `costo3d:data` como un documento `{ schemaVersion, settings, filaments, projects, preferences }`. El borrador del formulario va en `costo3d:draft`.
- Los datos pertenecen a **un navegador y un dominio**: no se comparten entre dispositivos. Por eso existe **Respaldo → Exportar JSON**.
- `schemaVersion` permite migraciones: al cambiar la estructura, sube `SCHEMA_VERSION` (`storage/defaults.ts`) y agrega una función en `storage/migrations.ts`. Los campos nuevos de configuración se completan con valores por defecto, así una actualización normal no borra nada.
- Si los datos guardados estuvieran dañados, la app **no los descarta**: guarda una copia en `costo3d:data:corrupt:<fecha>` y avisa.
- Los componentes nunca usan `localStorage`; solo la interfaz `StorageRepository`.

## Publicar en GitHub Pages

**Opción A, automática (recomendada)** — el archivo `.github/workflows/deploy.yml` ya está incluido:

1. Crea un repositorio en GitHub y sube el proyecto:
   ```bash
   git init
   git add .
   git commit -m "Costo3D"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/costo3d.git
   git push -u origin main
   ```
2. En GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Cada `push` a `main` ejecuta pruebas, compila y publica. La dirección será `https://TU_USUARIO.github.io/costo3d/`.

**Opción B, manual:** `npm run build` y sube el contenido de `dist/` a una rama `gh-pages` (Settings → Pages → Deploy from a branch).

`vite.config.ts` usa `base: './'` y la navegación usa `#/ruta`, por lo que funciona sin importar el nombre del repositorio.

## Conectar Supabase en el futuro (sin rehacer la aplicación)

La app ya está preparada: los componentes solo conocen `StorageRepository`, cuyos métodos son asíncronos. Pasos:

1. **Crear tablas** en Supabase (ejemplo mínimo; guarda el contenido como JSON para facilitar migraciones):
   ```sql
   create table settings  (user_id uuid primary key references auth.users, data jsonb not null);
   create table filaments (id uuid primary key, user_id uuid not null references auth.users, data jsonb not null);
   create table projects  (id uuid primary key, user_id uuid not null references auth.users,
                           data jsonb not null, updated_at timestamptz default now());
   alter table settings  enable row level security;
   alter table filaments enable row level security;
   alter table projects  enable row level security;
   -- una política por tabla, por ejemplo:
   create policy "solo mis datos" on projects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
   ```
   (Repite la política en `settings` y `filaments`.) Los ids de la app son UUID; si algún dato antiguo no lo fuera, conviértelo al migrar.
2. `npm install @supabase/supabase-js` y crea `.env.local` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. La clave *anon* es pública por diseño: la seguridad real la dan las políticas RLS.
3. Crea `src/storage/SupabaseRepository.ts` (parte de `FutureDatabaseRepository.ts`) e implementa cada método, por ejemplo:
   ```ts
   async upsertProject(p: Project) {
     const { error } = await this.client.from('projects').upsert({ id: p.id, user_id: this.userId, data: p });
     if (error) throw new Error('No se pudo guardar el proyecto.');
   }
   async load() { /* select de las 3 tablas → AppData (usa parseAppData para validar/migrar) */ }
   ```
   Para `replaceAll` usa una función RPC o inserciones por lotes.
4. En `src/storage/index.ts` devuelve el nuevo repositorio en `createRepository()` (por ejemplo según una variable de entorno). Nada más cambia.
5. **Migrar datos existentes:** exporta el respaldo JSON desde la versión local e impórtalo con la versión conectada.
6. Añade inicio de sesión (Supabase Auth) antes de crear el repositorio, para obtener `userId`.

## Pruebas

`npm test` ejecuta tres archivos:

- `calculator.test.ts`: cada fórmula, casos completos, comisiones, margen real, tasa de fallos extrema y validaciones.
- `storage.test.ts`: guardado, recuperación, upsert/eliminación, datos dañados, versión de esquema futura, borrador y respaldo JSON (importación válida e inválida).
- `projectForm.test.ts`: lectura del formulario, errores, multicolor, filamento eliminado, resumen, filtros/orden y cotización.

## Revisión final (lista de comprobación manual)

Marca cada punto después de `npm run dev`:

- [ ] Primer inicio: el asistente aparece, valida y termina en «Nuevo cálculo».
- [ ] Crear, editar y eliminar un filamento; el costo por gramo se actualiza al escribir.
- [ ] Calcular con solo los campos esenciales y con multicolor (2–4 colores).
- [ ] Desglose de gramos que no suma el total: aparece advertencia y se puede guardar.
- [ ] Recargar la página: proyectos, filamentos, configuración y tema siguen ahí.
- [ ] Escribir a medias en «Nuevo cálculo», recargar: se recupera el borrador.
- [ ] Mis proyectos: buscar, filtrar, ordenar, abrir, editar, duplicar, cambiar estado, eliminar con confirmación.
- [ ] Cotización: solo muestra nombre, fecha, cantidad, precio unitario, total y notas. Informe interno: desglose completo. «Guardar como PDF» desde el diálogo de impresión.
- [ ] Respaldo: exportar, importar el mismo archivo (pide confirmación) y probar con un archivo inválido (muestra el error).
- [ ] Teléfono (ancho < 860 px): menú compacto, formularios y tarjetas legibles. Modo oscuro.
