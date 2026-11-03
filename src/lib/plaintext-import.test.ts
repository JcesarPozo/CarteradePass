import assert from "node:assert/strict";
import { test } from "node:test";
import { parsePlaintextCredentials } from "./plaintext-import";

test("asigna encabezados CSV en español y conserva claves con comas y punto y coma", () => {
  const result = parsePlaintextCredentials('Servicio;Usuario;Contraseña;Sitio web;Categoría;Notas\nCorreo;ana@example.com;"clave;con, signos";mail.example.com;Personal;Cuenta principal');
  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0].title, "Correo");
  assert.equal(result.entries[0].username, "ana@example.com");
  assert.equal(result.entries[0].password, "clave;con, signos");
  assert.equal(result.entries[0].url, "mail.example.com");
  assert.equal(result.entries[0].notes, "Cuenta principal");
  assert.ok(result.mapping.some((item) => item.includes("Contraseña → password")));
});

test("lee bloques TXT tipo etiqueta: valor y separa cuentas repetidas", () => {
  const result = parsePlaintextCredentials("Servicio: Correo\nUsuario: ana@example.com\nContraseña: clave uno\n\nServicio: Tienda\nLogin: ana\nPassword: clave dos");
  assert.equal(result.entries.length, 2);
  assert.deepEqual(result.entries.map((entry) => entry.title), ["Correo", "Tienda"]);
  assert.equal(result.entries[1].password, "clave dos");
});

test("admite TSV sin encabezados con orden servicio, usuario y clave", () => {
  const result = parsePlaintextCredentials("Correo\tana@example.com\tsecreta\nTienda\tana\totra");
  assert.equal(result.entries.length, 2);
  assert.equal(result.entries[0].title, "Correo");
  assert.equal(result.entries[0].username, "ana@example.com");
  assert.equal(result.entries[0].password, "secreta");
  assert.ok(result.mapping[0].includes("columna 1 → servicio"));
});

test("interpreta el encabezado separado por espacios e ignora el ID de origen", () => {
  const result = parsePlaintextCredentials(`Id Aplicacion Usuario Contraseña\n1 Correo Personal ana@example.com clave-uno\n2 "Marlen y Móvil" marlen@example.com clave-dos`);
  assert.equal(result.entries.length, 2);
  assert.equal(result.entries[0].title, "Correo Personal");
  assert.equal(result.entries[0].username, "ana@example.com");
  assert.equal(result.entries[0].password, "clave-uno");
  assert.equal(result.entries[1].title, "Marlen y Móvil");
  assert.equal(result.entries[1].username, "marlen@example.com");
  assert.ok(result.mapping.some((item) => item.includes("ID de origen")));
});

test("admite saltos de línea dentro de campos CSV entrecomillados", () => {
  const result = parsePlaintextCredentials('service,username,password,notes\nMail,ana,secret,"línea uno\nlínea dos"');
  assert.equal(result.entries[0].notes, "línea uno\nlínea dos");
});

test("rechaza archivos sin campos ni separadores reconocibles", () => {
  assert.throws(() => parsePlaintextCredentials("solotextosinformato"), /No encontré columnas/);
  assert.throws(() => parsePlaintextCredentials("service,username,password\n"), /No encontré credenciales/);
});
