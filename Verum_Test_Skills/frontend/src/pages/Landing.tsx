import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Play, RotateCcw, Loader2, Check } from "lucide-react";
import { api, ApiError } from "../api";
import { getIcon } from "../icons";
import type {
    CatalogResponse,
    LevelApi,
    LevelId,
    Option,
    StackOption,
    SessionState,
} from "../types";
import type { StartPayload } from "../App";

interface Props {
    activeSession: SessionState | null;
    onStarted: (payload: StartPayload) => void;
    onResume: (interviewId: string, level: LevelId) => void;
    onAbandon: () => void;
}

const LEVEL_TO_API: Record<LevelId, LevelApi> = {
    junior: "Junior",
    middle: "Middle",
    senior: "Senior",
};

export default function Landing({
    activeSession,
    onStarted,
    onResume,
    onAbandon,
}: Props) {
    const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
    const [catalogError, setCatalogError] = useState<string | null>(null);

    const [levelId, setLevelId] = useState<LevelId>("middle");
    const [stackId, setStackId] = useState<string>("");
    const [languageIds, setLanguageIds] = useState<string[]>([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = () => {
        setCatalogError(null);
        api.catalog()
            .then(setCatalog)
            .catch((e: unknown) =>
                setCatalogError(e instanceof ApiError ? e.message : String(e)),
            );
    };

    useEffect(() => {
        load();
    }, []);

    const level: Option | undefined = useMemo(
        () => catalog?.levels.find((l) => l.id === levelId),
        [catalog, levelId],
    );
    const stack: StackOption | undefined = useMemo(
        () => catalog?.stacks.find((s) => s.id === stackId),
        [catalog, stackId],
    );

    const canStart = Boolean(stackId && languageIds.length > 0) && !loading;

    const toggleLanguage = (id: string) => {
        if (languageIds.includes(id)) {
            setLanguageIds((ids) => ids.filter((x) => x !== id));
        } else if (languageIds.length < 4) {
            setLanguageIds((ids) => [...ids, id]);
        }
    };

    const start = async () => {
        if (!canStart) return;
        setLoading(true);
        setError(null);
        try {
            const res = await api.startInterview(
                LEVEL_TO_API[levelId],
                stackId,
                languageIds,
            );
            onStarted({
                interviewId: res.interview_id,
                level: levelId,
                stackId,
                languageId: languageIds.join(", "),
                firstQuestion: res.question,
                stage: res.stage,
                stageName: res.stage_name,
            });
        } catch (e) {
            setError(e instanceof ApiError ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 sm:p-8">
            <div className="w-full max-w-4xl">
                {activeSession && (
                    <div className="mb-4 rounded-xl2 border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
                        <AlertTriangle
                            className="text-amber-600 mt-0.5"
                            size={18}
                        />
                        <div className="flex-1">
                            <div className="text-[14px] font-medium text-amber-900">
                                Найдено незавершённое интервью
                            </div>
                            <div className="text-[12px] text-amber-800">
                                ID {activeSession.interviewId}
                            </div>
                        </div>
                        <button
                            onClick={() =>
                                onResume(
                                    activeSession.interviewId,
                                    activeSession.level,
                                )
                            }
                            className="inline-flex items-center gap-1 rounded-lg bg-amber-600 text-white px-3 py-1.5 text-[13px]"
                        >
                            <Play size={14} /> Продолжить
                        </button>
                        <button
                            onClick={onAbandon}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-300 px-3 py-1.5 text-[13px] text-amber-900"
                        >
                            <RotateCcw size={14} /> Сбросить
                        </button>
                    </div>
                )}

                <div className="bg-card rounded-xl2 shadow-card p-6 sm:p-8">
                    <h1 className="text-[26px] font-bold text-ink">
                        Проверка знаний
                    </h1>
                    <p className="text-muted mt-1 text-[15px]">
                        Выберите уровень, стек и до 4 языков.
                    </p>

                    {catalogError && (
                        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700 flex items-center justify-between">
                            <span>Ошибка загрузки: {catalogError}</span>
                            <button onClick={load} className="underline">
                                Повторить
                            </button>
                        </div>
                    )}

                    <section className="mt-8">
                        <h2 className="text-[13px] font-semibold tracking-wide uppercase text-muted">
                            Уровень
                        </h2>
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {catalog?.levels.map((l) => {
                                const active = l.id === levelId;
                                const Icon = getIcon(l.icon);
                                return (
                                    <button
                                        key={l.id}
                                        onClick={() =>
                                            setLevelId(l.id as LevelId)
                                        }
                                        className={`text-left rounded-xl2 border p-3 transition-all duration-200 ${active ? "border-accent bg-accentSoft shadow-sm scale-[1.02]" : "border-divider bg-white hover:border-gray-300 hover:shadow-md"}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${active ? "bg-white text-accent shadow-sm" : "bg-page text-ink"}`}
                                            >
                                                <Icon size={16} />
                                            </span>
                                            <span className="font-semibold text-[14px]">
                                                {l.name}
                                            </span>
                                        </div>
                                        <p className="text-muted text-[12px] mt-2 leading-snug">
                                            {l.description}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    <section className="mt-8">
                        <h2 className="text-[13px] font-semibold tracking-wide uppercase text-muted">
                            Стек
                        </h2>
                        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {catalog?.stacks.map((s) => {
                                const active = s.id === stackId;
                                const Icon = getIcon(s.icon);
                                return (
                                    <button
                                        key={s.id}
                                        onClick={() => {
                                            setStackId(s.id);
                                            setLanguageIds([]);
                                        }}
                                        className={`flex flex-col items-center justify-center text-center rounded-xl2 border p-4 transition-all duration-200 gap-2 ${active ? "border-accent bg-accentSoft shadow-sm scale-[1.02]" : "border-divider bg-white hover:border-gray-300 hover:shadow-md"}`}
                                    >
                                        <span
                                            className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${active ? "bg-white text-accent shadow-sm" : "bg-page text-ink"}`}
                                        >
                                            <Icon size={20} />
                                        </span>
                                        <span className="font-semibold text-[13px]">
                                            {s.name}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    {stack && (
                        <section className="mt-8">
                            <div className="flex items-center justify-between">
                                <h2 className="text-[13px] font-semibold tracking-wide uppercase text-muted">
                                    Языки (макс. 4)
                                </h2>
                                <span className="text-[12px] text-muted">
                                    {languageIds.length} / 4
                                </span>
                            </div>
                            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {stack.languages.map((lang) => {
                                    const active = languageIds.includes(
                                        lang.id,
                                    );
                                    const Icon = getIcon(lang.icon);
                                    return (
                                        <button
                                            key={lang.id}
                                            onClick={() =>
                                                toggleLanguage(lang.id)
                                            }
                                            disabled={
                                                !active &&
                                                languageIds.length >= 4
                                            }
                                            className={`flex items-center gap-3 rounded-xl2 border p-3 transition-all duration-200 text-left ${active ? "border-accent bg-accentSoft shadow-sm scale-[1.02]" : "border-divider bg-white hover:border-gray-300 hover:shadow-md"} ${!active && languageIds.length >= 4 ? "opacity-50 cursor-not-allowed" : ""}`}
                                        >
                                            <span
                                                className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${active ? "bg-white text-accent" : "bg-page text-ink"}`}
                                            >
                                                <Icon size={16} />
                                            </span>
                                            <span className="font-medium text-[13px]">
                                                {lang.name}
                                            </span>
                                            {active && (
                                                <Check
                                                    size={14}
                                                    className="ml-auto text-accent"
                                                />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    <div className="mt-10 pt-6 border-t border-divider">
                        <button
                            disabled={!canStart}
                            onClick={start}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl2 bg-accent text-white font-semibold py-3 disabled:opacity-40 hover:brightness-110 transition-all duration-200"
                        >
                            {loading ? (
                                <>
                                    <Loader2
                                        size={16}
                                        className="animate-spin"
                                    />{" "}
                                    Готовим интервью…
                                </>
                            ) : (
                                "Начать интервью"
                            )}
                        </button>
                        {error && (
                            <p className="mt-3 text-red-600 text-[13px] text-center">
                                {error}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
