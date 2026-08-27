import React from 'react';

interface HoneypotFieldProps {
  value: string;
  onChange: (val: string) => void;
}

/**
 * Invisible Honeypot field to trap and block automated spam bots
 * Real human users will never see or fill this field.
 */
export function HoneypotField({ value, onChange }: HoneypotFieldProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        opacity: 0,
        position: 'absolute',
        top: 0,
        left: 0,
        height: 0,
        width: 0,
        zIndex: -1,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
      tabIndex={-1}
    >
      <label htmlFor="website_hp_confirm">Jangan isi kolom ini jika Anda manusia</label>
      <input
        type="text"
        id="website_hp_confirm"
        name="website_hp_confirm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
      />
    </div>
  );
}
