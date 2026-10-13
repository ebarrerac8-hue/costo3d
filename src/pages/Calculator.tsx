import { useEffect, useState } from 'react';
import { costPerGram } from '../calculations/calculator';
import { NumberField, SelectField, TextField, Toggle } from '../components/Fields';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { useApp } from '../context/AppContext';
import type { Filament, Project, ProjectFormState } from '../models/types';
import { href, navigate } from '../router';
import { formatGrams, formatMoney, formatPerGram } from '../utils/format';
import { newId } from '../utils/id';
import {
  MAX_COLORS, emptyForm, filamentLabel, formFromProject, gramBreakdownCheck, hasAdvancedValues, isFormPristine, parseProjectForm,
} from '../utils/projectForm';

const FLASH_NOTE = 'Utiliza el consumo total mostrado por Flash Studio, incluyendo modelo, soportes, torre de limpieza y purgas, cuando corresponda.';

/** Perfil sugerido: el último que se usó en un proyecto o, si no hay, el primero. */
function suggestedFilamentId(filaments: Filament[], projects: Project[]): string {
  const last = [...projects].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const used = last?.input.usages[0]?.filamentId;
  if (used && filaments.some((f) => f.id === used)) return used;
  return filaments[0]?.id ?? '';
}

/** Hace compatible un borrador antiguo o incompleto con el formulario actual. */
function sanitizeDraft(raw: ProjectFormState, filaments: Filament[]): ProjectFormState {
  const base = emptyForm();
  const usages = Array.isArray(raw.usages) && raw.usages.length
    ? raw.usages.slice(0, MAX_COLORS).map((u) => ({
        filamentId: filaments.some((f) => f.id === u.filamentId) ? u.filamentId : '',
        grams: typeof u.grams === 'string' ? u.grams : '',
      }))
    : base.usages;
  return { ...base, ...raw, adv: { ...base.adv, ...(raw.adv ?? {}) }, usages };
}

