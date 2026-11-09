import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { addMonths, formatYmd, monthGrid } from '../lib/dates';
import { Icon } from './Icon';

// 날짜 고르기 바텀 시트 — docs/DESIGN.md §2.3
//   range: 출발·귀국을 한 달력에서 차례로 누른다. 둘 다 고르면 "이 날짜로 정하기".
//   single: 날짜를 누르면 바로 정하고 닫는다.
// 브라우저 기본 date 입력은 기기 언어에 따라 mm/dd/yyyy로 보여서 직접 그린다.

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

type Props = {
  title: string;
  min: string;
  onClose: () => void;
  onClear?: () => void;
} & (
  | { mode: 'range'; from?: string; to?: string; onConfirm: (from: string, to: string) => void }
  | { mode: 'single'; value?: string; onConfirm: (value: string) => void }
);

function nights(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

function longLabel(d: string): string {
  const [y, m, day] = d.split('-').map(Number);
  return `${y}년 ${m}월 ${day}일`;
}

export function DateSheet(props: Props) {
  const { title, min, onClose, onClear } = props;
  const initial = props.mode === 'range' ? props.from : props.value;
  const [start, setStart] = useState(props.mode === 'range' ? (props.from ?? '') : (props.value ?? ''));
  const [end, setEnd] = useState(props.mode === 'range' ? (props.to ?? '') : '');
  const [month, setMonth] = useState((initial && initial >= min ? initial : min).slice(0, 7));
  const sheetRef = useRef<HTMLDivElement>(null);
  const today = min;

  // 열릴 때 시트에 포커스, 닫힐 때 원래 자리로. Esc로 닫는다. 뒤 화면은 스크롤을 막는다.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    sheetRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      prev?.focus();
    };
  }, []);

  const pick = (d: string) => {
    if (props.mode === 'single') {
      props.onConfirm(d);
      onClose();
      return;
    }
    if (!start || end || d < start) {
      setStart(d);
      setEnd('');
    } else {
      setEnd(d);
    }
  };

  const minMonth = min.slice(0, 7);
  const weeks = monthGrid(month);
  const [y, m] = month.split('-').map(Number);

  const status =
    props.mode === 'range'
      ? !start
        ? '출발 날짜를 눌러 주세요.'
        : !end
          ? '귀국 날짜를 눌러 주세요.'
          : `${nights(start, end)}박 ${nights(start, end) + 1}일`
      : null;

  return createPortal(
    <div className="sheet-root">
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={sheetRef}>
        <div className="sheet-handle" aria-hidden />
        <div className="sheet-head">
          <h2 className="sheet-title">{title}</h2>
          <button className="icon-btn" aria-label="닫기" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>

        {props.mode === 'range' && (
          <div className="cal-summary">
            <div className={`cal-summary-item${!start ? ' active' : ''}`}>
              <span className="cal-summary-label">출발</span>
              <span className={start ? 'cal-summary-value' : 'cal-summary-value placeholder'}>
                {start ? formatYmd(start) : 'YYYY/MM/DD'}
              </span>
            </div>
            <span className="cal-summary-arrow" aria-hidden>
              <Icon name="forward" size={16} />
            </span>
            <div className={`cal-summary-item${start && !end ? ' active' : ''}`}>
              <span className="cal-summary-label">귀국</span>
              <span className={end ? 'cal-summary-value' : 'cal-summary-value placeholder'}>
                {end ? formatYmd(end) : 'YYYY/MM/DD'}
              </span>
            </div>
          </div>
        )}

        <div className="cal">
          <div className="cal-nav">
            <button
              className="icon-btn"
              aria-label="이전 달"
              disabled={month <= minMonth}
              onClick={() => setMonth(addMonths(month, -1))}
            >
              <Icon name="back" size={20} />
            </button>
            <span className="cal-month" aria-live="polite">
              {y}년 {m}월
            </span>
            <button className="icon-btn" aria-label="다음 달" onClick={() => setMonth(addMonths(month, 1))}>
              <Icon name="forward" size={20} />
            </button>
          </div>
          <div className="cal-grid" role="grid">
            <div className="cal-row" role="row">
              {WEEK.map((w) => (
                <span key={w} className="cal-week" role="columnheader">
                  {w}
                </span>
              ))}
            </div>
            {weeks.map((week, i) => (
              <div className="cal-row" role="row" key={i}>
                {week.map((d, j) => {
                  if (!d) return <span key={j} className="cal-cell" role="gridcell" />;
                  const disabled = d < min;
                  const isStart = d === start;
                  const isEnd = props.mode === 'range' && d === end;
                  const inRange = props.mode === 'range' && !!start && !!end && d > start && d < end;
                  const cls = [
                    'cal-cell',
                    inRange && 'in-range',
                    isStart && end && end !== start && 'range-start',
                    isEnd && end !== start && 'range-end',
                  ]
                    .filter(Boolean)
                    .join(' ');
                  return (
                    <span key={d} className={cls} role="gridcell">
                      <button
                        className={`cal-day${isStart || isEnd ? ' selected' : ''}${d === today ? ' today' : ''}`}
                        disabled={disabled}
                        aria-pressed={isStart || isEnd}
                        aria-label={`${longLabel(d)}${d === today ? ' 오늘' : ''}`}
                        onClick={() => pick(d)}
                      >
                        {Number(d.slice(8))}
                      </button>
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="sheet-foot">
          {props.mode === 'range' ? (
            <>
              <p className="sheet-status" role="status">
                {status}
              </p>
              <div className="sheet-actions">
                {(start || onClear) && (
                  <button
                    className="btn btn--lg btn--neutral-weak"
                    onClick={() => {
                      setStart('');
                      setEnd('');
                      onClear?.();
                    }}
                  >
                    다시 고르기
                  </button>
                )}
                <button
                  className="btn btn--lg btn--brand-solid"
                  disabled={!start || !end}
                  onClick={() => {
                    props.onConfirm(start, end);
                    onClose();
                  }}
                >
                  이 날짜로 정하기
                </button>
              </div>
            </>
          ) : (
            onClear &&
            props.value && (
              <div className="sheet-actions">
                <button
                  className="btn btn--lg btn--neutral-weak"
                  onClick={() => {
                    onClear();
                    onClose();
                  }}
                >
                  날짜 지우기
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// 날짜 입력 칸. 누르면 DateSheet를 연다. 값은 YYYY/MM/DD로 보여 준다.
export function DateField({
  label,
  value,
  onOpen,
  inline,
}: {
  label: string;
  value?: string;
  onOpen: () => void;
  inline?: boolean;
}) {
  return (
    <div className={`field${inline ? ' field--inline' : ''}`}>
      <span className="field-label">{label}</span>
      <button
        type="button"
        className={`field-control${value ? '' : ' is-empty'}`}
        aria-label={`${label} ${value ? formatYmd(value) : '날짜 고르기'}`}
        onClick={onOpen}
      >
        <span>{value ? formatYmd(value) : 'YYYY/MM/DD'}</span>
        <Icon name="calendar" size={inline ? 18 : 20} />
      </button>
    </div>
  );
}
