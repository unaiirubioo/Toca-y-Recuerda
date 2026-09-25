# Toca y Recuerda

Plataforma de recuerdos digitales con NFC. Un usuario compra un NFC físico,
lo asocia a un álbum digital (fotos, vídeos, textos, fecha, ubicación,
música y diseño), y al acercar el móvil al NFC se abre ese álbum.

> Estado: **Las 15 fases están completas.** El proyecto está listo
> para que configures tus propias cuentas (Supabase, Stripe, Vercel) y
> lo despliegues — ver la "Checklist antes de producción" al final de
> este documento.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + componentes propios (base para shadcn/ui)
- Supabase (Postgres, Auth, Storage)
- Stripe (pagos únicos — tarjeta, Bizum, Apple/Google Pay)
- Leaflet + OpenStreetMap (mapas, sin coste ni API key)
- Vercel (hosting)

## 1. Instalación local

```bash
npm install
cp .env.example .env.local
# rellena .env.local con tus claves (ver secciones siguientes)
npm run dev
```

## 2. Configurar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **Project Settings → API**, copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` (secreto) → `SUPABASE_SERVICE_ROLE_KEY`
3. Aplica las migraciones. Con el CLI de Supabase instalado:
   ```bash
   npx supabase link --project-ref <TU_PROJECT_REF>
   npx supabase db push
   ```
   Esto ejecuta, en orden:
   - `supabase/migrations/0001_init.sql` — esquema completo + RLS base
   - `supabase/migrations/0002_seed_products.sql` — catálogo de precios
   - `supabase/migrations/0003_storage.sql` — bucket de Storage + RLS
   - `supabase/migrations/0004_security_hardening.sql` — bucket restringido por tipo/tamaño
   - `supabase/migrations/0005_audit_fixes.sql` — **imprescindible**: privilegios de columna, funciones atómicas y ajustes editables (ver más abajo)
4. Crea el bucket de Storage `album-media` (privado) desde el panel de
   Supabase → Storage. Las políticas de acceso a archivos privados se
   añaden en la Fase 5.
5. Regenera los tipos TypeScript reales (sustituye el placeholder actual):
   ```bash
   npx supabase gen types typescript --project-id <TU_PROJECT_REF> > types/database.ts
   ```

### Crear tu primer usuario administrador

Tras registrarte una vez desde la app (crea tu fila en `profiles`
automáticamente), sube tu rol a admin desde el SQL Editor de Supabase:

```sql
update public.profiles set role = 'admin' where id = '<TU_USER_ID>';
```

## 3. Configurar Stripe

