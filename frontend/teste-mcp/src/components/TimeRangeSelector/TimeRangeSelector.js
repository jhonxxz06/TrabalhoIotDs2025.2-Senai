import React, { useState, useEffect, useRef } from 'react';
import './TimeRangeSelector.css';

const IconClock = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IconClockSm = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IconCalendar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IconChevron = ({ open }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const OPTIONS = [
  { type: 'live',   label: 'Ao vivo',        icon: 'live' },
  { type: 'today',  label: 'Hoje',           icon: 'clock' },
  { type: '7days',  label: 'Últimos 7 dias', icon: 'clock' },
  { type: 'custom', label: 'Personalizado',  icon: 'calendar' },
];

function TimeRangeSelector({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(value?.from || '');
  const [customTo, setCustomTo] = useState(value?.to || '');
  const [customError, setCustomError] = useState('');
  const ref = useRef(null);

  const currentOption = OPTIONS.find(o => o.type === value?.type) || OPTIONS[0];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (type) => {
    if (type === 'custom') return; // fica aberto para preencher as datas
    onChange({ type, from: null, to: null });
    setOpen(false);
  };

  const handleApplyCustom = () => {
    if (!customFrom || !customTo) {
      setCustomError('Preencha as duas datas.');
      return;
    }
    if (customFrom > customTo) {
      setCustomError('A data inicial deve ser anterior à final.');
      return;
    }
    setCustomError('');
    onChange({ type: 'custom', from: customFrom, to: customTo });
    setOpen(false);
  };

  const getLabel = () => {
    if (value?.type === 'custom' && value.from && value.to) {
      return `${value.from.split('-').reverse().join('/')} – ${value.to.split('-').reverse().join('/')}`;
    }
    return currentOption.label;
  };

  return (
    <div className="trs-wrapper" ref={ref}>
      <button
        className="trs-trigger"
        onClick={() => setOpen(prev => !prev)}
        title="Selecionar período"
      >
        {value?.type === 'live' ? (
          <span className="trs-live-dot" />
        ) : (
          <IconClock />
        )}
        <span className="trs-label">{getLabel()}</span>
        <IconChevron open={open} />
      </button>

      {open && (
        <div className="trs-dropdown">
          {OPTIONS.map(opt => (
            <div key={opt.type}>
              <button
                className={`trs-option ${value?.type === opt.type ? 'active' : ''}`}
                onClick={() => handleSelect(opt.type)}
              >
                {opt.icon === 'live' ? (
                  <span className="trs-live-dot-sm" />
                ) : opt.icon === 'calendar' ? (
                  <IconCalendar />
                ) : (
                  <IconClockSm />
                )}
                {opt.label}
              </button>

              {opt.type === 'custom' && value?.type === 'custom' || (opt.type === 'custom' && open) ? (
                <div className="trs-custom-panel">
                  <div className="trs-date-row">
                    <label>De</label>
                    <input
                      type="date"
                      value={customFrom}
                      max={customTo || undefined}
                      onChange={e => { setCustomFrom(e.target.value); setCustomError(''); }}
                    />
                  </div>
                  <div className="trs-date-row">
                    <label>Até</label>
                    <input
                      type="date"
                      value={customTo}
                      min={customFrom || undefined}
                      onChange={e => { setCustomTo(e.target.value); setCustomError(''); }}
                    />
                  </div>
                  {customError && <p className="trs-error">{customError}</p>}
                  <button className="trs-apply" onClick={handleApplyCustom}>Aplicar</button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TimeRangeSelector;
