import {
    CheckCircle2,
    XCircle,
    AlertTriangle,
    RotateCcw,
    BarChart3,
    Code2,
    Brain,
    MessageSquare,
    Terminal,
    Clock,
} from "lucide-react";
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

function ScoreBadge({
    score,
    label,
    icon: Icon,
}: {
    score?: number | null;
    label: string;
    icon: any;
}) {
    if (score === undefined || score === null) return null;
    let color = "bg-red-50 text-red-700";
    if (score >= 3) color = "bg-accentSoft text-accent";
    else if (score === 2) color = "bg-amber-100 text-amber-800";

    return (
        <div className="flex flex-col items-center justify-center p-3 rounded-xl2 border border-divider bg-white shadow-sm">
            <Icon size={20} className="text-muted mb-2" />
            <span className="text-[12px] text-muted text-center mb-1 leading-tight">
                {label}
            </span>
            <span
                className={`text-[15px] font-bold px-3 py-0.5 rounded-full ${color}`}
            >
                {score} / 4
            </span>
        </div>
    );
}

export default function Report({
    report,
    onRestart,
}: {
    report: ReportResponse;
    onRestart: () => void;
}) {
    const restartSameSettings = () => {
        const stack = report.stack_id;
        const langs = report.language_id.split(", ");
        const level = report.level;
        localStorage.setItem(
            "verum.lastSettings",
            JSON.stringify({ stack, langs, level }),
        );
        onRestart();
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-10 animate-in fade-in duration-500">
            <div className="bg-card rounded-xl2 shadow-card p-8 space-y-8">
                <header className="text-center border-b border-divider pb-6">
                    <h1 className="text-[28px] font-bold">
                        Результат интервью
                    </h1>
                    <p className="text-muted text-[14px] mt-1">
                        Уровень: {report.level} · Стек: {report.stack_id} ·
                        Язык: {report.language_id}
                    </p>
                </header>

                {!report.rejected && report.final_grade && (
                    <div className="flex flex-col items-center justify-center py-6 bg-page rounded-xl2 border border-divider">
                        <span className="text-[14px] text-muted uppercase tracking-widest mb-2">
                            Ваш итоговый уровень
                        </span>
                        <span
                            className={`text-[48px] font-black leading-none ${report.final_grade === "Reject" ? "text-red-600" : "text-accent"}`}
                        >
                            {report.final_grade}
                        </span>
                        {report.average_score && (
                            <span className="text-[14px] text-muted mt-2">
                                Средний балл: {report.average_score.toFixed(1)}{" "}
                                / 4.0
                            </span>
                        )}
                    </div>
                )}

                {report.rejected && (
                    <div className="rounded-xl2 border border-red-200 bg-red-50 px-6 py-4 flex items-start gap-4">
                        <XCircle className="text-red-600 mt-0.5" size={24} />
                        <div>
                            <div className="font-bold text-red-900 text-[16px]">
                                Интервью прервано
                            </div>
                            <div className="text-[14px] text-red-800 mt-1">
                                {report.reject_reason}
                            </div>
                        </div>
                    </div>
                )}

                {!report.rejected && (
                    <>
                        <section>
                            <h2 className="text-[16px] font-bold mb-4 flex items-center gap-2">
                                <BarChart3 size={18} /> Профиль компетенций
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <ScoreBadge
                                    score={report.competency_architecture}
                                    label="Архитектура"
                                    icon={Brain}
                                />
                                <ScoreBadge
                                    score={report.competency_code_review}
                                    label="Code Review"
                                    icon={Code2}
                                />
                                <ScoreBadge
                                    score={report.competency_prompting}
                                    label="Промптинг"
                                    icon={MessageSquare}
                                />
                                <ScoreBadge
                                    score={report.competency_ai_usage}
                                    label="Работа с ИИ"
                                    icon={Terminal}
                                />
                                <ScoreBadge
                                    score={report.competency_soft_skills}
                                    label="Soft Skills"
                                    icon={CheckCircle2}
                                />

                                {/* Время ответа */}
                                {report.average_time_seconds != null && (
                                    <div className="flex flex-col items-center justify-center p-3 rounded-xl2 border border-divider bg-white shadow-sm">
                                        <Clock
                                            size={20}
                                            className="text-muted mb-2"
                                        />
                                        <span className="text-[12px] text-muted text-center mb-1 leading-tight">
                                            Ср. время ответа
                                        </span>
                                        <span className="text-[15px] font-bold px-3 py-0.5 rounded-full bg-page text-ink">
                                            {report.average_time_seconds} сек
                                        </span>
                                        {report.time_efficiency_score !=
                                            null && (
                                            <span className="text-[10px] text-muted mt-1">
                                                Эффективность:{" "}
                                                {report.time_efficiency_score}/4
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </section>

                        <section>
                            <h2 className="text-[16px] font-bold mb-3">
                                Резюме
                            </h2>
                            <p className="text-[15px] leading-relaxed whitespace-pre-line text-ink/80">
                                {report.summary}
                            </p>
                        </section>

                        <div className="grid md:grid-cols-2 gap-6 pt-4">
                            <div className="bg-page rounded-xl2 p-5">
                                <h2 className="text-[14px] font-bold text-accent mb-3 flex items-center gap-2">
                                    <CheckCircle2 size={16} /> Сильные стороны
                                </h2>
                                <ul className="list-disc pl-5 text-[14px] space-y-1">
                                    {report.strengths.map((s, i) => (
                                        <li key={i}>{s}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className="bg-page rounded-xl2 p-5">
                                <h2 className="text-[14px] font-bold text-red-600 mb-3 flex items-center gap-2">
                                    <AlertTriangle size={16} /> Зоны роста
                                </h2>
                                <ul className="list-disc pl-5 text-[14px] space-y-1">
                                    {report.gaps.map((s, i) => (
                                        <li key={i}>{s}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </>
                )}

                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-6 border-t border-divider">
                    <button
                        onClick={restartSameSettings}
                        className="inline-flex items-center justify-center gap-2 rounded-xl2 bg-accent text-white px-6 py-3 font-medium hover:brightness-110 transition"
                    >
                        <RotateCcw size={18} /> Пройти заново (с новыми
                        вопросами)
                    </button>
                    <button
                        onClick={onRestart}
                        className="inline-flex items-center justify-center gap-2 rounded-xl2 border border-divider px-6 py-3 font-medium hover:bg-gray-50 transition"
                    >
                        На главную
                    </button>
                </div>
            </div>
        </div>
    );
}
