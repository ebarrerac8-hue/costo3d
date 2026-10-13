import { useEffect, useRef, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { SettingsFields } from '../components/SettingsFields';
import { useApp } from '../context/AppContext';
import {
  SETTINGS_GROUPS, formToSettings, settingsToForm, validateSettingsForm, type SettingsErrors, type SettingsForm, type SettingsKey,
} from '../utils/settingsForm';

/** La configuración se guarda sola cuando todos los campos son válidos. */
export function SettingsPage() {
  const { data, saveSettings } = useApp();
  const [form, setForm] = useState<SettingsForm>(() => settingsToForm(data.settings));
  const [errors, setErrors] = useState<SettingsErrors>({});
  const [status, setStatus] = useState('Los cambios se guardan automáticamente.');
  const settingsRef = useRef(data.settings);
  settingsRef.current = data.settings;
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    const errs = validateSettingsForm(form);
    setErrors(errs);
    if (Object.keys(errs).length) { setStatus('Corrige los campos marcados: aún no se guardó el último cambio.'); return; }
    const timer = window.setTimeout(async () => {
      const ok = await saveSettings(formToSettings(form, settingsRef.current), { silent: true });
      if (ok) setStatus(`Guardado automáticamente a las ${new Date().toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}.`);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [form]);

  const onChange = (key: SettingsKey, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <>
      <PageHeader title="Configuración" subtitle="Se completa una sola vez. Estos valores se usan en todos tus cálculos." />
      <p className="save-status" role="status">{status}</p>
      <div className="stack">
        {SETTINGS_GROUPS.map((g) => (
          <section className="card" key={g.title}>
            <h2>{g.title}</h2>
            <p className="section-note">{g.description}</p>
            <SettingsFields keys={g.keys} form={form} errors={errors} onChange={onChange} />
            {g.title === 'Moneda' && <p className="field-hint">Moneda principal: quetzal guatemalteco (Q).</p>}
          </section>
        ))}
      </div>
    </>
  );
}