1. Crea una cuenta en [stripe.com](https://stripe.com) (modo test para empezar).
2. **Developers → API keys** → copia la clave secreta y la publicable a
   `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
3. Activa Bizum, Apple Pay y Google Pay como métodos de pago desde
   **Settings → Payment methods** (se configurará en la Fase 9).
4. El webhook (`STRIPE_WEBHOOK_SECRET`) se crea en la Fase 9, cuando exista
   el endpoint `/api/webhooks/stripe` que lo recibe.

## 4. Variables de entorno

Ver [`.env.example`](./.env.example) — está comentado y no contiene
secretos reales.

## 5. Despliegue en Vercel

1. Importa el repositorio en [vercel.com](https://vercel.com).
2. Copia todas las variables de `.env.local` al panel de Vercel
   (**Settings → Environment Variables**).
3. Configura el dominio `tocayrecuerda.com` en **Settings → Domains**.
4. Tras el primer despliegue, actualiza el webhook de Stripe para que
   apunte a `https://tocayrecuerda.com/api/webhooks/stripe`.

## Estructura del proyecto

```
app/                  Rutas (App Router)
components/           Componentes reutilizables (Fase 12)
lib/
  supabase/
    client.ts          Cliente para el navegador (respeta RLS)
    server.ts           Cliente para Server Components/Actions (respeta RLS)
    admin.ts            Cliente service_role — SOLO servidor, ignora RLS
  nfc.ts                Generación de tokens NFC aleatorios y su URL
  plans.ts              Límites del plan gratuito
supabase/migrations/    Esquema SQL versionado
styles/globals.css      Estilos base + tokens de Tailwind
types/database.ts       Tipos generados desde Supabase (placeholder por ahora)
```

## Rutas de autenticación (Fase 2)

| Ruta | Qué hace |
|---|---|
| `/registro` | Alta de cuenta (email + contraseña) |
| `/login` | Inicio de sesión |
| `/recuperar` | Solicitar enlace de recuperación de contraseña |
| `/actualizar-password` | Establecer nueva contraseña (llegando desde el enlace del email) |
| `/auth/callback` | Route Handler que intercambia el código del email por una sesión |
| `/onboarding` | Bienvenida + selección de intención (spec #8), solo la primera vez |
| `/dashboard` | Placeholder protegido — el dashboard real es la Fase 3 |

La protección de `/dashboard` y `/onboarding` en el middleware es solo una
capa de UX (evita parpadeos y redirecciones tras cargar la página); la
seguridad real de los datos la imponen las políticas RLS de Supabase
creadas en la Fase 1.

## Rutas de álbumes (Fase 4)

| Ruta | Qué hace |
|---|---|
| `/albumes/nuevo` | Asistente paso a paso (spec #9): nombre, fecha, ubicación, historia, estilo, música, privacidad y publicación |
| `/albumes/[id]/editar` | Edición del álbum ya creado; publicar o eliminar |
| `/albumes/limite` | Pantalla "Tu recuerdo está creciendo ❤️" cuando se agota el plan gratuito (spec #13) |
| `/tienda` | Placeholder — la tienda real es la Fase 8 |

**Regla de negocio clave** (`lib/actions/albums.ts`): un usuario puede
crear un álbum si tiene un crédito Premium sin consumir (se consume al
crear) o si todavía no tiene ningún álbum gratuito. Si no cumple
ninguna, se le redirige a `/albumes/limite`. Esto se comprueba siempre
en el servidor, nunca solo en el asistente del navegador.

La subida de fotos/vídeos está señalada como pendiente ("llega en la
Fase 5") tanto en el asistente como en la edición — de momento el
álbum se crea y se publica solo con sus datos, sin medios.

## Storage y subida de archivos (Fase 5)

El bucket `album-media` y sus políticas de seguridad ya están en
`supabase/migrations/0003_storage.sql` — se crean solos al hacer
`npx supabase db push`, no hay que crear el bucket a mano en el panel.

**Cómo funciona la subida** (para quien continúe el código):

1. El navegador pide una "ranura de subida" al servidor (`createUploadSlot`),
   que comprueba límites del álbum y devuelve una URL firmada de Supabase
   Storage — el archivo nunca pasa por el servidor de Next.js.
2. El navegador genera una miniatura (canvas) y sube el original y la
   miniatura directamente a Storage por XHR, con progreso real.
3. El navegador confirma la subida (`confirmMediaUpload`), que
   **revalida los límites otra vez en el servidor** (por si hubo subidas
   en paralelo) antes de guardar la fila en `album_media` y actualizar los
   contadores del álbum. Si algo falla aquí, se borra lo ya subido para no
   dejar basura ocupando cuota.
4. Las miniaturas y archivos se muestran con URLs firmadas de corta
   duración (`getAlbumMedia`), porque el bucket es privado.

Pendiente para fases posteriores: analizar/optimizar vídeo en servidor,
y servir las URLs firmadas también en el visor público (Fase 6) respetando
la privacidad del álbum.

## El corazón del producto: `/n/[token]` (Fase 6)

`app/n/[token]/page.tsx` es la página que abre el móvil al acercarse al
NFC. Con el cliente `service_role` (nunca con RLS, porque quien escanea
puede ser anónimo) decide, en este orden:

1. **Token no existe** → 404 llano (nunca revela si "existió alguna vez").
2. **Existe pero sin álbum asociado** → pantalla "✨ Este recuerdo todavía
   no está configurado" (spec #5). Si quien escanea ya tiene sesión, va
   directo al asistente; si no, se registra/inicia sesión y, al terminar,
   crea su álbum — que se vincula automáticamente a ESE NFC concreto
   (el token viaja como parámetro `?nfc=` a través del registro, la
   confirmación de email, el onboarding y el asistente).
3. **Álbum en borrador** (el propietario no lo ha publicado) → mensaje
   humano, no un 404.
4. **Álbum privado** → pantalla de contraseña (`PasswordGate`). La
   contraseña se guarda con **hash real** (`lib/security/password.ts`,
   scrypt) desde la Fase 4/6 — nunca en texto plano. Al acertarla, se
   concede una cookie firmada de 24 h (`lib/security/album-access.ts`),
   sin necesidad de tener cuenta.
5. **Álbum público y publicado** → se muestra el visor completo
   (`AlbumViewer`): portada, título, fecha, ubicación, galería con visor
   a pantalla completa, historia, mapa y música.

`/album/[slug]` es la misma experiencia para álbumes sin NFC asociado
(spec #49), con la misma lógica de privacidad.

**Importante para producción**: define `ALBUM_ACCESS_SECRET` en tus
variables de entorno (ver `.env.example`) — sin ella, el desbloqueo de
álbumes privados no puede firmar el pase de acceso.

## Panel /admin y ciclo de vida del NFC (Fase 7)

Acceso: cualquier usuario con `profiles.role = 'admin'` (ver "Crear tu
primer usuario administrador" más arriba) entra en `/admin` — protegido
en el middleware (UX) y por las políticas RLS `..._admin_write` (seguridad
real, spec #45).

**`/admin/nfc`**:
- Contador por estado (en stock, reservados, vendidos, asignados,
  activos, deshabilitados).
- "Generar NFC" (uno o en lote hasta 100): crea el `public_token`
  aleatorio y muestra la URL para copiar y grabar físicamente con NFC
  Tools u otra herramienta (spec #61/#62) — la plataforma nunca programa
  el chip, solo genera la URL.
- Tabla completa con propietario, álbum asociado, nº de escaneos, botón
  "Probar" (abre `/n/[token]` en una pestaña nueva, spec #63) y selector
  para cambiar el estado manualmente.

**Ciclo de vida completo de un NFC**, de principio a fin:

```
Admin genera NFC → STOCK
   ↓ (Fase 8/9: cliente lo compra)
SOLD / RESERVED
   ↓ (spec #50/#61: se asocia a un álbum — desde el "no configurado" o desde "Añadir NFC")
ACTIVE (con album_id y owner_id)
   ↓ (spec #51: el usuario pulsa "Desvincular NFC" en /albumes/[id]/editar)
SOLD (sigue siendo suyo, sin álbum) → puede asociarse a otro álbum
```

El estado `DISABLED` es manual, para cuando un administrador necesita
invalidar un NFC (perdido, defectuoso) sin borrar su historial.

## Tienda y carrito (Fase 8)

- `/tienda` lee el catálogo real de la tabla `products` (la que se
  llenó con `0002_seed_products.sql`) y lo agrupa en las 3 categorías
  del spec: Álbumes, NFC, Packs completos.
- El producto "Mejor precio" de cada categoría se calcula de forma
  honesta (precio por álbum o por NFC más bajo dentro de esa categoría)
  y se destaca visualmente — nunca con cuentas atrás falsas ni
  urgencia artificial.
- El carrito (`lib/cart-context.tsx`) vive en el navegador
  (`localStorage`, no hay datos sensibles: solo qué productos y
  cuántos) y persiste entre páginas gracias al `CartProvider` que
  envuelve toda la app en `app/layout.tsx`.
- `/tienda/carrito` muestra cantidad, subtotal por línea y total; como
  los precios de NFC y packs ya incluyen envío, nunca se añade una
  línea de envío aparte (spec #20/#78).
- `/checkout` es todavía un resumen final sin pasarela de pago real —
  la integración con Stripe (tarjeta, Bizum, Apple Pay, Google Pay) y
  la creación de pedidos/créditos tras el pago es la Fase 9.

## Stripe y webhooks (Fase 9)

**Flujo completo**: `/checkout` recalcula los precios en el servidor
(nunca se confía en el carrito del navegador), crea el `order` +
`order_items` en estado `pending`, abre una Stripe Checkout Session
**sin especificar métodos de pago** — para Checkout Sessions (a
diferencia de Payment Intents), eso hace que Stripe muestre
automáticamente tarjeta, Bizum, Apple Pay y Google Pay según lo que
tengas activado en tu panel (*Settings → Payment methods*) — y
redirige a Stripe. Si el pedido incluye NFC, se activa
`shipping_address_collection` para pedir la dirección de envío.

**El webhook** (`app/api/webhooks/stripe/route.ts`) es quien de verdad
confirma la compra — nunca la redirección del navegador, que puede
fallar o cerrarse antes de completarse (spec #74):
1. Verifica la firma con `STRIPE_WEBHOOK_SECRET`.
2. Comprueba `stripe_webhook_events` por `event.id` — si ya se
   procesó, responde `200` sin repetir nada (idempotencia).
3. Marca el pedido como `paid`, guarda el pago en `payments`, y guarda
   la dirección de envío si Stripe la recogió.
4. Por cada línea del pedido, **autodetecta lo que incluye el
   producto** (spec #57): crea N créditos de álbum Premium
   (`album_credits`) y/o N créditos de NFC (`nfc_credits`), y para cada
   NFC intenta reservar un tag físico ya generado en `/admin/nfc`
   (pasa de `stock` a `sold`, a nombre del comprador). Si no queda
   stock, el crédito se guarda igual — un administrador podrá generar
   más NFC y asignarlos.
5. Si el usuario ya tiene un NFC comprado sin asociar, en
   `/albumes/[id]/editar` verá "Vincular uno de tus NFC disponibles"
   en vez de tener que pasar otra vez por la tienda.

**Configuración manual pendiente en el panel de Stripe** (no se puede
hacer desde aquí): activa Bizum en *Settings → Payment methods*, y tras
desplegar, crea el endpoint de webhook apuntando a
`https://tocayrecuerda.com/api/webhooks/stripe`, suscrito al evento
`checkout.session.completed` — copia el "Signing secret" a
`STRIPE_WEBHOOK_SECRET`.

## Pedidos y fulfillment de NFC (Fase 10)

`/admin/pedidos` (spec #22/#23): cada pedido muestra cliente (nombre +
email), productos comprados, importe, estado del pago (pendiente/
pagado/fallido/reembolsado) y dirección de envío si Stripe la recogió.
Los NFC de ese pedido concreto aparecen debajo, cada uno con su token,
botón para copiar la URL, y un selector de estado logístico
(pendiente → preparando → programado → enviado → entregado) — se puede
cambiar uno a uno o todos los NFC del pedido de golpe.

Esto se apoya en la tabla `nfc_fulfillment` que ya creó la Fase 1 y que
la Fase 9 rellena automáticamente al confirmarse cada pago.

## Panel de administración completo (Fase 11)

- **`/admin`** (métricas, spec #53): usuarios, álbumes totales, gratis
  vs Premium, ingresos reales (suma de `payments` con `status =
  succeeded`), NFC vendidos/disponibles, almacenamiento total usado —
  con dos gráficas de barras sencillas, sin librerías externas.
- **`/admin/usuarios`**: buscar por nombre o email, ver nº de álbumes,
  bloquear/desbloquear. **El bloqueo es real**, no solo visual: el
  middleware comprueba `is_blocked` en cada visita a una página
  protegida y manda a `/cuenta-bloqueada` (con botón para cerrar
  sesión) a cualquier usuario bloqueado, aunque su sesión siga siendo
  válida.
- **`/admin/usuarios/[id]`**: sus álbumes (con plan y estado) y sus
  compras (con importe y estado del pago).
- **`/admin/albumes`**: todos los álbumes de la plataforma, buscables,
  con propietario, plan, estado y barra de almacenamiento.
- **`/admin/productos`** (spec #56): edición en línea de precio,
  créditos de álbum/NFC, límites de fotos/vídeos/almacenamiento, y
  activo/inactivo — todo lo que antes vivía en el seed SQL ahora se
  puede cambiar sin tocar código, y se refleja al momento en `/tienda`.

## UI/UX final (Fase 12)

**Aviso importante**: hasta esta fase, la ruta raíz `/` no tenía
ninguna página — quien visitara `tocayrecuerda.com` sin conocer una
URL interna se habría encontrado un 404. Quedó pendiente desde la Fase
1 porque el spec no la pedía explícitamente hasta las secciones 29-31,
y no lo noté hasta ahora. Ya está resuelto:

- **`/`**: landing completa — hero con las dos CTA del spec, "Cómo
  funciona" en 3 pasos, demo interactiva del NFC (pulsa para simular
  el escaneo y ver un álbum de ejemplo), franja final de CTA y footer
  con enlaces legales. La cabecera cambia su CTA a "Ir a mi panel" si
  ya tienes sesión.
- **Tienda navegable sin cuenta**: ya no exige login solo para ver
  precios — únicamente `/checkout` (pagar) sigue requiriendo sesión.
- **`/legal/*`**: privacidad, términos, cookies y aviso legal, con
  placeholders muy visibles avisando de que un profesional del derecho
  debe revisarlos antes de producción (spec #54) — nunca inventé texto
  legal definitivo.
- **Aviso de cookies** simple, persistido en el navegador.
- **`sitemap.xml`/`robots.txt`** dinámicos: solo indexan páginas
  públicas y álbumes publicados y públicos — los privados y las rutas
  de la app nunca se indexan (spec #44).
- **404 con estilo propio** y **skeleton loading** del dashboard en
  vez de solo un spinner (spec #40/#41).

## Seguridad (Fase 13)

Todo lo que ya cumplía "nunca confiar solo en el frontend" (RLS,
validación de límites en servidor, URLs firmadas) se construyó en
fases anteriores porque era imposible separarlo del propio feature.
Esta fase añade lo que faltaba:

- **Rate limiting** (`lib/security/rate-limit.ts`) en los puntos donde
  de verdad importa: login (por email y por IP), registro, solicitud
  de recuperación de contraseña, **contraseña de álbum privado**
  (el punto más sensible: sin esto, alguien podría probar contraseñas
  al azar contra un álbum privado sin límite), creación de sesiones de
  pago, y subida de archivos.
  ⚠️ **Aviso honesto**: es un rate limiter en memoria, sin
  dependencias externas — funciona perfectamente en una instancia,
  pero si despliegas en varias instancias/regiones a la vez, cada una
  cuenta por separado. Si eso llega a importar a tu escala, el propio
  archivo explica cómo sustituirlo por Upstash Redis sin cambiar el
  resto del código.
- **El bucket de Storage ahora rechaza tipos y tamaños no permitidos
  él mismo** (`0004_security_hardening.sql`), no solo nuestro código:
  aunque alguien llame directamente a la API de Supabase Storage sin
  pasar por la plataforma, no puede subir un `.exe` de 2 GB.
- **Cabeceras de seguridad HTTP** (`next.config.js`): `X-Frame-Options`
  para que nadie incruste tus álbumes en un iframe ajeno,
  `X-Content-Type-Options`, `Referrer-Policy`, y `Permissions-Policy`
  bloqueando cámara/micrófono/ubicación que la plataforma no necesita.

## Tests (Fase 14)

⚠️ **Aviso honesto**: este entorno no tiene acceso a red, así que no he
podido ejecutar `npm install` ni correr los tests aquí — no puedo
garantizarte que pasen hasta que los ejecutes tú:

```bash
npm install
npm test
```

**Cómo están organizados**: en vez de mockear todo Supabase (frágil y
lento), extraje la lógica de negocio importante a funciones puras sin
acceso a base de datos (`lib/business/*.ts`), y los archivos reales
(`lib/actions/albums.ts`, `app/n/[token]/page.tsx`, el webhook, la
tienda) simplemente llaman a esas funciones. Así los tests son rápidos,
no dependen de una base de datos de prueba, y el comportamiento
testeado es exactamente el que corre en producción — no una copia
paralela de la lógica.

Cobertura por spec #75:
- **Límites gratuitos y Premium / créditos**: `tests/album-eligibility.test.ts`
- **Subida (tipos, tamaños, límites de álbum)**: `tests/storage.test.ts`, `tests/media-limits.test.ts`
- **NFC no asociado / asociación / acceso**: `tests/nfc-resolution.test.ts`, `tests/nfc-token.test.ts`
- **Privacidad**: `tests/password.test.ts`, `tests/album-access.test.ts`
- **Registro / login**: `tests/auth-validation.test.ts`
- **Creación de álbum**: `tests/album-validation.test.ts`
- **Compra / webhook / packs**: `tests/order-idempotency.test.ts`, `tests/store-products.test.ts`
- **Rate limiting**: `tests/rate-limit.test.ts`

**Lo que falta y por qué**: tests end-to-end reales (Playwright/
Cypress) contra un Supabase de pruebas — necesitan un proyecto Supabase
real desplegado, algo que este entorno no puede crear. Es el siguiente
paso natural si quieres subir el nivel de confianza antes de producción.

## Fases del proyecto

1. **Arquitectura + Supabase + BD** ✅
2. **Autenticación (registro, login, recuperación, onboarding)** ✅
3. **Dashboard** ✅
4. **Creación y edición de álbumes** ✅
5. **Storage y subida de fotos/vídeos** ✅
6. **Visualización pública/privada + resolución de `/n/[token]`** ✅
7. **Sistema NFC completo** ✅
8. **Tienda** ✅
9. **Stripe + Bizum/Apple Pay/Google Pay + webhooks** ✅
10. **Pedidos + inventario NFC** ✅
11. **Panel de administración completo** ✅
12. **UI/UX final** ✅
13. **Seguridad** ✅
14. **Tests** ✅
15. **Optimización y producción** ✅

## Optimización y producción (Fase 15)

- **Favicon e iconos reales**, generados a partir de tu logo (no un
  placeholder): `favicon.ico` multi-resolución, `apple-touch-icon.png`,
  e iconos PWA — conectados en `app/layout.tsx` y en `app/manifest.ts`.
- **`/api/health`**: comprueba que la app y la base de datos responden;
  pégalo en UptimeRobot, Better Uptime o el monitor que uses antes de
  anunciar que está en producción.
- Cabecera `X-Powered-By` desactivada (no anunciar innecesariamente
  la tecnología usada).
- Skeleton loading añadido también en la tienda y en la edición de
  álbum (spec #40), completando lo ya hecho en el dashboard (Fase 12).

## Auditoría de seguridad y correcciones (tras la Fase 15)

Después de cerrar las 15 fases, hice una autocrítica honesta del
proyecto completo y encontré fallos reales — no solo mejoras
cosméticas. Esta sección documenta cada uno, por qué importaba, y qué
cambió. **La migración `0005_audit_fixes.sql` es imprescindible** —
sin ella, varias de estas correcciones no están activas en la base de
datos aunque el código ya las use.

### 🔴 Seguridad: privilegios de columna (el hallazgo más grave)

RLS controla qué **filas** puede tocar cada usuario, nunca qué
**columnas**. Sin más protección, cualquiera con la anon key (pública)
podía abrir la consola del navegador y ejecutar directamente, sin
pasar por la aplicación:

```js
supabase.from('profiles').update({ role: 'admin' }).eq('id', auth.uid())
supabase.from('albums').update({ is_premium: true, storage_limit_mb: 999999 }).eq('id', miAlbum)
```

**Corrección**: `0005_audit_fixes.sql` revoca el privilegio de
`UPDATE`/`INSERT` sobre esas columnas concretas (`profiles.role`,
`profiles.is_blocked`, y en `albums`: `is_premium`, los límites y los
contadores; en `nfc_tags`: `status`, `owner_id`, `album_id`, etc.) para
el rol `authenticated`. A partir de ahí, **ni siquiera un
administrador** puede escribirlas con el cliente normal — importante:
el "rol admin" es un valor de negocio en la tabla `profiles`, no un
rol de PostgreSQL distinto, así que esto afecta a todo el mundo por
igual. Todo el código que necesita escribir esas columnas (creación de
álbum, contadores de medios, vincular/desvincular NFC, bloquear
usuarios, cambiar estado de NFC) se reescribió para usar el cliente
`service_role`, **después de validar todo en el propio código del
servidor** — nunca antes.

### 🟠 Condiciones de carrera reales (no solo teóricas)

- **Dos compras simultáneas podían llevarse el mismo NFC físico**: la
  reserva de stock era un `SELECT` y un `UPDATE` por separado. Ahora
  es una función `reserve_nfc_tag()` atómica con
  `FOR UPDATE SKIP LOCKED`.
- **Doble clic en "Publicar álbum" podía consumir el mismo crédito
  Premium dos veces**. Ahora `try_consume_album_credit()` hace lo
  mismo de forma atómica, con una función de compensación
  (`release_album_credit()`) que lo libera si la creación del álbum
  falla después.
- **El propio webhook de Stripe tenía una ventana de carrera en su
  idempotencia**: comprobaba si el evento ya existía y LUEGO lo
  insertaba — dos pasos separados. Ahora se intenta insertar
  directamente; si la base de datos rechaza el insert por clave
  duplicada (código `23505`), esa es la señal de "ya procesado", sin
  ninguna ventana intermedia.

### 🟠 Bug real (no solo teórico) en el checkout

Al revisar las políticas RLS de `orders`/`order_items` para el punto
anterior, encontré que **nunca existió una política que permitiera a
un usuario normal crear su propio pedido** — solo había una política
de administrador. Es decir: `createCheckoutSession` probablemente
estaba fallando en producción para cualquier compra real. Corregido
usando el cliente `service_role` (la función ya valida todo en
código: sesión, precios recalculados desde la base de datos).

### 🟡 Cosas a medias que ahora están completas

- El **estilo del álbum** (tema, distribución) y los **momentos**
  (spec #32: antes solo se podía escribir uno, al crear el álbum) ya
  se pueden editar después, desde `/albumes/[id]/editar`.
- El campo `caption` de cada foto, que existía en la base de datos
  pero no se podía usar, ahora es editable (icono de lápiz en cada
  miniatura).
- Si borras la foto que era portada, el álbum **ya reasigna
  automáticamente** otra foto como nueva portada en vez de quedarse
  sin ninguna.
- Los límites del **plan gratuito** ya no viven en una constante de
  código — se editan desde `/admin/productos`, igual que Premium y los
  packs (tabla `app_settings`).

### 🟡 Fragilidad de datos

- `/admin` tiene un botón **"Recalcular contadores de álbumes"** que
  recalcula fotos/vídeos/almacenamiento reales a partir de los
  archivos que de verdad existen, para corregir cualquier deriva.
- La creación de álbum y la generación de NFC ahora **reintentan
  automáticamente** si el token/slug aleatorio choca con uno existente
  (antes era solo un error genérico sin reintento).

### 🟢 Detalles descuidados, ahora corregidos

- Las tipografías **Inter y Fraunces ahora se cargan de verdad**
  (`next/font/google`, autohospedadas) — antes solo estaban
  referenciadas por nombre y el sitio caía en silencio al tipo de
  letra del sistema.
- Añadidos `app/error.tsx` y `app/global-error.tsx` con nuestro tono
  humano — antes, cualquier fallo mostraba la pantalla genérica de
  Next.js.
- `types/database.ts` ya no es un placeholder: tiene los tipos reales
  escritos a mano a partir de las migraciones (sin acceso a red no
  pude ejecutar el generador oficial de Supabase — hazlo tú y
  sustitúyelo en cuanto tengas el proyecto conectado). Esto no elimina
  automáticamente los `as any` que ya había en el código — quedan como
  limpieza pendiente, ahora con una base de tipos correcta para
  apoyarse.
- **HEIC** (formato por defecto de fotos de iPhone): antes rompía la
  generación de miniaturas en silencio. Ahora, si el navegador no
  puede decodificarlo, se usa el archivo original como "miniatura" en
  vez de fallar — la subida ya no se rompe. **Limitación que sigue
  existiendo**: la mayoría de navegadores de escritorio tampoco saben
  *mostrar* un HEIC en una etiqueta `<img>`, así que esa miniatura
  concreta puede no visualizarse bien hasta que haya una conversión
  real (sugerencia: recomendar a los usuarios de iPhone poner la
  cámara en modo "Más compatible" en Ajustes → Cámara → Formatos).
- El middleware ya no consulta la base de datos en cada navegación
  protegida solo para comprobar si el usuario está bloqueado — usa una
  caché de 60 segundos. **Aviso honesto**: el middleware corre en el
  Edge Runtime de Vercel, en un proceso distinto al de los Server
  Actions, así que la invalidación inmediata al bloquear a alguien
  puede no llegar a tiempo — en el peor caso, tarda el minuto completo
  en notarse. Está documentado en `lib/security/user-status-cache.ts`.

### Lo que NO se tocó (a propósito)

Las "ideas de mejora" que planteé como opcionales (no como fallos) —
CAPTCHA en registro/login, paginación real en las listas de admin, CI
con GitHub Actions, servir álbumes públicos sin URL firmada — siguen
sin implementar. Son mejoras razonables para cuando la plataforma
tenga tráfico real, no bloqueantes para el lanzamiento.

## Checklist antes de producción

Todo lo que requiere una decisión o una cuenta tuya, reunido en un solo
sitio:

- [ ] Crear el proyecto en Supabase y aplicar `npx supabase db push`
      (migraciones `0001` a `0005` — la `0005` es imprescindible, ver
      la sección "Auditoría de seguridad" más arriba).
- [ ] Crear tu usuario admin (`update profiles set role = 'admin'…`,
      ver más arriba).
- [ ] Crear la cuenta de Stripe, activar **Bizum** en *Payment methods*.
- [ ] Rellenar todas las variables de `.env.example` en Vercel,
      incluida `ALBUM_ACCESS_SECRET` (generar con `openssl rand -hex 32`).
- [ ] Desplegar en Vercel, conectar el dominio `tocayrecuerda.com`.
- [ ] Crear el webhook de Stripe apuntando a
      `https://tocayrecuerda.com/api/webhooks/stripe`, evento
      `checkout.session.completed`, y copiar el *signing secret*.
- [ ] Generar unos cuantos NFC desde `/admin/nfc` y programarlos
      físicamente con NFC Tools antes de venderlos.
- [ ] Ejecutar `npm test` y confirmar que todo pasa en tu máquina.
- [ ] Revisar `/legal/*` con un profesional del derecho — son
      placeholders a propósito.
- [ ] Configurar `/api/health` en un monitor de uptime externo.
- [ ] (Opcional, recomendado a partir de cierto tráfico) sustituir el
      rate limiter en memoria por uno respaldado por Redis si despliegas
      en varias instancias — ver el aviso en `lib/security/rate-limit.ts`.

Con esto, **Toca y Recuerda** está completo de principio a fin: desde
la landing hasta el panel de administración, pasando por el NFC, la
tienda, los pagos y la seguridad — tal como pedía la spec original.
