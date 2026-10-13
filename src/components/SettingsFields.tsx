import { NumberField, TextField } from './Fields';
import { SETTINGS_FIELDS, type SettingsErrors, type SettingsForm, type SettingsKey } from '../utils/settingsForm';

/** Dibuja los campos de configuración indicados (compartido por Configuración y el asistente). */
export function SettingsFields({ keys, form, errors, onChange }: {
  keys: SettingsKey[];
  form: SettingsForm;
  errors: SettingsErrors;
  onChange: (key: SettingsKey, value: string) => void;
}) {
  return (
    <div className="grid-2">
      {keys.map((key) => {
        const def = SETTINGS_FIELDS[key];
        const common = { id: `cfg-${key}`, label: def.label, hint: def.hint, error: errors[key], value: form[key], onChange: (v: string) => onChange(key, v) };
        return def.kind === 'text'
          ? <TextField key={key} {...common} maxLength={60} />
          : <NumberField key={key} {...common} prefix={def.prefix} suffix={def.suffix} />;
      })}
    </div>
  );
}
