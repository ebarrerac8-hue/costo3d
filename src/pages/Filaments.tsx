import { useState } from 'react';
import { costPerGram } from '../calculations/calculator';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { NumberField, SelectField, TextField } from '../components/Fields';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { useApp } from '../context/AppContext';
import { FILAMENT_TYPES, type Filament, type FilamentType } from '../models/types';
import { formatMoney, formatPerGram } from '../utils/format';
import { isInvalid, parseNumber } from '../utils/parse';

interface FilamentForm {
  id?: string; brand: string; name: string; type: FilamentType; spoolPrice: string; shipping: string;
  weight: string; color: string; currency: 'GTQ' | 'USD';
}

const blank = (): FilamentForm => ({ brand: '', name: '', type: 'PLA', spoolPrice: '', shipping: '', weight: '1000', color: '#f26a1b', currency: 'GTQ' });
const fromFilament = (f: Filament): FilamentForm => ({
  id: f.id, brand: f.brand, name: f.name, type: f.type, spoolPrice: String(f.spoolPrice),
  shipping: f.shippingAndTaxes ? String(f.shippingAndTaxes) : '', weight: String(f.spoolWeightGrams), color: f.color, currency: 'GTQ',
});

export function FilamentsPage() {
  const { data, saveFilament, deleteFilament } = useApp();
  const [form, setForm] = useState<FilamentForm | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toDelete, setToDelete] = useState<Filament | null>(null);
  const rate = data.settings.usdToGtq;

  const set = (patch: Partial<FilamentForm>) => setForm((f) => (f ? { ...f, ...patch } : f));

  const parsed = (f: FilamentForm) => {
    const errs: Record<string, string> = {};
    const num = (key: string, v: string, label: string, required: boolean, positive = false): number => {
      const n = parseNumber(v);
      if (n === null) { if (required) errs[key] = `${label}: este dato es necesario.`; return 0; }
      if (isInvalid(n)) errs[key] = `${label}: escribe un número.`;
      else if (n < 0) errs[key] = `${label}: no puede ser negativo.`;
      else if (positive && n <= 0) errs[key] = `${label}: debe ser mayor que 0.`;
      return n;
    };
    if (!f.brand.trim() && !f.name.trim()) errs.name = 'Escribe la marca o el nombre/color.';
    const price = num('spoolPrice', f.spoolPrice, 'Precio', true);
    const shipping = num('shipping', f.shipping, 'Envío e impuestos', false);
    const weight = num('weight', f.weight, 'Peso', true, true);
    const factor = f.currency === 'USD' && rate ? rate : 1;
    return { errs, price: price * factor, shipping: shipping * factor, weight };
  };

  const preview = form ? parsed(form) : null;
  const previewCpg = preview && !preview.errs.spoolPrice && !preview.errs.shipping && !preview.errs.weight && preview.weight > 0
    ? costPerGram({ spoolPrice: preview.price, shippingAndTaxes: preview.shipping, spoolWeightGrams: preview.weight })
    : null;

  const submit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!form) return;
    const p = parsed(form);
    setErrors(p.errs);
    if (Object.keys(p.errs).length) return;
    const ok = await saveFilament({
      id: form.id, brand: form.brand.trim(), name: form.name.trim(), type: form.type,
      spoolPrice: p.price, shippingAndTaxes: p.shipping, spoolWeightGrams: p.weight, color: form.color,
    });
    if (ok) { setForm(null); setErrors({}); }
  };

  const open = (f: FilamentForm) => { setForm(f); setErrors({}); window.setTimeout(() => document.getElementById('fil-brand')?.focus(), 0); };

  return (
    <>
      <PageHeader
        title="Filamentos"
        subtitle="Guarda tus bobinas frecuentes para no escribir precios en cada proyecto."
        actions={!form && <button type="button" className="btn primary" onClick={() => open(blank())}><Icon name="plus" />Nuevo filamento</button>}
      />

      {form && (
        <form className="card stack-sm" onSubmit={submit} noValidate>
          <h2>{form.id ? 'Editar filamento' : 'Nuevo filamento'}</h2>
          <div className="grid-2">
            <TextField id="fil-brand" label="Marca" value={form.brand} onChange={(v) => set({ brand: v })} maxLength={40} />
            <TextField id="fil-name" label="Nombre o color" value={form.name} onChange={(v) => set({ name: v })} maxLength={40} error={errors.name} />
            <SelectField id="fil-type" label="Tipo" value={form.type} onChange={(v) => set({ type: v as FilamentType })} options={FILAMENT_TYPES.map((t) => ({ value: t, label: t }))} />
            <div className="field">
              <label htmlFor="fil-color">Color visual</label>
              <input id="fil-color" type="color" value={form.color} onChange={(e) => set({ color: e.target.value })} />
            </div>
            {rate && !form.id && (
              <SelectField id="fil-currency" label="Moneda del precio" value={form.currency} onChange={(v) => set({ currency: v as 'GTQ' | 'USD' })}
                hint={form.currency === 'USD' ? `Se convertirá a quetzales a Q${rate} por dólar.` : undefined}
                options={[{ value: 'GTQ', label: 'Quetzales (Q)' }, { value: 'USD', label: 'Dólares (US$)' }]} />
            )}
            <NumberField id="fil-price" label="Precio pagado por la bobina" prefix={form.currency === 'USD' ? 'US$' : 'Q'} value={form.spoolPrice} onChange={(v) => set({ spoolPrice: v })} error={errors.spoolPrice} />
            <NumberField id="fil-ship" label="Envío e impuestos" hint="Opcional. Lo que pagaste de más por esta bobina." prefix={form.currency === 'USD' ? 'US$' : 'Q'} value={form.shipping} onChange={(v) => set({ shipping: v })} error={errors.shipping} />
            <NumberField id="fil-weight" label="Peso neto de la bobina" suffix="g" value={form.weight} onChange={(v) => set({ weight: v })} error={errors.weight} />
          </div>
          <p className="cpg-preview" aria-live="polite">
            Costo real por gramo: <strong>{previewCpg === null ? '—' : formatPerGram(previewCpg)}</strong>
          </p>
          <div className="actions">
            <button type="submit" className="btn primary">{form.id ? 'Guardar cambios' : 'Crear filamento'}</button>
            <button type="button" className="btn secondary" onClick={() => { setForm(null); setErrors({}); }}>Cancelar</button>
          </div>
        </form>
      )}

      {data.filaments.length === 0 && !form ? (
        <div className="empty card">
          <Icon name="spool" size={32} />
          <h2>Aún no tienes filamentos</h2>
          <p>Crea el primero para poder calcular un proyecto.</p>
          <button type="button" className="btn primary" onClick={() => open(blank())}><Icon name="plus" />Nuevo filamento</button>
        </div>
      ) : (
        <ul className="card-grid">
          {data.filaments.map((f) => (
            <li key={f.id} className="card filament-card">
              <div className="filament-head">
                <span className="dot" style={{ background: f.color }} aria-hidden="true" />
                <div>
                  <h3>{[f.brand, f.name].filter(Boolean).join(' ')}</h3>
                  <p className="muted">{f.type} · bobina de {f.spoolWeightGrams} g</p>
                </div>
              </div>
              <dl className="mini-stats">
                <div><dt>Costo por gramo</dt><dd>{formatPerGram(costPerGram(f))}</dd></div>
                <div><dt>Bobina + envío</dt><dd>{formatMoney(f.spoolPrice + f.shippingAndTaxes)}</dd></div>
              </dl>
              <div className="actions tight">
                <button type="button" className="btn secondary small" onClick={() => open(fromFilament(f))}><Icon name="edit" size={16} />Editar</button>
                <button type="button" className="btn ghost-danger small" onClick={() => setToDelete(f)}><Icon name="trash" size={16} />Eliminar</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {toDelete && (
        <ConfirmDialog
          title="¿Eliminar este filamento?" confirmLabel="Eliminar" danger
          onCancel={() => setToDelete(null)}
          onConfirm={() => { void deleteFilament(toDelete.id); setToDelete(null); }}
        >
          <p>Se eliminará <strong>{[toDelete.brand, toDelete.name].filter(Boolean).join(' ')}</strong>. Los proyectos ya guardados conservan el costo con el que se calcularon.</p>
        </ConfirmDialog>
      )}
    </>
  );
}
