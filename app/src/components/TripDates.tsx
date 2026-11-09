import { useEffect, useState } from 'react';
import { formatDate } from '../lib/dates';

interface Props {
  from: string | null;
  to: string | null;
  today: string;
  onChange: (from: string, to: string) => void;
  onClear: () => void;
}

// 출발·귀국 날짜. 둘 다 있어야 URL(from/to)에 반영한다. 귀국이 출발보다 빠르면 출발에 맞춘다.
export function TripDates({ from, to, today, onChange, onClear }: Props) {
  const [a, setA] = useState(from ?? '');
  const [b, setB] = useState(to ?? '');

  useEffect(() => {
    setA(from ?? '');
    setB(to ?? '');
  }, [from, to]);

  const commit = (na: string, nb: string) => {
    if (na && nb && nb < na) nb = na;
    setA(na);
    setB(nb);
    if (na && nb) onChange(na, nb);
  };

  const applied = !!(from && to);

  return (
    <div className="trip" role="group" aria-label="여행 날짜">
      <div className="trip-row">
        <label className="field">
          <span className="field-label">출발</span>
          <input type="date" value={a} min={today} onChange={(e) => commit(e.target.value, b)} />
        </label>
        <span className="trip-tilde" aria-hidden>
          ~
        </span>
        <label className="field">
          <span className="field-label">귀국</span>
          <input type="date" value={b} min={a || today} onChange={(e) => commit(a, e.target.value)} />
        </label>
      </div>
      <div className="trip-foot">
        <p className={`trip-note${applied ? ' applied' : ''}`}>
          {applied
            ? `${formatDate(from!)} ~ ${formatDate(to!)} 여행 기간에 갈 수 있는 곳만 보여 줘요.`
            : a && !b
              ? '귀국 날짜도 넣어 주세요.'
              : '날짜를 넣으면 여행 전에 끝나는 기간 한정 소식을 걸러 줘요. (선택)'}
        </p>
        {(applied || a || b) && (
          <button
            className="btn btn--text"
            onClick={() => {
              setA('');
              setB('');
              onClear();
            }}
          >
            지우기
          </button>
        )}
      </div>
    </div>
  );
}
