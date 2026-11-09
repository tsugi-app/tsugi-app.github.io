import { useState } from 'react';
import { formatDate } from '../lib/dates';
import { DateField, DateSheet } from './DateSheet';

interface Props {
  from: string | null;
  to: string | null;
  today: string;
  onChange: (from: string, to: string) => void;
  onClear: () => void;
}

// 출발·귀국 날짜. 어느 칸을 눌러도 같은 달력 시트가 열리고, 출발→귀국 순서로 누른다.
// 둘 다 고른 뒤 "이 날짜로 정하기"를 눌러야 URL(from/to)에 반영한다.
export function TripDates({ from, to, today, onChange, onClear }: Props) {
  const [open, setOpen] = useState(false);
  const applied = !!(from && to);

  return (
    <div className="trip" role="group" aria-label="여행 날짜">
      <div className="trip-row">
        <DateField label="출발" value={from ?? undefined} onOpen={() => setOpen(true)} />
        <span className="trip-tilde" aria-hidden>
          ~
        </span>
        <DateField label="귀국" value={to ?? undefined} onOpen={() => setOpen(true)} />
      </div>
      <div className="trip-foot">
        <p className={`trip-note${applied ? ' applied' : ''}`}>
          {applied
            ? `${formatDate(from!)} ~ ${formatDate(to!)} 여행 기간에 갈 수 있는 곳만 보여 줘요.`
            : '날짜를 넣으면 여행 전에 끝나는 기간 한정 소식을 걸러 줘요. (선택)'}
        </p>
        {applied && (
          <button className="btn btn--text" onClick={onClear}>
            지우기
          </button>
        )}
      </div>
      {open && (
        <DateSheet
          mode="range"
          title="여행 날짜"
          min={today}
          from={from ?? undefined}
          to={to ?? undefined}
          onConfirm={onChange}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
