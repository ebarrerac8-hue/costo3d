import { useRef, useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { useApp } from '../context/AppContext';
import type { AppData } from '../models/types';
import { backupFileName, createBackup, parseBackup } from '../storage/backup';
import { downloadTextFile } from '../utils/download';
import { formatDateTime } from '../utils/format';

interface Pending { data: AppData; exportedAt: string | null; fileName: string }

export function BackupPage() {
  const { data, replaceAll, notify, loadExample } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, setPending] = useState<Pending | null>(null);

  const exportNow = () => {
    downloadTextFile(backupFileName(), JSON.stringify(createBackup(data), null, 2));
    notify('ok', 'Respaldo descargado');
  };

  const onFile = async (file: File | undefined) => {
    setErrors([]);
    if (!file) return;
    let text = '';
    try { text = await file.text(); } catch { setErrors(['No se pudo leer el archivo.']); return; }
    const result = parseBackup(text);
    if (!result.ok) { setErrors(result.errors); return; }
    setPending({ data: result.data, exportedAt: result.exportedAt, fileName: file.name });
  };

  return (
    <>
      <PageHeader title="Respaldo" subtitle="Tus datos viven en este navegador. Descarga una copia para no perderlos." />
      <div className="stack">
        <section className="card stack-sm">
          <h2>Exportar</h2>
          <p>Descarga un archivo JSON con tu configuración, filamentos y proyectos.</p>
          <dl className="mini-stats">
            <div><dt>Proyectos</dt><dd>{data.projects.length}</dd></div>
            <div><dt>Filamentos</dt><dd>{data.filaments.length}</dd></div>
          </dl>
          <div className="actions"><button type="button" className="btn primary" onClick={exportNow}><Icon name="download" />Exportar respaldo JSON</button></div>
        </section>

        <section className="card stack-sm">
          <h2>Importar</h2>
          <p>Elige un respaldo de Costo3D. Antes de reemplazar tus datos actuales, se te pedirá confirmación.</p>
          <input
            ref={fileRef} id="import-file" type="file" accept="application/json,.json" className="sr-only"
            onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ''; }}
          />
          <div className="actions"><button type="button" className="btn secondary" onClick={() => fileRef.current?.click()}><Icon name="upload" />Importar respaldo JSON</button></div>
          {errors.length > 0 && (
            <div className="callout error" role="alert">
              <Icon name="alert" />
              <div><p><strong>No se importó el archivo.</strong></p>{errors.map((e) => <p key={e}>{e}</p>)}</div>
            </div>
          )}
        </section>

        <section className="card stack-sm">
          <h2>Datos de ejemplo</h2>
          <p>Agrega 3 filamentos y 3 proyectos de muestra marcados como ejemplo. No reemplaza tus datos; puedes eliminarlos después.</p>
          <div className="actions"><button type="button" className="btn secondary" onClick={() => void loadExample()}>Cargar ejemplo</button></div>
        </section>
      </div>

      {pending && (
        <ConfirmDialog
          title="¿Reemplazar tus datos actuales?" confirmLabel="Reemplazar con el respaldo" danger
          onCancel={() => setPending(null)}
          onConfirm={async () => { const ok = await replaceAll(pending.data); if (ok) setPending(null); }}
        >
          <p>El archivo <strong>{pending.fileName}</strong>{pending.exportedAt ? ` (creado el ${formatDateTime(pending.exportedAt)})` : ''} contiene {pending.data.projects.length} proyectos y {pending.data.filaments.length} filamentos.</p>
          <p>Hoy tienes {data.projects.length} proyectos y {data.filaments.length} filamentos. Serán reemplazados.</p>
          <p><button type="button" className="link-btn" onClick={exportNow}>Descargar primero un respaldo de mis datos actuales</button></p>
        </ConfirmDialog>
      )}
    </>
  );
}
