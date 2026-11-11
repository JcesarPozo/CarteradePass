"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { deleteLocalBackup, readLocalBackup, writeLocalBackup } from "@/lib/local-vault";
import { decryptBackup, deriveEncryptionKey, encryptEntries, normalizeCredentials, randomSalt, type Credential } from "@/lib/vault-crypto";
import { parsePlaintextCredentials, type PlaintextImport } from "@/lib/plaintext-import";
import AppFooter from "@/components/app-footer";
import PWAInstallButton from "@/components/pwa-install-button";

type View = "Todo" | "Favoritos" | "Débiles o repetidas" | "Recientemente actualizadas" | "Ajustes";
const freshEntry = (): Credential => ({ id: crypto.randomUUID(), title: "", username: "", password: "", url: "", category: "Personal", notes: "", favorite: false, updatedAt: new Date().toISOString() });
const strength = (password: string) => [password.length >= 12, /[A-Z]/.test(password), /[a-z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length;
const incomplete = (entry: Credential) => !entry.title.trim() || !entry.username.trim() || !entry.password.trim();
const duplicate = (entry: Credential, all: Credential[]) => all.some((other) => other.id !== entry.id && ((other.password && other.password === entry.password) || (other.title.toLowerCase() === entry.title.toLowerCase() && other.username.toLowerCase() === entry.username.toLowerCase())));
function generatePassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*+-=?";
  const limit = Math.floor(256 / alphabet.length) * alphabet.length;
  let result = "";
  while (result.length < 24) for (const byte of crypto.getRandomValues(new Uint8Array(32))) { if (byte < limit) result += alphabet[byte % alphabet.length]; if (result.length === 24) break; }
  return result;
}
function Brand() {
  return (
    <div className="brand">
      <Image
        src="/icons/icon-192.png"
        alt="Clave"
        width={34}
        height={34}
        className="brand-app-icon"
        priority
      />
      <span>clave</span>
      <span className="brand-tag">LOCAL</span>
    </div>
  );
}
function asError(error: unknown, fallback: string) { return error instanceof Error ? error.message : fallback; }


export default function Home() {
  const [booting, setBooting] = useState(true);
  const [hasVault, setHasVault] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [key, setKey] = useState<CryptoKey | null>(null);
  const [salt, setSalt] = useState("");
  const [entries, setEntries] = useState<Credential[]>([]);
  const [view, setView] = useState<View>("Todo");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas las categorías");
  const [showPasswords, setShowPasswords] = useState(false);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Credential | null>(null);
  const [form, setForm] = useState<Credential>(freshEntry);
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState("");
  const [plaintextImport, setPlaintextImport] = useState<PlaintextImport | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const plaintextFileRef = useRef<HTMLInputElement>(null);

  const notify = useCallback((message: string) => { setToast(message); window.setTimeout(() => setToast(""), 3000); }, []);
  const toggleReveal = (id: string) => setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  const lock = useCallback(() => { setKey(null); setSalt(""); setEntries([]); setPlaintextImport(null); setUnlocked(false); setPassphrase(""); setConfirmPassphrase(""); setShowPasswords(false); setShowModalPassword(false); setRevealedIds({}); }, []);

  useEffect(() => {
    let active = true;
    const safetyTimer = setTimeout(() => {
      if (active) setBooting(false);
    }, 1200);

    readLocalBackup()
      .then((backup) => {
        if (active) setHasVault(Boolean(backup));
      })
      .catch((cause) => {
        if (active) setError(asError(cause, "No se pudo abrir el almacenamiento local."));
      })
      .finally(() => {
        if (active) {
          clearTimeout(safetyTimer);
          setBooting(false);
        }
      });

    return () => {
      active = false;
      clearTimeout(safetyTimer);
    };
  }, []);

  const resetTimer = useCallback(() => {
    if (!unlocked) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(lock, 5 * 60 * 1000);
  }, [lock, unlocked]);
  useEffect(() => {
    if (!unlocked) return;
    const events = ["pointerdown", "keydown", "touchstart"];
    events.forEach((event) => window.addEventListener(event, resetTimer));
    resetTimer();
    return () => { events.forEach((event) => window.removeEventListener(event, resetTimer)); if (timer.current) clearTimeout(timer.current); };
  }, [resetTimer, unlocked]);

  const finishUnlock = (encryptionKey: CryptoKey, vaultSalt: string, decrypted: Credential[]) => {
    setKey(encryptionKey); setSalt(vaultSalt); setEntries(normalizeCredentials(decrypted)); setHasVault(true); setUnlocked(true); setPassphrase(""); setConfirmPassphrase(""); setError("");
  };

  const createVault = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if (passphrase.length < 14) throw new Error("Usa una frase maestra de al menos 14 caracteres.");
      if (passphrase !== confirmPassphrase) throw new Error("Las frases maestras no coinciden.");
      const vaultSalt = randomSalt();
      const encryptionKey = await deriveEncryptionKey(passphrase, vaultSalt);
      const backup = await encryptEntries([], encryptionKey, vaultSalt);
      await writeLocalBackup(backup);
      finishUnlock(encryptionKey, vaultSalt, []);
      notify("Bóveda cifrada creada en este dispositivo.");
    } catch (cause) { setError(asError(cause, "No se pudo crear la bóveda local.")); }
    finally { setBusy(false); }
  };

  const unlockVault = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const backup = await readLocalBackup();
      if (!backup) { setHasVault(false); throw new Error("No hay una bóveda en este dispositivo. Crea una o importa un respaldo cifrado."); }
      const result = await decryptBackup(backup, passphrase);
      finishUnlock(result.key, result.backup.salt, result.entries);
      if (backup.format !== result.backup.format) await writeLocalBackup(result.backup);
    } catch { setError("No se pudo abrir la bóveda. Comprueba la frase maestra o restaura un respaldo válido."); }
    finally { setBusy(false); }
  };

  const saveEntries = async (next: Credential[], activeKey = key, activeSalt = salt) => {
    if (!activeKey || !activeSalt) throw new Error("Desbloquea la bóveda antes de guardar.");
    const backup = await encryptEntries(next, activeKey, activeSalt);
    await writeLocalBackup(backup);
    setEntries(next); setHasVault(true); resetTimer();
  };

  const saveEntry = async () => {
    if (!form.title.trim() || !form.username.trim()) { notify("Completa el servicio y el usuario o correo."); return; }
    const next = editing ? entries.map((entry) => entry.id === form.id ? { ...form, updatedAt: new Date().toISOString() } : entry) : [{ ...form, updatedAt: new Date().toISOString() }, ...entries];
    try { await saveEntries(next); setModal(false); notify("Credencial guardada en este dispositivo."); }
    catch (cause) { notify(asError(cause, "No se pudo guardar.")); }
  };

  const exportBackup = async () => {
    if (!key || !salt) return;
    try {
      const backup = await encryptEntries(entries, key, salt);
      await writeLocalBackup(backup);
      const blobUrl = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
      const link = document.createElement("a"); link.href = blobUrl; link.download = "clave-respaldo-cifrado.json"; link.click();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      notify("Respaldo cifrado descargado.");
    } catch (cause) { notify(asError(cause, "No se pudo exportar el respaldo.")); }
  };

  const importBackup = async (file: File) => {
    let plaintextSelection = false;
    try {
      const textFile = /\.(txt|csv)$/i.test(file.name) || file.type === "text/plain" || file.type === "text/csv";
      if (textFile) {
        plaintextSelection = true;
        if (!unlocked) {
          setError("Primero crea o desbloquea la bóveda. Después importa el TXT/CSV desde Ajustes → Importar una lista de texto o CSV.");
          return;
        }
        setView("Ajustes");
        await readPlaintextFile(file);
        return;
      }
      if (file.size > 10_000_000) throw new Error("El archivo supera el límite de 10 MB.");
      const source = JSON.parse(await file.text()) as unknown;
      let restorePassphrase = passphrase;
      if (unlocked) {
        const promptValue = window.prompt("Escribe la frase maestra del respaldo cifrado para importarlo.");
        if (promptValue === null) return;
        restorePassphrase = promptValue;
      }
      if (!restorePassphrase) throw new Error("Escribe la frase maestra del respaldo antes de importarlo.");
      const restored = await decryptBackup(source, restorePassphrase);
      const incoming = normalizeCredentials(restored.entries);
      const existing = unlocked ? entries : [];
      const merge = existing.length > 0 && window.confirm("Aceptar: fusionar el respaldo con esta bóveda. Cancelar: reemplazar la bóveda local.");
      if (merge) {
        const merged = new Map(existing.map((entry) => [entry.id, entry]));
        incoming.forEach((entry) => merged.set(entry.id, entry));
        await saveEntries([...merged.values()]);
      } else {
        const normalizedBackup = await encryptEntries(incoming, restored.key, restored.backup.salt);
        await writeLocalBackup(normalizedBackup);
        finishUnlock(restored.key, restored.backup.salt, incoming);
      }
      notify(`${incoming.length} credenciales importadas desde respaldo cifrado.`);
    } catch { setError("No se pudo abrir el respaldo cifrado. Comprueba que sea un JSON de Clave y que la frase maestra sea correcta."); notify("No se pudo importar. Usa un respaldo cifrado JSON o el importador de listas TXT/CSV."); }
    finally { if (!plaintextSelection) setPassphrase(""); if (fileRef.current) fileRef.current.value = ""; }
  };

  const readPlaintextFile = async (file: File) => {
    let source = "";
    let fileBuffer: ArrayBuffer | null = null;
    try {
      if (file.size > 5_000_000) throw new Error("El archivo supera el límite de 5 MB.");
      fileBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(fileBuffer);
      if (bytes[0] === 0xff && bytes[1] === 0xfe) source = new TextDecoder("utf-16le").decode(bytes.subarray(2));
      else if (bytes[0] === 0xfe && bytes[1] === 0xff) source = new TextDecoder("utf-16be").decode(bytes.subarray(2));
      else {
        try { source = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
        catch { source = new TextDecoder("windows-1252").decode(bytes); }
      }
      setPlaintextImport(parsePlaintextCredentials(source));
      setError("");
    } catch (cause) {
      setPlaintextImport(null);
      notify(asError(cause, "No se pudo leer la lista. Comprueba el formato del archivo."));
    } finally {
      source = "";
      if (fileBuffer) new Uint8Array(fileBuffer).fill(0);
      fileBuffer = null;
      if (plaintextFileRef.current) plaintextFileRef.current.value = "";
    }
  };

  const commitPlaintextImport = async (mode: "merge" | "replace") => {
    if (!plaintextImport || !key || !salt) return;
    try {
      const incoming = plaintextImport.entries;
      let next = incoming;
      if (mode === "merge") {
        const merged = new Map<string, Credential>();
        const identity = (entry: Credential) => `${entry.title.trim().toLocaleLowerCase()}\u0000${entry.username.trim().toLocaleLowerCase()}`;
        entries.forEach((entry) => merged.set(identity(entry), entry));
        incoming.forEach((entry) => {
          const existing = merged.get(identity(entry));
          merged.set(identity(entry), existing ? { ...entry, id: existing.id } : entry);
        });
        next = [...merged.values()];
      }
      await saveEntries(next, key, salt);
      setPlaintextImport(null);
      notify(`${incoming.length} credenciales importadas y cifradas en este dispositivo.`);
    } catch (cause) {
      notify(asError(cause, "No se pudo guardar la lista importada."));
    }
  };

  const removeEntry = async (entry: Credential) => {
    if (!window.confirm(`¿Eliminar la credencial de ${entry.title}?`)) return;
    try { await saveEntries(entries.filter((item) => item.id !== entry.id)); notify("Credencial eliminada."); }
    catch (cause) { notify(asError(cause, "No se pudo eliminar.")); }
  };

  const wipeLocalVault = async () => {
    if (!window.confirm("Se eliminará la bóveda cifrada de este dispositivo. Asegúrate de tener un respaldo cifrado si quieres conservarla. ¿Continuar?")) return;
    try { await deleteLocalBackup(); setHasVault(false); lock(); notify("Bóveda local eliminada."); }
    catch (cause) { notify(asError(cause, "No se pudo eliminar la bóveda.")); }
  };

  const shownEntries = useMemo(() => {
    let result = [...entries];
    if (view === "Favoritos") result = result.filter((entry) => entry.favorite);
    if (view === "Débiles o repetidas") result = result.filter((entry) => incomplete(entry) || strength(entry.password) < 3 || duplicate(entry, entries));
    if (view === "Recientemente actualizadas") result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    if (search) result = result.filter((entry) => `${entry.title} ${entry.username} ${entry.url} ${entry.category} ${entry.notes}`.toLowerCase().includes(search.toLowerCase()));
    if (category !== "Todas las categorías") result = result.filter((entry) => entry.category === category);
    return result;
  }, [entries, view, search, category]);

  if (booting) return <main className="auth-screen"><div className="auth-container"><div className="auth-card"><Brand/><p className="subtitle">Abriendo almacenamiento local…</p></div><AppFooter className="auth-footer" /></div></main>;

  if (!unlocked) return <main className="auth-screen"><div className="auth-container"><section className="auth-card"><Brand/><h1>{hasVault ? "Desbloquea tu bóveda" : "Crea una bóveda local"}</h1><p className="subtitle">Tus claves permanecen cifradas en este dispositivo. Para moverlas a otro, exporta un archivo cifrado.</p>
    <form onSubmit={hasVault ? unlockVault : createVault}>
      <div className="field"><label htmlFor="master-pass">Frase maestra</label><input id="master-pass" type="password" autoComplete="current-password" minLength={hasVault ? 1 : 14} required value={passphrase} onChange={(event) => setPassphrase(event.target.value)} /></div>
      {!hasVault && <div className="field"><label htmlFor="confirm-pass">Repite la frase maestra</label><input id="confirm-pass" type="password" autoComplete="new-password" minLength={14} required value={confirmPassphrase} onChange={(event) => setConfirmPassphrase(event.target.value)} /></div>}
      {error && <div className="notice">{error}</div>}
      {!hasVault && <div className="security"><span>◈</span><div>Si pierdes la frase maestra y no tienes una copia cifrada, las claves no se pueden recuperar. Haz un respaldo y guarda la frase en un lugar seguro.</div></div>}
      <button className="primary auth-submit" disabled={busy}>{busy ? "Cifrando…" : hasVault ? "Desbloquear en este dispositivo" : "Crear bóveda cifrada"}</button>
    </form>
    <div className="import-entry"><button className="secondary" onClick={() => fileRef.current?.click()}>Importar respaldo cifrado o lista</button><input ref={fileRef} hidden type="file" accept="application/json,.json,.txt,.csv,text/plain,text/csv" onChange={(event) => event.target.files?.[0] && void importBackup(event.target.files[0])} /></div>
    <div className="auth-install-box"><PWAInstallButton variant="compact" /></div>
    <p className="local-note">No se usa cuenta, servidor de datos ni sincronización automática en la nube.</p>
  </section><AppFooter className="auth-footer" /></div></main>;

  const categories = [...new Set(entries.map((entry) => entry.category || "Personal"))];
  const reviewCount = entries.filter((entry) => incomplete(entry) || strength(entry.password) < 3 || duplicate(entry, entries)).length;
  const navItems: [View, string, string][] = [["Todo", "▦", "Todas las credenciales"], ["Favoritos", "☆", "Tus favoritos"], ["Débiles o repetidas", "◇", "Revisión de claves"], ["Recientemente actualizadas", "◷", "Actualizadas hace poco"], ["Ajustes", "⚙", "Importar y exportar"]];
  const editEntry = (entry?: Credential) => { setEditing(entry ?? null); setForm(entry ? { ...entry } : freshEntry()); setShowModalPassword(false); setModal(true); };
  const logOut = () => { lock(); setView("Todo"); };

  return <div className="layout"><aside className="sidebar"><Brand/><div className="nav"><div className="nav-label">BÓVEDA LOCAL</div>{navItems.slice(0, 4).map(([item, icon, label]) => <button key={item} className={view === item ? "active" : ""} onClick={() => setView(item)} title={label}><span className="icon">{icon}</span>{item}{item === "Todo" && <span className="nav-count">{entries.length}</span>}</button>)}<div className="nav-label">DATOS</div><button className={view === "Ajustes" ? "active" : ""} onClick={() => setView("Ajustes")}><span className="icon">⚙</span>Ajustes</button></div><div className="side-bottom"><button onClick={logOut} className="sidebar-lock-btn" title="Bloquear bóveda"><Image src="/icons/icon-192.png" alt="Bloquear" width={22} height={22} className="sidebar-lock-icon" /><span>Bloquear bóveda</span></button></div></aside>
    <main className="content"><div className="mobile-head"><Brand/><div className="mobile-head-actions"><PWAInstallButton variant="compact" /><button type="button" className="vault-lock-btn mobile-lock-btn" title="Bloquear aplicación" onClick={logOut}><Image src="/icons/icon-192.png" alt="Bloquear" width={26} height={26} className="vault-lock-btn-icon" /><span className="vault-lock-btn-text">Bloquear</span></button></div></div><header className="topbar"><div className="crumb">Solo en este dispositivo&nbsp; / &nbsp;{view}</div><div className="top-actions"><PWAInstallButton variant="button" /><button className="secondary" onClick={() => void exportBackup()}>↓ <span>Exportar cifrado</span></button><button type="button" className="vault-lock-btn" title="Bloquear aplicación y proteger datos" onClick={logOut}><Image src="/icons/icon-192.png" alt="Bloquear aplicación" width={28} height={28} className="vault-lock-btn-icon" /><span className="vault-lock-btn-text">Bloquear</span></button></div></header>
      <div className="title-row"><div><h1>{view === "Todo" ? "Todas las credenciales" : view}</h1><p className="subtitle">Cifrado local. Para sincronizar, mueve un respaldo cifrado entre tus dispositivos.</p></div><button className="primary" onClick={() => editEntry()}>＋ Añadir credencial</button></div>
      {view !== "Ajustes" && <><section className="stats"><div className="stat"><div className="stat-label">CREDENCIALES EN ESTE DISPOSITIVO</div><div className="stat-value">{entries.length}</div><div className="stat-note">Guardadas cifradas localmente</div></div><div className="stat"><div className="stat-label">CATEGORÍAS</div><div className="stat-value">{categories.length}</div><div className="stat-note">Cuentas agrupadas</div></div><div className="stat"><div className="stat-label">PARA REVISAR</div><div className="stat-value">{reviewCount}</div><div className="stat-note">Débiles, repetidas o incompletas</div></div></section>
      <div className="search-row"><div className="search"><span>⌕</span><input placeholder="Buscar por servicio, usuario o etiqueta…" value={search} onChange={(event) => setSearch(event.target.value)} /></div><select className="filter" value={category} onChange={(event) => setCategory(event.target.value)}><option>Todas las categorías</option>{categories.map((item) => <option key={item}>{item}</option>)}</select><button className="secondary" onClick={() => setShowPasswords((value) => !value)}>{showPasswords ? "Ocultar" : "Mostrar"}</button></div>
      <div className="table-wrap desktop-table-wrap"><table className="table"><thead><tr><th>SERVICIO / CUENTA</th><th>CATEGORÍA</th><th>CONTRASEÑA</th><th>ACTUALIZADA</th><th></th></tr></thead><tbody>{shownEntries.map((entry) => { const isRevealed = showPasswords || Boolean(revealedIds[entry.id]); return <tr key={entry.id}><td><div className="account"><div className="site-icon">{(entry.title || "?")[0].toUpperCase()}</div><div><div className="account-name">{entry.title || "Sin título"} {entry.favorite && <span className="favorite-star">★</span>}</div><div className="account-user">{entry.username}{entry.url && <span className="account-url"> · {entry.url.replace(/^https?:\/\//, "")}</span>}</div></div></div></td><td><span className="category">{entry.category || "Personal"}</span></td><td><div className="table-password-cell"><span className="masked-password">{isRevealed ? entry.password : "••••••••••"}</span><button type="button" className="icon-btn pass-peek-btn" title={isRevealed ? "Ocultar contraseña" : "Ver contraseña"} onClick={() => toggleReveal(entry.id)}>{isRevealed ? "🙈" : "👁"}</button></div>{(incomplete(entry) || strength(entry.password) < 3 || duplicate(entry, entries)) && <span className="warning" title={incomplete(entry) ? "Cuenta incompleta" : duplicate(entry, entries) ? "Cuenta o clave repetida" : "Contraseña débil"}>⚠</span>}</td><td className="date-cell">{new Date(entry.updatedAt).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}</td><td><div className="row-actions"><button className="icon-btn" title="Copiar contraseña" onClick={() => { void navigator.clipboard.writeText(entry.password); notify("Copiada al portapapeles."); }}>▣</button><button className="icon-btn" title="Editar" onClick={() => editEntry(entry)}>✎</button><button className="icon-btn" title="Eliminar" onClick={() => void removeEntry(entry)}>×</button></div></td></tr>; })}</tbody></table>{shownEntries.length === 0 && <div className="empty">{entries.length ? "No hay credenciales que coincidan." : "La bóveda está vacía. Añade tu primera credencial."}</div>}</div>
      <div className="mobile-cards-wrap">{shownEntries.map((entry) => { const isWeak = strength(entry.password) < 3; const isDup = duplicate(entry, entries); const isIncomp = incomplete(entry); const isRevealed = showPasswords || Boolean(revealedIds[entry.id]); return <div key={`m-${entry.id}`} className="cred-card"><div className="cred-card-header"><div className="cred-card-title-group"><div className="site-icon">{(entry.title || "?")[0].toUpperCase()}</div><div className="cred-card-meta"><div className="cred-card-name">{entry.title || "Sin título"} {entry.favorite && <span className="favorite-star">★</span>}</div><span className="category">{entry.category || "Personal"}</span></div></div><div className="row-actions"><button className="icon-btn" title="Copiar contraseña" onClick={() => { void navigator.clipboard.writeText(entry.password); notify("Copiada al portapapeles."); }}>▣</button><button className="icon-btn" title="Editar" onClick={() => editEntry(entry)}>✎</button><button className="icon-btn" title="Eliminar" onClick={() => void removeEntry(entry)}>×</button></div></div><div className="cred-card-details"><div className="cred-card-row"><span className="cred-detail-label">Usuario</span><span className="cred-detail-value">{entry.username || "—"}</span></div>{entry.url && <div className="cred-card-row"><span className="cred-detail-label">Sitio web</span><span className="cred-detail-value account-url">{entry.url.replace(/^https?:\/\//, "")}</span></div>}{entry.notes && <div className="cred-card-row"><span className="cred-detail-label">Notas</span><span className="cred-detail-value">{entry.notes}</span></div>}</div><div className="cred-card-password-row"><div className="cred-card-password-box"><span className="cred-detail-label">Clave</span><span className="masked-password">{isRevealed ? entry.password : "••••••••••"}</span><button type="button" className="icon-btn pass-peek-btn" title={isRevealed ? "Ocultar contraseña" : "Ver contraseña"} onClick={() => toggleReveal(entry.id)}>{isRevealed ? "🙈" : "👁"}</button>{(isIncomp || isWeak || isDup) && <span className="warning" title={isIncomp ? "Cuenta incompleta" : isDup ? "Cuenta o clave repetida" : "Contraseña débil"}>⚠ {isIncomp ? "Incompleta" : isDup ? "Repetida" : "Débil"}</span>}</div><button className="secondary cred-copy-btn" onClick={() => { void navigator.clipboard.writeText(entry.password); notify("Copiada al portapapeles."); }}>Copiar</button></div><div className="cred-card-footer"><span className="date-cell">Actualizada: {new Date(entry.updatedAt).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}</span></div></div>; })}{shownEntries.length === 0 && <div className="empty cred-card-empty">{entries.length ? "No hay credenciales que coincidan." : "La bóveda está vacía. Añade tu primera credencial."}</div>}</div></>}
      {view === "Ajustes" && <section className="table-wrap settings-card"><PWAInstallButton variant="card" className="settings-pwa-card" /><h2>Respaldos cifrados</h2><p className="subtitle">El archivo de sincronización está cifrado con tu frase maestra. Puedes guardarlo en Archivos o moverlo usando el método que prefieras.</p><div className="security"><span>◈</span><div>Al importarlo en otro dispositivo, introduce la misma frase maestra. El archivo nunca se sube desde esta aplicación.</div></div><div className="settings-actions"><button className="primary" onClick={() => void exportBackup()}>↓ Exportar respaldo cifrado</button><button className="secondary" onClick={() => fileRef.current?.click()}>↑ Importar respaldo cifrado o lista TXT/CSV</button><input ref={fileRef} hidden type="file" accept="application/json,.json,.txt,.csv,text/plain,text/csv" onChange={(event) => event.target.files?.[0] && void importBackup(event.target.files[0])} /></div><p className="subtitle format-note">Formato admitido: JSON cifrado de Clave v2 y respaldos cifrados v1 de la aplicación anterior. No se acepta ni se genera exportación sin cifrar.</p>
        <div className="plain-import"><h2>Importar una lista de texto o CSV</h2><p className="subtitle">Acepta archivos .txt, .csv y listas separadas por tabuladores o espacios. Reconoce encabezados como «Id Aplicacion Usuario Contraseña»; el ID se descarta y las aplicaciones con varias palabras se agrupan en una sola cuenta.</p><div className="notice">Estos archivos pueden contener contraseñas sin cifrar. Evita abrirlos o copiarlos en servicios en línea, selecciónalos solo en un dispositivo de confianza y elimina la copia en claro cuando confirmes la importación. El contenido se procesa en el navegador y se cifra al guardarlo.</div><div className="settings-actions"><button className="secondary" onClick={() => plaintextFileRef.current?.click()}>↑ Elegir archivo .txt o .csv</button><input ref={plaintextFileRef} hidden type="file" accept=".txt,.csv,text/plain,text/csv" onChange={(event) => event.target.files?.[0] && void readPlaintextFile(event.target.files[0])} /></div>
          {plaintextImport && <div className="import-preview"><h3>Vista previa de la lista</h3><p>{plaintextImport.entries.length} credenciales detectadas. Las contraseñas no se muestran en esta vista previa.</p><ul>{plaintextImport.entries.slice(0, 5).map((entry) => <li key={entry.id}><b>{entry.title}</b>{entry.username && <span> · {entry.username}</span>}</li>)}</ul>{plaintextImport.entries.length > 5 && <p>y {plaintextImport.entries.length - 5} más…</p>}<p className="mapping-list"><b>Asignación detectada</b>{plaintextImport.mapping.map((mapping) => <span key={mapping}>{mapping}</span>)}</p><div className="modal-actions"><button className="secondary" onClick={() => setPlaintextImport(null)}>Cancelar y descartar</button>{entries.length > 0 && <button className="secondary" onClick={() => void commitPlaintextImport("replace")}>Reemplazar bóveda</button>}<button className="primary" onClick={() => void commitPlaintextImport("merge")}>{entries.length > 0 ? "Añadir o actualizar" : "Importar y cifrar"}</button></div></div>}
        </div><div className="device-data"><div><b>Eliminar esta copia local</b><p>Primero exporta un respaldo si quieres conservar tus claves.</p></div><button className="secondary danger" onClick={() => void wipeLocalVault()}>Eliminar bóveda local</button></div><p className="local-note">La bóveda local no se copia automáticamente. Exporta un archivo después de cambios importantes y guarda varias copias seguras.</p></section>}
      {modal && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setModal(false)}><section className="modal"><h2>{editing ? "Editar credencial" : "Nueva credencial"}</h2><p className="modal-sub">La bóveda se cifra antes de guardarse en este dispositivo.</p><div className="form-grid"><div className="field"><label htmlFor="service">Servicio *</label><input id="service" autoFocus value={form.title} placeholder="Ej. Correo personal" onChange={(event) => setForm({ ...form, title: event.target.value })} /></div><div className="field"><label htmlFor="category">Categoría</label><input id="category" list="categories" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /><datalist id="categories"><option>Personal</option><option>Trabajo</option><option>Finanzas</option><option>Social</option><option>Compras</option></datalist></div><div className="field full"><label htmlFor="username">Usuario o correo *</label><input id="username" autoComplete="off" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} /></div><div className="field full"><label htmlFor="password">Contraseña</label><div className="password-control"><input id="password" autoComplete="new-password" type={showModalPassword ? "text" : "password"} value={form.password} placeholder="Introduce o genera una clave" onChange={(event) => setForm({ ...form, password: event.target.value })} /><button type="button" className="secondary modal-toggle-pass-btn" title={showModalPassword ? "Ocultar contraseña" : "Ver contraseña"} onClick={() => setShowModalPassword((v) => !v)}>{showModalPassword ? "Ocultar" : "Ver"}</button><button type="button" className="secondary modal-gen-pass-btn" title="Generar clave segura" onClick={() => setForm({ ...form, password: generatePassword() })}>⟳ Generar</button></div></div><div className="field full"><label htmlFor="url">Sitio web</label><input id="url" placeholder="https://…" value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} /></div><div className="field full"><label htmlFor="notes">Notas</label><textarea id="notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></div><label className="favorite-control"><input type="checkbox" checked={form.favorite} onChange={(event) => setForm({ ...form, favorite: event.target.checked })} /> Guardar en favoritos</label></div><div className="modal-actions"><button className="secondary" onClick={() => setModal(false)}>Cancelar</button><button className="primary" onClick={() => void saveEntry()}>Guardar credencial</button></div></section></div>}
      {toast && <div className="toast">{toast}</div>}
      <AppFooter />
    </main>
  </div>;
}
