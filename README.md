# Clave: bóveda local de credenciales

Aplicación Next.js para guardar claves localmente en el navegador y moverlas entre equipos con copias JSON cifradas. No usa cuentas, base de datos, endpoints de bóveda ni sincronización automática en servidores. Vercel solo entrega la aplicación web; la bóveda permanece en IndexedDB del navegador.

## Cifrado y almacenamiento

- Antes de escribir en IndexedDB, la app serializa la lista en la memoria de la pestaña y la cifra con AES-256-GCM mediante Web Crypto. Cada guardado y exportación genera un nonce nuevo y autentica el formato mediante AAD.
- Argon2id deriva la clave de cifrado a partir de la frase maestra y un salt aleatorio de 16 bytes. Se usan 64 MiB, tres iteraciones y paralelismo 1 mediante `hash-wasm`, que ejecuta la implementación en WebAssembly en el navegador.
- IndexedDB contiene un único registro cifrado. Los campos de las credenciales no se guardan en `localStorage`, cookies, bases de datos remotas ni analítica. No hay API de servidor para leerlos.
- La frase maestra no se puede recuperar. Sin ella o sin una copia cifrada, el contenido es irrecuperable. Exporta respaldos con frecuencia y guarda la frase en un lugar separado.
- Tras cinco minutos sin actividad, la interfaz se bloquea y descarta la referencia a la clave de la aplicación. El navegador no garantiza borrar de inmediato todas las copias en memoria.
- La bóveda se asocia al origen y perfil del navegador. Borrar los datos del sitio, perder el dispositivo o que el sistema purgue IndexedDB puede borrar la copia local. Conserva respaldos fuera del dispositivo.
- Vercel sirve el código de la interfaz; la app no envía datos de la bóveda a Vercel. Como en cualquier app web, quien controle el código que se entrega al navegador podría cambiarlo para intentar leer datos mientras la bóveda está abierta.

## Sincronización entre dispositivos

Usa **Exportar respaldo cifrado** en el primer dispositivo y mueve el archivo `clave-respaldo-cifrado.json` al otro por un medio que elijas. En el otro dispositivo importa el archivo e introduce la misma frase maestra. El archivo solo se descifra localmente.

Al importar en una bóveda que ya tiene datos, confirma la fusión para combinar entradas por ID. Si cancelas la confirmación, la bóveda local se reemplaza con el contenido del archivo. La importación de un respaldo v1 antiguo lo migra al formato v2. El archivo nunca se sube desde la aplicación; el proveedor de almacenamiento que elijas queda fuera de esta app y de su modelo de confianza.

No hay sincronización automática ni resolución de conflictos en segundo plano. Para evitar sobrescribir cambios, exporta después de editar y mueve el respaldo más reciente entre equipos. La app no tiene permiso para escribir silenciosamente en una carpeta sincronizada; los navegadores exigen que la persona elija el archivo o destino.

## Formatos admitidos

- `clave-local-encrypted-v2`: JSON con algoritmo, parámetros KDF, salt, nonce, fecha y ciphertext. Se acepta solo con los parámetros KDF soportados por esta versión.
- `clave-encrypted-v1`: respaldo cifrado de la versión anterior. Se descifra en este dispositivo y se vuelve a guardar en formato v2.
- No se importa JSON de respaldo en claro ni se ofrece exportación sin cifrar. Las listas TXT/CSV solo se admiten como entrada de migración; consulta la sección siguiente y elimina el original en claro después de verificar la importación.

## Importar listas TXT y CSV en claro

Con la bóveda abierta, ve a **Ajustes → Importar una lista de texto o CSV** y selecciona un `.txt` o `.csv` de hasta 5 MB. El selector de importación rápida también detecta esos formatos. Si la bóveda está bloqueada, primero desbloquéala o créala. También se admiten listas TSV y archivos separados por espacios. Se reconocen encabezados en español e inglés para servicio, usuario, contraseña, sitio web, categoría y notas. En el formato `Id Aplicacion Usuario Contraseña`, el ID se ignora; al estar separado por espacios, el texto entre el ID y las dos últimas columnas se interpreta como nombre de la aplicación, y las dos últimas columnas como usuario y contraseña. Si las filas están separadas por tabuladores, usa encabezados para conservar cada columna aunque tenga espacios. Sin encabezados, con tres o más columnas interpreta servicio, usuario y contraseña; con dos columnas, usuario y contraseña. También admite bloques TXT como `Servicio: Correo`, `Usuario: nombre` y `Contraseña: clave`, separados por líneas vacías o por un nuevo servicio.

La vista previa informa cuántas cuentas detectó y qué campos asignará; oculta las contraseñas. Puedes añadir/actualizar cuentas o reemplazar la bóveda. El contenido se procesa en el navegador y se cifra al guardarlo. El fichero original sigue en su ubicación y puede quedar en claro: elimínalo cuando confirmes que la importación funcionó. No se envía a un servidor ni se registra. La memoria del navegador no se puede limpiar de forma garantizada.

## Desarrollo y despliegue

La frase maestra debe tener al menos 14 caracteres. No se necesitan secretos ni variables de entorno. `.env.example` se conserva como recordatorio de que no hay configuración de base de datos.

1. Instala Node.js 20 o superior.
2. Ejecuta `npm install`.
3. Ejecuta `npm run dev` y abre `http://localhost:3000`.
4. Para Vercel, importa el repositorio y despliega con el preset de Next.js. No configures una base de datos.

## Comprobaciones manuales

- [ ] Crea bóveda, añade una credencial y recarga la página; debe seguir guardada en ese navegador.
- [ ] Comprueba en IndexedDB que el registro contiene un sobre cifrado y que no aparecen el nombre de servicio, usuario ni contraseña.
- [ ] Bloquea y desbloquea con la frase correcta; prueba una frase incorrecta.
- [ ] Añade, edita, elimina, busca y filtra credenciales; confirma favoritos y revisión de débiles, repetidas e incompletas.
- [ ] Exporta un respaldo v2, borra la bóveda local, importa el archivo y confirma que los datos regresan.
- [ ] Importa una muestra TXT con etiquetas y un CSV con encabezados; revisa el mapeo, confirma que la vista previa no muestra claves y comprueba la bóveda cifrada.
- [ ] Importa el formato `Id Aplicacion Usuario Contraseña`; confirma que el ID no se use como usuario y que las aplicaciones con nombres de varias palabras queden completas.
- [ ] Prueba la fusión de una copia con una bóveda existente y también su reemplazo.
- [ ] Confirma que no existe una exportación sin cifrar.
- [ ] Deja la pestaña inactiva cinco minutos y confirma el bloqueo.
- [ ] Importa un respaldo v1 de la versión anterior y confirma que queda guardado como v2.
