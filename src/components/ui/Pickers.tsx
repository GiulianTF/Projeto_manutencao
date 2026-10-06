import {
  DEMAND_STATUSES,
  PRIORITIES,
  PRIORITY_LABEL,
  STATUS_LABEL,
  type DemandStatus,
  type Priority,
} from '@/types/domain';

interface ChipOption<T extends string> {
  value: T;
  label: string;
  className?: string;
}

interface ChipPickerProps<T extends string> {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  disabled?: boolean;
}

/** Grupo de chips de seleção única — um toque, sem abrir menus. */
export function ChipPicker<T extends string>({ options, value, onChange, label, disabled }: ChipPickerProps<T>) {
  return (
    <div className="chip-group" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`chip ${o.className ?? ''}`}
          aria-pressed={o.value === value}
          disabled={disabled}
          onClick={() => o.value !== value && onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const STATUS_OPTIONS = DEMAND_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s], className: `chip--status-${s}` }));
const PRIORITY_OPTIONS = PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABEL[p], className: `chip--priority-${p}` }));

export function StatusPicker(props: { value: DemandStatus; onChange: (s: DemandStatus) => void; disabled?: boolean }) {
  return <ChipPicker label="Status" options={STATUS_OPTIONS} {...props} />;
}

export function PriorityPicker(props: { value: Priority; onChange: (p: Priority) => void; disabled?: boolean }) {
  return <ChipPicker label="Prioridade" options={PRIORITY_OPTIONS} {...props} />;
}
