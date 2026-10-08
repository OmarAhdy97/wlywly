import React, { useState } from 'react';
import { isEgyptMobile, normalizeEgyptPhone } from '../../lib/phone';

// Egyptian mobile number: typed freely, tidied to 01XXXXXXXXX when the field is left.
export default function PhoneField({ value, onChange, placeholder = '01X XXXX XXXX', ...rest }) {
  const [touched, setTouched] = useState(false);
  const v = value || '';
  const invalid = touched && v.trim() !== '' && !isEgyptMobile(v);
  return (
    <>
      <div className={`phone-field ${invalid ? 'is-invalid' : ''}`} dir="ltr">
        <span className="phone-prefix">+20</span>
        <input
          type="tel"
          inputMode="numeric"
          className="form-input"
          placeholder={placeholder}
          value={v}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {
            setTouched(true);
            const n = normalizeEgyptPhone(v);
            if (n && n !== v) onChange(n);
          }}
          {...rest}
        />
      </div>
      {invalid && <span className="form-hint is-error">رقم الموبايل المصري 11 رقماً ويبدأ بـ 010 أو 011 أو 012 أو 015.</span>}
    </>
  );
}
