import { CheckCircle2, XCircle, AlertTriangle, RotateCcw } from "lucide-react";
import type { Recommendation, ReportResponse } from "../types";

const REC_LABEL: Record<Recommendation, string> = {
    hire: "Рекомендация: нанять",
    no_hire: "Рекомендация: не нанимать",
    insufficient_evidence: "Недостаточно доказательств для решения",
};

function RecIcon({ rec }: { rec: Recommendation }) {
    if (rec === "hire")
        return <CheckCircle2 className="text-accent" size={20} />;
    if (rec === "no_hire")
        return <XCircle className="text-red-600" size={20} />;
    return <AlertTriangle className="text-amber-500" size={20} />;
}

function scoreColor(score: number): string {
    if (score >= 3) return "bg-accentSoft text-accent";
    if (score === 2) return "bg-amber-100 text-amber-800";
    return "bg-red-50 text-red-700";
}

export default function Report({
    report,
    onRestart,
}: {
    report: ReportResponse;
    onRestart: () => void;
}) {
    return (
        <div className="max-w-3xl mx-auto px-4 py-10">
            <div className="bg-card rounded-xl2 shadow-card p-8 space-y-6">
                <header>
                    <h1 className="text-[24px] font-bold">Отчёт по интервью</h1>
                    <p className="text-muted text-[13px] mt-1">
                        Уровень: {report.level} · Стек: {report.stack_id} ·
                        Язык: {report.language_id}
                    </p>
                </header>

                {report.rejected && (
                    <div className="rounded-xl2 border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
                        <XCircle className="text-red-600 mt-0.5" size={20} />
                        <div>
                            <div className="font-medium text-red-900">
                                Интервью прервано
                            </div>
                            <div className="text-[13px] text-red-800">
                                {report.reject_reason}
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-2 rounded-xl2 border border-divider px-4 py-3">
                    <RecIcon rec={report.recommendation} />
                    <span className="font-medium">
                        {REC_LABEL[report.recommendation]}
                    </span>
                </div>

                <section>
                    <h2 className="text-[13px] uppercase tracking-wide text-muted font-semibold">
                        Резюме
                    </h2>
                    <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-line">
                        {report.summary}
                    </p>
                </section>

                <section>
                    <h2 className="text-[13px] uppercase tracking-wide text-muted font-semibold">
                        Оценки по стадиям
                    </h2>
                    <ul className="mt-3 space-y-3">
                        {report.stages.map((s) => (
                            <li
                                key={s.stage}
                                className="rounded-xl2 border border-divider p-4"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">
                                        Стадия {s.stage}: {s.stage_name}
                                    </span>
                                    <span
                                        className={`text-[13px] rounded-full px-3 py-1 font-semibold ${scoreColor(s.score)}`}
                                    >
                                        {s.score} / 4
                                    </span>
                                </div>
                                {s.evidence.length > 0 && (
                                    <div className="mt-2 text-[13px]">
                                        <div className="text-muted">
                                            Доказательства:
                                        </div>
                                        <ul className="list-disc pl-5">
                                            {s.evidence.map((e, i) => (
                                                <li key={i}>{e}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {s.gaps.length > 0 && (
                                    <div className="mt-2 text-[13px]">
                                        <div className="text-muted">
                                            Пробелы:
                                        </div>
                                        <ul className="list-disc pl-5 text-red-700">
                                            {s.gaps.map((e, i) => (
                                                <li key={i}>{e}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                </section>

                {(report.code_review_score != null ||
                    report.prompt_skill_score != null) && (
                    <section>
                        <h2 className="text-[13px] uppercase tracking-wide text-muted font-semibold">
                            Навыки Code Review и Prompting
                        </h2>
                        <div className="mt-3 grid md:grid-cols-2 gap-3">
                            {report.code_review_score != null && (
                                <div className="rounded-xl2 border border-divider p-4">
                                    <div className="text-[13px] text-muted">
                                        Понимание кода (Code Review)
                                    </div>
                                    <div
                                        className={`mt-1 inline-block text-[13px] rounded-full px-3 py-1 font-semibold ${scoreColor(report.code_review_score)}`}
                                    >
                                        {report.code_review_score} / 4
                                    </div>
                                </div>
                            )}
                            {report.prompt_skill_score != null && (
                                <div className="rounded-xl2 border border-divider p-4">
                                    <div className="text-[13px] text-muted">
                                        Качество промпта
                                    </div>
                                    <div
                                        className={`mt-1 inline-block text-[13px] rounded-full px-3 py-1 font-semibold ${scoreColor(report.prompt_skill_score)}`}
                                    >
                                        {report.prompt_skill_score} / 4
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                <section className="grid md:grid-cols-2 gap-4">
                    <div>
                        <h2 className="text-[13px] uppercase tracking-wide text-muted font-semibold">
                            Сильные стороны
                        </h2>
                        <ul className="mt-2 list-disc pl-5 text-[14px]">
                            {report.strengths.length === 0 ? (
                                <li className="text-muted list-none">—</li>
                            ) : (
                                report.strengths.map((s, i) => (
                                    <li key={i}>{s}</li>
                                ))
                            )}
                        </ul>
                    </div>
                    <div>
                        <h2 className="text-[13px] uppercase tracking-wide text-muted font-semibold">
                            Зоны роста
                        </h2>
                        <ul className="mt-2 list-disc pl-5 text-[14px]">
                            {report.gaps.length === 0 ? (
                                <li className="text-muted list-none">—</li>
                            ) : (
                                report.gaps.map((s, i) => <li key={i}>{s}</li>)
                            )}
                        </ul>
                    </div>
                </section>

                <button
                    onClick={onRestart}
                    className="inline-flex items-center gap-2 rounded-xl2 bg-accent text-white px-4 py-2 font-medium"
                >
                    <RotateCcw size={16} /> Пройти ещё раз
                </button>
            </div>
        </div>
    );
}
