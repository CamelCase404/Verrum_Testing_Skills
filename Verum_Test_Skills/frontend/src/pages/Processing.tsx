import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, XCircle, FileText } from "lucide-react";
import { api, ApiError } from "../api";
import type { LevelId, ReportResponse } from "../types";

interface Props {
    interviewId: string;
    level: LevelId;
    onReady: (report: ReportResponse) => void;
    onAbort: () => void;
}

type Phase = "pending" | "failed" | "not_found";

export default function Processing({
    interviewId,
    level,
    onReady,
    onAbort,
}: Props) {
    const [phase, setPhase] = useState<Phase>("pending");
    const [elapsed, setElapsed] = useState(0);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [attemptKey, setAttemptKey] = useState(0);

    useEffect(() => {
        let cancelled = false;
        let timer: number | undefined;

        const tick = async (attempt: number) => {
            if (cancelled) return;
            try {
                const report = await api.report(interviewId);
                if (cancelled) return;

                // Сохраняем отчёт в профиль пользователя (если залогинен)
                if (localStorage.getItem("token")) {
                    try {
                        await api.saveSkills(report);
                    } catch (e) {
                        // не блокируем показ отчёта, если сохранение упало
                        console.warn("Не удалось сохранить навыки:", e);
                    }
                }

                onReady(report);
            } catch (e) {
                if (cancelled) return;
                if (e instanceof ApiError && e.status === 404) {
                    setPhase("not_found");
                    return;
                }
                if (
                    e instanceof ApiError &&
                    (e.status === 409 || e.status === 0 || e.status >= 500)
                ) {
                    const backoff = Math.min(5000, 1200 + attempt * 400);
                    timer = window.setTimeout(() => tick(attempt + 1), backoff);
                    return;
                }
                setPhase("failed");
                setErrorMsg(e instanceof ApiError ? e.message : String(e));
            }
        };

        void tick(0);

        const started = Date.now();
        const el = window.setInterval(
            () => setElapsed(Math.round((Date.now() - started) / 1000)),
            500,
        );

        return () => {
            cancelled = true;
            if (timer) window.clearTimeout(timer);
            window.clearInterval(el);
        };
    }, [interviewId, onReady, attemptKey]);

    return (
        <div className="max-w-2xl mx-auto px-4 py-10">
            <div className="bg-card rounded-xl2 shadow-card p-8 text-center">
                {phase === "pending" && (
                    <>
                        <div className="mx-auto w-14 h-14 rounded-full bg-accentSoft text-accent flex items-center justify-center">
                            <Loader2 size={26} className="animate-spin" />
                        </div>
                        <h1 className="mt-4 text-[20px] font-bold">
                            Формируем отчёт…
                        </h1>
                        <p className="mt-1 text-[13px] text-muted">
                            GigaChat оценивает ответы по рубрике. Это может
                            занять до минуты.
                        </p>
                        <p className="mt-1 text-[12px] text-muted">
                            {elapsed} с · interview {interviewId.slice(0, 8)} ·{" "}
                            {level}
                        </p>
                    </>
                )}

                {phase === "not_found" && (
                    <>
                        <div className="mx-auto w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                            <XCircle size={26} />
                        </div>
                        <h1 className="mt-4 text-[20px] font-bold">
                            Интервью не найдено
                        </h1>
                        <p className="mt-1 text-[13px] text-muted">
                            Возможно, сессия была удалена или истекла. Начните
                            заново.
                        </p>
                        <button
                            onClick={onAbort}
                            className="mt-5 inline-flex items-center gap-2 rounded-xl2 bg-accent text-white px-4 py-2 font-medium"
                        >
                            <FileText size={16} /> На главную
                        </button>
                    </>
                )}

                {phase === "failed" && (
                    <>
                        <div className="mx-auto w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                            <AlertTriangle size={26} />
                        </div>
                        <h1 className="mt-4 text-[20px] font-bold">
                            Не удалось получить отчёт
                        </h1>
                        <p className="mt-1 text-[13px] text-red-600">
                            {errorMsg}
                        </p>
                        <div className="mt-5 flex gap-2 justify-center">
                            <button
                                onClick={() => {
                                    setPhase("pending");
                                    setErrorMsg(null);
                                    setAttemptKey((k) => k + 1);
                                }}
                                className="rounded-xl2 bg-accent text-white px-4 py-2 font-medium"
                            >
                                Повторить
                            </button>
                            <button
                                onClick={onAbort}
                                className="rounded-xl2 border border-divider px-4 py-2 font-medium"
                            >
                                На главную
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
