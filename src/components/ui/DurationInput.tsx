import { useEffect, useState } from 'react';
import { formatMinutes, parseDuration } from '@/lib/time';

interface DurationInputProps {
  /** minutos */
  value: number;
  onChange: (minutes: number) => void;
  id?: string;
}

const QUICK_ADD = [
  { label: '+15min', minutes: 15 },
  { label: '+30min', minutes: 30 },
  { label: '+1h', minutes: 60 },
];

/** Campo de tempo gasto: aceita "01h30", "1:30", "90" e tem atalhos de soma. */
export function DurationInput({ value, onChange, id }: DurationInputProps) {
  const [text, setText] = useState(formatMinutes(value));
  const [invalid, setInvalid] = useState(false);

  useEffect(() => setText(formatMinutes(value)), [value]);

  function commit() {
    const minutes = parseDuration(text);
    if (minutes === null) {
      if (text.trim() === '') {
        onChange(0);
        setInvalid(false);
        return;
      }
      setInvalid(true);
      return;
    }
    setInvalid(false);
    onChange(minutes);
    setText(formatMinutes(minutes));
  }

  return (
    <div className="duration-input">
      <input
        id={id}
        className="input"
        inputMode="text"
        placeholder="00h00"
        value={text}
        aria-invalid={invalid}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), commit())}
      />
      <div className="duration-input__quick">
        {QUICK_ADD.map((q) => (
          <button key={q.label} type="button" className="chip" onClick={() => onChange(value + q.minutes)}>
            {q.label}
          </button>
        ))}
      </div>
      {invalid && <span className="field__error">Use o formato 01h30.</span>}
    </div>
  );
}
