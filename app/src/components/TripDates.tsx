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
      <label>
        <span className="muted">출발</span>
        <input type="date" value={a} min={today} onChange={(e) => commit(e.target.value, b)} />
      </label>
      <span className="muted" aria-hidden>
        ~
      </span>
      <label>
        <span className="muted">귀국</span>
        <input type="date" value={b} min={a || today} onChange={(e) => commit(a, e.target.value)} />
      </label>
      {(applied || a || b) && (
        <button
          className="trip-clear muted"
          onClick={() => {
            setA('');
            setB('');
            onClear();
          }}
        >
          지우기
        </button>
      )}
      <p className="muted trip-note">
        {applied
          ? `${formatDate(from!)} ~ ${formatDate(to!)} 여행 기간에 갈 수 있는 곳만 보여 줍니다.`
          : a && !b
            ? '귀국 날짜도 넣어 주세요.'
            : '날짜를 넣으면 그 기간에 끝나 버리는 기간 한정 후보를 걸러냅니다. (선택)'}
      </p>
    </div>
  );
}
