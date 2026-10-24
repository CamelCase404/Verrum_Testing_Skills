import {
    CheckCircle2,
    XCircle,
    AlertTriangle,
    RotateCcw,
    BarChart3,
    Brain,
    Code2,
    MessageSquare,
    Terminal,
    Layers,
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

// Компонент полосы прогресса
function StatBar({
    label,
    score,
    icon: Icon,
}: {
    label: string;
    score?: number | null;
    icon: any;
}) {
    if (score === undefined || score === null) return null;

    let color = "bg-red-500";
    if (score >= 80)
        color = "bg-accent"; // Только от 80 зеленый
    else if (score >= 50)
        color = "bg-amber-500"; // 50-79 желтый
    else color = "bg-red-500"; // < 50 красный

    return (
        <div className="mb-5">
            <div className="flex justify-between items-center text-[14px] mb-1.5">
                <span className="font-medium text-ink flex items-center gap-2">
                    <Icon size={16} className="text-muted" /> {label}
                </span>
                <span className="font-bold text-ink">{score} / 100</span>
            </div>
            <div className="h-2.5 w-full bg-page rounded-full overflow-hidden">
                <div
                    className={`h-full ${color} transition-all duration-1000 ease-out`}
                    style={{ width: `${score}%` }}
                />
            </div>
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
                {/* Заголовок */}
                <header className="text-center border-b border-divider pb-6">
                    <h1 className="text-[28px] font-bold text-ink">
                        Результат интервью
                    </h1>
                    <p className="text-muted text-[14px] mt-1">
                        Уровень: {report.level} · Стек: {report.stack_id} ·
                        Язык: {report.language_id}
                    </p>
                </header>

                {/* Итоговый уровень (Junior/Middle/Senior/Reject) */}
                {!report.rejected && report.final_grade && (
                    <div className="flex flex-col items-center justify-center py-8 bg-page rounded-xl2 border border-divider">
                        <span className="text-[14px] text-muted uppercase tracking-widest mb-2">
                            Ваш итоговый уровень
                        </span>
                        <span
                            className={`text-[56px] font-black leading-none ${
                                report.final_grade === "Reject" ||
                                report.final_grade === "Junior"
                                    ? "text-red-600"
                                    : report.final_grade === "Middle"
                                      ? "text-amber-500"
                                      : "text-accent"
                            }`}
                        >
                            {report.final_grade}
                        </span>

                        {report.total_score_100 !== undefined &&
                            report.total_score_100 !== null && (
                                <div className="mt-4 flex flex-col items-center w-full max-w-xs">
                                    <span className="text-[16px] font-bold text-ink mb-2">
                                        Общий балл: {report.total_score_100} /
                                        100
                                    </span>
                                    <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${
                                                report.total_score_100 >= 80
                                                    ? "bg-accent"
                                                    : report.total_score_100 >=
                                                        50
                                                      ? "bg-amber-500"
                                                      : "bg-red-600"
                                            }`}
                                            style={{
                                                width: `${report.total_score_100}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                    </div>
                )}

                {/* Блок, если кандидат провалил интервью */}
                {report.rejected && (
                    <div className="rounded-xl2 border border-red-200 bg-red-50 px-6 py-5 flex items-start gap-4">
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

                {/* Статистика и Резюме (показываем, если не выгнали) */}
                {!report.rejected && (
                    <>
                        <section className="bg-white p-6 rounded-xl2 border border-divider shadow-sm">
                            <h2 className="text-[18px] font-bold mb-6 flex items-center gap-2">
                                <BarChart3 size={20} className="text-accent" />{" "}
                                Статистика навыков
                            </h2>
                            <div className="space-y-2">
                                <StatBar
                                    label="Понимание архитектуры"
                                    score={report.competency_architecture}
                                    icon={Layers}
                                />
                                <StatBar
                                    label="Понимание кода (Code Review)"
                                    score={report.competency_code_understanding}
                                    icon={Code2}
                                />
                                <StatBar
                                    label="Навык промптинга (Работа с ИИ)"
                                    score={report.competency_prompting}
                                    icon={MessageSquare}
                                />
                                <StatBar
                                    label="Адаптивность к нагрузке"
                                    score={report.competency_adaptability}
                                    icon={Terminal}
                                />
                                <StatBar
                                    label="Soft Skills (Коммуникация)"
                                    score={report.competency_soft_skills}
                                    icon={Brain}
                                />
                            </div>
                        </section>

                        <section>
                            <h2 className="text-[16px] font-bold mb-3 text-ink">
                                Резюме интервью
                            </h2>
                            <p className="text-[15px] leading-relaxed whitespace-pre-line text-ink/80 bg-page p-5 rounded-xl2 border border-divider">
                                {report.summary}
                            </p>
                        </section>

                        <div className="grid md:grid-cols-2 gap-6 pt-2">
                            <div className="bg-accentSoft/50 rounded-xl2 p-5 border border-accent/10">
                                <h2 className="text-[15px] font-bold text-accent mb-3 flex items-center gap-2">
                                    <CheckCircle2 size={18} /> Плюсы
                                </h2>
                                <ul className="list-disc pl-5 text-[14px] space-y-1.5 text-ink/80">
                                    {report.strengths.length > 0 ? (
                                        report.strengths.map((s, i) => (
                                            <li key={i}>{s}</li>
                                        ))
                                    ) : (
                                        <li>Не выявлены</li>
                                    )}
                                </ul>
                            </div>
                            <div className="bg-red-50 rounded-xl2 p-5 border border-red-100">
                                <h2 className="text-[15px] font-bold text-red-700 mb-3 flex items-center gap-2">
                                    <AlertTriangle size={18} /> Минусы
                                </h2>
                                <ul className="list-disc pl-5 text-[14px] space-y-1.5 text-ink/80">
                                    {report.gaps.length > 0 ? (
                                        report.gaps.map((s, i) => (
                                            <li key={i}>{s}</li>
                                        ))
                                    ) : (
                                        <li>Не выявлены</li>
                                    )}
                                </ul>
                            </div>
                        </div>
                    </>
                )}

                {/* Кнопки */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-6 border-t border-divider">
                    <button
                        onClick={restartSameSettings}
                        className="inline-flex items-center justify-center gap-2 rounded-xl2 bg-accent text-white px-6 py-3 font-medium hover:brightness-110 transition-all duration-200"
                    >
                        <RotateCcw size={18} /> Пройти заново
                    </button>
                    <button
                        onClick={onRestart}
                        className="inline-flex items-center justify-center gap-2 rounded-xl2 border border-divider px-6 py-3 font-medium hover:bg-gray-50 transition-all duration-200"
                    >
                        На главную
                    </button>
                </div>
            </div>
        </div>
    );
}
