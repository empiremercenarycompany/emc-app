import type { ReactNode } from "react";

type ChoiceProps = {
  name?: string;
  value?: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  children: ReactNode;
};

/** Compact checkbox. The label sits inline, and the whole row is the tap target. */
export function Choice({ name, value = "on", defaultChecked, checked, onChange, children }: ChoiceProps) {
  return (
    <label className="choice">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        checked={checked}
        onChange={onChange ? (event) => onChange(event.target.checked) : undefined}
      />
      <span className="choice-mark" aria-hidden="true" />
      <span className="choice-label">{children}</span>
    </label>
  );
}

type RadioProps = {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
};

export function RadioChoice({ name, value, checked, onChange, children }: RadioProps) {
  return (
    <label className="choice">
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} />
      <span className="choice-mark radio" aria-hidden="true" />
      <span className="choice-label">{children}</span>
    </label>
  );
}
