import { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    RotateCcw,
    Loader2,
    Check,
    ShieldAlert,
} from "lucide-react";
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
    onAbandon,
}: Props) {
    const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
    const [catalogError, setCatalogError] = useState<string | null>(null);

    const [levelId, setLevelId] = useState<LevelId>("middle");
    const [stackId, setStackId] = useState<string>("");
    const [languageIds, setLanguageIds] = useState<string[]>([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem("verum.lastSettings");
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.level)
                    setLevelId(parsed.level.toLowerCase() as LevelId);
                if (parsed.stack) setStackId(parsed.stack);
                if (parsed.langs && Array.isArray(parsed.langs))
                    setLanguageIds(parsed.langs);
                localStorage.removeItem("verum.lastSettings");
            } catch (e) {}
        }
    }, []);

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
        if (languageIds.includes(id))
            setLanguageIds((ids) => ids.filter((x) => x !== id));
        else if (languageIds.length < 4) setLanguageIds((ids) => [...ids, id]);
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
        <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-500">
            <div className="w-full max-w-4xl">
                <div className="mb-6 rounded-xl2 border border-amber-200 bg-amber-50 px-5 py-4 flex items-start gap-3 shadow-sm">
                    <ShieldAlert
                        className="text-amber-600 mt-0.5 shrink-0"
                        size={20}
                    />
                    <div>
                        <h3 className="text-[14px] font-bold text-amber-900">
                            Внимание: запись анализируется
                        </h3>
                        <p className="text-[13px] text-amber-800 mt-1 leading-snug">
                            Аудио и видео с камеры будут записаны и отправлены
                            на рассмотрение ревьюеру. Ответы оцениваются с
                            помощью ИИ. Не пытайтесь использовать сторонние
                            источники.
                        </p>
                    </div>
                </div>

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
                                Вы не можете его продолжить, так как сессия была
                                прервана. Начните заново.
                            </div>
                        </div>
                        <button
                            onClick={onAbandon}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-300 px-3 py-1.5 text-[13px] text-amber-900 hover:bg-amber-100 transition"
                        >
                            <RotateCcw size={14} /> Сбросить
                        </button>
                    </div>
                )}

                <div className="bg-card rounded-xl2 shadow-card p-6 sm:p-10">
                    <h1 className="text-[28px] font-bold text-ink text-center">
                        Проверка знаний
                    </h1>
                    <p className="text-muted mt-2 text-[15px] text-center">
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

                    <section className="mt-10">
                        <h2 className="text-[13px] font-semibold tracking-wide uppercase text-muted text-center">
                            Уровень
                        </h2>
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {catalog?.levels.map((l) => {
                                const active = l.id === levelId;
                                const Icon = getIcon(l.icon);
                                return (
                                    <button
                                        key={l.id}
                                        onClick={() =>
                                            setLevelId(l.id as LevelId)
                                        }
                                        className={`text-left rounded-xl2 border p-4 transition-all duration-300 ease-out ${active ? "border-accent bg-accentSoft shadow-md scale-[1.03]" : "border-divider bg-white hover:border-gray-300 hover:shadow-md"}`}
                                    >
                                        <div className="flex items-center gap-2 justify-center">
                                            <span
                                                className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${active ? "bg-white text-accent shadow-sm" : "bg-page text-ink"}`}
                                            >
                                                <Icon size={16} />
                                            </span>
                                            <span className="font-semibold text-[15px]">
                                                {l.name}
                                            </span>
                                        </div>
                                        <p className="text-muted text-[12px] mt-3 text-center leading-snug">
                                            {l.description}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    <section className="mt-10">
                        <h2 className="text-[13px] font-semibold tracking-wide uppercase text-muted text-center">
                            Стек
                        </h2>
                        <div className="mt-4 flex flex-wrap justify-center gap-3">
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
                                        className={`flex items-center gap-3 rounded-xl2 border px-5 py-3 transition-all duration-300 ease-out ${active ? "border-accent bg-accentSoft shadow-md scale-[1.03]" : "border-divider bg-white hover:border-gray-300 hover:shadow-md"}`}
                                    >
                                        <span
                                            className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors ${active ? "bg-white text-accent shadow-sm" : "bg-page text-ink"}`}
                                        >
                                            <Icon size={18} />
                                        </span>
                                        <span className="font-semibold text-[14px]">
                                            {s.name}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    {stack && (
                        <section className="mt-10 animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="flex items-center justify-center gap-3">
                                <h2 className="text-[13px] font-semibold tracking-wide uppercase text-muted">
                                    Языки (макс. 4)
                                </h2>
                                <span className="text-[12px] font-medium bg-page px-2 py-0.5 rounded text-muted">
                                    {languageIds.length} / 4
                                </span>
                            </div>
                            <div className="mt-4 flex flex-wrap justify-center gap-3">
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
                                            className={`flex items-center gap-2 rounded-xl2 border px-4 py-3 transition-all duration-300 ease-out ${active ? "border-accent bg-accentSoft shadow-md scale-[1.03]" : "border-divider bg-white hover:border-gray-300 hover:shadow-md"} ${!active && languageIds.length >= 4 ? "opacity-40 cursor-not-allowed" : ""}`}
                                        >
                                            <span
                                                className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${active ? "bg-white text-accent" : "bg-page text-ink"}`}
                                            >
                                                <Icon size={16} />
                                            </span>
                                            <span className="font-medium text-[13px]">
                                                {lang.name}
                                            </span>
                                            {active && (
                                                <Check
                                                    size={14}
                                                    className="ml-1 text-accent"
                                                />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    <div className="mt-12 pt-8 border-t border-divider flex flex-col items-center">
                        <button
                            disabled={!canStart}
                            onClick={start}
                            className="w-full max-w-sm inline-flex items-center justify-center gap-2 rounded-xl2 bg-accent text-white font-semibold py-4 disabled:opacity-40 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                        >
                            {loading ? (
                                <>
                                    <Loader2
                                        size={18}
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