export function CalculatorPage({ editId }: { editId?: string }) {
  const { data, saveProject, loadDraft, saveDraft, clearDraft } = useApp();
  const editing = editId ? data.projects.find((p) => p.id === editId) : undefined;
  const [form, setForm] = useState<ProjectFormState | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [draftNotice, setDraftNotice] = useState(false);
  const [saving, setSaving] = useState(false);
  const [advOpen, setAdvOpen] = useState(false);

  // Carga inicial: proyecto a editar, borrador guardado o formulario vacío.
  useEffect(() => {
    let cancelled = false;
    setErrors({});
    setFormErrors([]);
    setDraftNotice(false);
    if (editId) {
      const loaded = editing ? formFromProject(editing) : null;
      setForm(loaded);
      setAdvOpen(loaded ? hasAdvancedValues(loaded) : false);
      return;
    }
    const fresh = () => emptyForm(suggestedFilamentId(data.filaments, data.projects));
    void loadDraft().then((d) => {
      if (cancelled) return;
      if (d && d.form && !isFormPristine(sanitizeDraft(d.form, data.filaments))) {
        const restored = sanitizeDraft(d.form, data.filaments);
        setForm(restored);
        setAdvOpen(hasAdvancedValues(restored));
        setDraftNotice(true);
      } else {
        setForm(fresh());
      }
    });
    return () => { cancelled = true; };
  }, [editId]);

  // Borrador automático (solo para cálculos nuevos).
  useEffect(() => {
    if (!form || editId) return;
    const timer = window.setTimeout(() => {
      if (isFormPristine(form)) void clearDraft();
      else void saveDraft({ savedAt: new Date().toISOString(), form });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [form, editId]);

  if (editId && !editing) {
    return (
      <div className="empty card">
        <h2>No encontramos ese proyecto</h2>
        <p>Es posible que se haya eliminado.</p>
        <a className="btn primary" href={href('/proyectos')}>Ir a Mis proyectos</a>
      </div>
    );
  }
  if (!form) return null;

  const set = (patch: Partial<ProjectFormState>) => setForm((f) => (f ? { ...f, ...patch } : f));
  const setAdv = (key: keyof ProjectFormState['adv'], value: string) => setForm((f) => (f ? { ...f, adv: { ...f.adv, [key]: value } } : f));
  const setUsage = (i: number, patch: Partial<ProjectFormState['usages'][number]>) =>
    setForm((f) => (f ? { ...f, usages: f.usages.map((u, idx) => (idx === i ? { ...u, ...patch } : u)) } : f));

  const toggleMulticolor = (on: boolean) => {
    setForm((f) => {
      if (!f) return f;
      const usages = on && f.usages.length < 2 ? [...f.usages, { filamentId: '', grams: '' }] : f.usages;
      return { ...f, multicolor: on, usages };
    });
  };

  const reset = () => {
    setForm(emptyForm(suggestedFilamentId(data.filaments, data.projects)));
    setErrors({});
    setFormErrors([]);
    setDraftNotice(false);
    setAdvOpen(false);
    void clearDraft();
  };

  const submit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (saving) return;
    const parsed = parseProjectForm(form, data.filaments, data.settings, editing?.input.usages);
    setErrors(parsed.fieldErrors);
    setFormErrors(parsed.formErrors);
    if (!parsed.input || !parsed.result) {
      if (Object.keys(parsed.fieldErrors).some((k) => k.startsWith('adv.'))) setAdvOpen(true);
      window.setTimeout(() => (document.querySelector('[aria-invalid="true"]') as HTMLElement | null)?.focus(), 0);
      return;
    }
    const now = new Date().toISOString();
    const project: Project = {
      id: editing?.id ?? newId(),
      name: form.name.trim(),
      createdAt: editing?.createdAt ?? now,
      updatedAt: now,
      input: parsed.input,
      result: parsed.result,
      status: editing?.status ?? 'cotizacion',
      notes: form.notes.trim() || undefined,
      quoteNotes: form.quoteNotes.trim() || undefined,
    };
    setSaving(true);
    const ok = await saveProject(project, editing ? 'Proyecto actualizado' : 'Proyecto guardado');
    setSaving(false);
    if (ok) {
      if (!editing) await clearDraft();
      navigate(`/proyecto/${project.id}`);
    }
  };

  const active = form.multicolor ? form.usages.slice(0, MAX_COLORS) : form.usages.slice(0, 1);
  const check = gramBreakdownCheck(form);
  const previousUsages = editing?.input.usages ?? [];
  const optionsFor = (current: string) => {
    const opts = data.filaments.map((f) => ({ value: f.id, label: `${filamentLabel(f)} · ${f.type} · ${formatPerGram(costPerGram(f))}` }));
    const orphan = previousUsages.find((u) => u.filamentId === current && !data.filaments.some((f) => f.id === current));
    if (orphan) opts.push({ value: orphan.filamentId, label: `${orphan.label} (eliminado) · ${formatPerGram(orphan.costPerGram)}` });
    return opts;
  };
  const colorOf = (id: string) => data.filaments.find((f) => f.id === id)?.color ?? 'var(--border)';
  const s = data.settings;

  return (
    <>
      <PageHeader
        title={editing ? 'Editar proyecto' : 'Nuevo cálculo'}
        subtitle={editing ? 'Al guardar se recalcula con tu configuración y los precios de filamento actuales.' : 'Escribe los datos que te muestra Flash Studio y guarda el cálculo.'}
      />

      {data.filaments.length === 0 && (
        <div className="callout info">
          <Icon name="info" />
          <div>
            <p><strong>Primero crea un perfil de filamento.</strong> Así no tendrás que escribir su precio en cada proyecto.</p>
            <p><a href={href('/filamentos')}>Ir a Filamentos</a></p>
          </div>
        </div>
      )}
      {draftNotice && (
        <div className="callout info">
          <Icon name="info" />
          <div>
            <p>Recuperamos tu borrador anterior.</p>
            <p><button type="button" className="link-btn" onClick={reset}>Descartar borrador</button></p>
          </div>
        </div>
      )}

      <form className="stack" onSubmit={submit} noValidate>
        <section className="card stack-sm" aria-labelledby="datos-proyecto">
          <h2 id="datos-proyecto">Datos del proyecto</h2>
          <TextField id="p-name" label="Nombre del proyecto" value={form.name} onChange={(v) => set({ name: v })} error={errors.name} maxLength={80} placeholder="Ej.: Soporte para auriculares" />

          <fieldset className="field-group">
            <legend>Tiempo de impresión</legend>
            <div className="grid-2 tight">
              <NumberField id="p-hours" label="Horas" suffix="h" value={form.hours} onChange={(v) => set({ hours: v })} error={errors.hours} placeholder="0" />
              <NumberField id="p-minutes" label="Minutos" suffix="min" value={form.minutes} onChange={(v) => set({ minutes: v })} error={errors.minutes} placeholder="0" />
            </div>
            {errors.time && <p className="field-error" role="alert">{errors.time}</p>}
          </fieldset>

          <Toggle id="p-multicolor" label="Impresión multicolor" hint="Hasta cuatro filamentos en una misma pieza." checked={form.multicolor} onChange={toggleMulticolor} />

          <div className="usage-list">
            {active.map((u, i) => (
              <div key={i} className="usage-row">
                <span className="dot" style={{ background: colorOf(u.filamentId) }} aria-hidden="true" />
                <SelectField
                  id={`p-fil-${i}`} label={form.multicolor ? `Filamento ${i + 1}` : 'Perfil de filamento'}
                  value={u.filamentId} onChange={(v) => setUsage(i, { filamentId: v })} placeholder="Elige un perfil"
                  options={optionsFor(u.filamentId)} error={errors[`usage-${i}-filament`]}
                />
                <NumberField
                  id={`p-grams-${i}`} label={form.multicolor ? `Gramos del filamento ${i + 1}` : 'Gramos totales consumidos'}
                  suffix="g" value={u.grams} onChange={(v) => setUsage(i, { grams: v })} error={errors[`usage-${i}-grams`]}
                />
                {form.multicolor && active.length > 1 && (
                  <button type="button" className="icon-btn" aria-label={`Quitar filamento ${i + 1}`}
                    onClick={() => set({ usages: form.usages.filter((_, idx) => idx !== i) })}>
                    <Icon name="trash" />
                  </button>
                )}
              </div>
            ))}
            {form.multicolor && (
              <div className="usage-foot">
                {active.length < MAX_COLORS && (
                  <button type="button" className="btn secondary small" onClick={() => set({ usages: [...form.usages.slice(0, active.length), { filamentId: '', grams: '' }] })}>
                    <Icon name="plus" size={16} />Agregar color
                  </button>
                )}
                <span className="muted">Consumo total: <strong>{formatGrams(check.total)}</strong></span>
              </div>
            )}
          </div>

          <NumberField id="p-pieces" label="Cantidad de piezas producidas" value={form.pieces} onChange={(v) => set({ pieces: v })} error={errors.pieces} />

          <p className="callout info compact"><Icon name="info" /><span>{FLASH_NOTE}</span></p>
        </section>

        <details className="card advanced" open={advOpen} onToggle={(e) => setAdvOpen(e.currentTarget.open)}>
          <summary><span>Costos adicionales</span><span className="muted">Opcional</span></summary>
          <div className="stack-sm">
            <fieldset className="field-group">
              <legend>Desglose de filamento</legend>
              <div className="grid-3">
                <NumberField id="a-model" label="Gramos del modelo" suffix="g" value={form.adv.modelGrams} onChange={(v) => setAdv('modelGrams', v)} error={errors['adv.modelGrams']} />
                <NumberField id="a-support" label="Gramos de soportes" suffix="g" value={form.adv.supportGrams} onChange={(v) => setAdv('supportGrams', v)} error={errors['adv.supportGrams']} />
                <NumberField id="a-purge" label="Gramos de purga o torre" suffix="g" value={form.adv.purgeGrams} onChange={(v) => setAdv('purgeGrams', v)} error={errors['adv.purgeGrams']} />
              </div>
              {check.mismatch && (
                <p className="field-warn" role="status">
                  <Icon name="alert" size={16} />La suma ({formatGrams(check.breakdown)}) no coincide con el consumo total ({formatGrams(check.total)}). Puedes continuar de todos modos.
                </p>
              )}
            </fieldset>

            <fieldset className="field-group">
              <legend>Tiempo activo (tu trabajo)</legend>
              <div className="grid-3">
                <NumberField id="a-prep" label="Preparación" suffix="min" value={form.adv.prepMinutes} onChange={(v) => setAdv('prepMinutes', v)} error={errors['adv.prepMinutes']} />
                <NumberField id="a-design" label="Diseño o modificación" suffix="min" value={form.adv.designMinutes} onChange={(v) => setAdv('designMinutes', v)} error={errors['adv.designMinutes']} />
                <NumberField id="a-finish" label="Acabado y retiro de soportes" suffix="min" value={form.adv.finishMinutes} onChange={(v) => setAdv('finishMinutes', v)} error={errors['adv.finishMinutes']} />
              </div>
            </fieldset>

            <fieldset className="field-group">
              <legend>Otros costos</legend>
              <div className="grid-3">
                <NumberField id="a-pack" label="Costo de empaque" prefix="Q" placeholder={`Predeterminado: ${formatMoney(s.defaultPackagingCost)}`} value={form.adv.packagingCost} onChange={(v) => setAdv('packagingCost', v)} error={errors['adv.packagingCost']} />
                <NumberField id="a-delivery" label="Costo de entrega" prefix="Q" value={form.adv.deliveryCost} onChange={(v) => setAdv('deliveryCost', v)} error={errors['adv.deliveryCost']} />
                <NumberField id="a-other" label="Otros gastos" prefix="Q" value={form.adv.otherCosts} onChange={(v) => setAdv('otherCosts', v)} error={errors['adv.otherCosts']} />
              </div>
            </fieldset>

            <fieldset className="field-group">
              <legend>Venta de este proyecto</legend>
              <div className="grid-3">
                <NumberField id="a-compct" label="Comisión porcentual" suffix="%" placeholder={`General: ${s.commissionPct}`} value={form.adv.commissionPct} onChange={(v) => setAdv('commissionPct', v)} error={errors['adv.commissionPct']} />
                <NumberField id="a-comfix" label="Comisión fija" prefix="Q" placeholder={`General: ${s.commissionFixed}`} value={form.adv.commissionFixed} onChange={(v) => setAdv('commissionFixed', v)} error={errors['adv.commissionFixed']} />
                <NumberField id="a-margin" label="Margen de ganancia" suffix="%" placeholder={`General: ${s.profitMarginPct}`} value={form.adv.marginPct} onChange={(v) => setAdv('marginPct', v)} error={errors['adv.marginPct']} />
              </div>
              <p className="field-hint">Si los dejas vacíos se usan los valores generales de Configuración.</p>
            </fieldset>

            <div className="field">
              <label htmlFor="a-notes">Notas internas</label>
              <textarea id="a-notes" rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="a-quote-notes">Notas comerciales</label>
              <textarea id="a-quote-notes" rows={2} value={form.quoteNotes} onChange={(e) => set({ quoteNotes: e.target.value })} />
              <p className="field-hint">Aparecen en la cotización para el cliente.</p>
            </div>
          </div>
        </details>

        {formErrors.length > 0 && (
          <div className="callout error" role="alert">
            <Icon name="alert" />
            <div>{formErrors.map((m) => <p key={m}>{m}</p>)}</div>
          </div>
        )}
        {Object.keys(errors).length > 0 && (
          <div className="callout error" role="alert">
            <Icon name="alert" />
            <p>Revisa los campos marcados en rojo para poder calcular.</p>
          </div>
        )}

        <div className="actions sticky-actions">
          <button type="submit" className="btn primary large" disabled={saving}>Calcular y guardar</button>
          {editing
            ? <a className="btn secondary large" href={href(`/proyecto/${editing.id}`)}>Cancelar</a>
            : <button type="button" className="btn secondary large" onClick={reset}>Limpiar</button>}
        </div>
      </form>
    </>
  );
}
