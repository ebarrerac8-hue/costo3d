import { useState } from 'react';
import { Icon } from '../components/Icon';
import { SettingsFields } from '../components/SettingsFields';
import { useApp } from '../context/AppContext';
import { navigate } from '../router';
import { formToSettings, settingsToForm, validateSettingsForm, type SettingsErrors, type SettingsKey } from '../utils/settingsForm';

const STEPS: { title: string; text: string; keys: SettingsKey[] }[] = [
  { title: 'Tu impresora', text: 'Con esto se reparte el costo de la máquina entre cada impresión.', keys: ['printerName', 'printerInvestment', 'printerLifetimeHours'] },
  { title: 'Consumo y trabajo', text: 'Sirve para calcular la electricidad y el valor de tu tiempo.', keys: ['powerWatts', 'electricityPricePerKwh', 'laborHourValue'] },
  { title: 'Ganancia y reservas', text: 'Puedes cambiar todo después en Configuración.', keys: ['profitMarginPct', 'failureRatePct', 'maintenancePct'] },
];

export function Onboarding() {
  const { data, saveSettings } = useApp();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => settingsToForm(data.settings));
  const [errors, setErrors] = useState<SettingsErrors>({});
  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  const next = async () => {
    const errs = validateSettingsForm(form, current.keys);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (!last) { setStep(step + 1); return; }
    const all = validateSettingsForm(form);
    if (Object.keys(all).length) { setErrors(all); return; }
    const ok = await saveSettings({ ...formToSettings(form, data.settings), setupCompleted: true }, { silent: true });
    if (ok) navigate('/nuevo');
  };

  return (
    <div className="onboarding">
      <div className="card onboarding-card">
        <p className="brand dark-text"><span className="brand-mark"><Icon name="cube" size={20} /></span>Costo3D</p>
        <h1>Configuremos lo esencial</h1>
        <p className="subtitle">Paso {step + 1} de {STEPS.length}: {current.title}. {current.text}</p>
        <div className="progress" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1} aria-label="Progreso del asistente">
          <span style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
        <SettingsFields keys={current.keys} form={form} errors={errors} onChange={(k, v) => setForm((f) => ({ ...f, [k]: v }))} />
        <div className="actions">
          {step > 0 && <button type="button" className="btn secondary" onClick={() => setStep(step - 1)}>Atrás</button>}
          <button type="button" className="btn primary" onClick={() => void next()}>{last ? 'Terminar y empezar' : 'Siguiente'}</button>
        </div>
      </div>
    </div>
  );
}
