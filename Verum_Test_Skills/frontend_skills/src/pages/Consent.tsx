import { useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import type { StartPayload } from '../App';

interface Props {
  payload: StartPayload;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function Consent({ payload, onConfirm, onCancel }: Props) {
  const [checked, setChecked] = useState(false);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="bg-card rounded-xl2 shadow-card p-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-accentSoft text-accent">
            <ShieldCheck size={20} />
          </span>
          <h1 className="text-[22px] font-bold">Согласие на запись интервью</h1>
        </div>

        <p className="mt-4 text-[14px] text-ink leading-relaxed">
          Для оценки компетенций мы записываем аудио и видео интервью. Запись хранится приватно,
          доступ к ней имеет только уполномоченный ревьюер. Транскрипт и отчёт формируются
          автоматически с помощью ИИ, финальное решение принимает человек.
        </p>

        <ul className="mt-4 text-[13px] text-muted list-disc pl-5 space-y-1">
          <li>Уровень: <span className="text-ink">{payload.level}</span></li>
          <li>Стек: <span className="text-ink">{payload.stackId}</span></li>
          <li>Язык: <span className="text-ink">{payload.languageId}</span></li>
          <li>Interview ID: <span className="text-ink font-mono text-[12px]">{payload.interviewId}</span></li>
        </ul>

        <label className="mt-6 flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1 w-4 h-4 accent-accent"
          />
          <span className="text-[13px] text-ink">
            Я согласен(а) на запись аудио и видео, обработку транскрипта и автоматическую
            оценку с помощью ИИ. Я понимаю, что могу прервать интервью в любой момент.
          </span>
        </label>

        <div className="mt-6 flex gap-2">
          <button
            disabled={!checked}
            onClick={onConfirm}
            className="flex-1 rounded-xl2 bg-accent text-white font-semibold py-3 disabled:opacity-40"
          >
            Подтвердить и начать
          </button>
          <button
            onClick={onCancel}
            className="inline-flex items-center gap-2 rounded-xl2 border border-divider px-4 py-3 text-[14px]"
          >
            <X size={16} /> Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
