import { useEffect, useRef, useState } from "react";
import {
    ArrowRight,
    Loader2,
    CheckCircle2,
    RotateCcw,
    LogOut,
    AlertTriangle,
    Clock,
    ShieldX,
    Camera,
    CameraOff,
    Mic,
    SkipForward,
} from "lucide-react";
import { api, ApiError } from "../api";
import type { StartPayload, Msg } from "../App";
import type { LevelId } from "../types";

interface Props {
    payload: StartPayload;
    seedMessages: Msg[];
    onFinished: (interviewId: string, level: LevelId) => void;
    onAbort: () => void;
}

const TOTAL_STAGES = 3;
const MAX_SECONDS_PER_ANSWER = 180;

export default function Interview({
    payload,
    seedMessages,
    onFinished,
    onAbort,
}: Props) {
    const [msgs, setMsgs] = useState<Msg[]>(seedMessages);
    const [currentStage, setCurrentStage] = useState<number>(payload.stage);
    const [currentStageName, setCurrentStageName] = useState<string>(
        payload.stageName,
    );
    const [answer, setAnswer] = useState("");
    const [busy, setBusy] = useState(false);
    const [finished, setFinished] = useState(false);
    const [failed, setFailed] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Таймеры
    const [totalSeconds, setTotalSeconds] = useState(0);
    const interviewStartTime = useRef<number>(Date.now());
    const [answerSeconds, setAnswerSeconds] = useState(0);
    const questionStartTime = useRef<number>(Date.now());

    const scroller = useRef<HTMLDivElement>(null);
    const isFailingRef = useRef(false);

    // Камера
    const videoRef = useRef<HTMLVideoElement>(null);
    const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
        null,
    );
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const chunksRef = useRef<Blob[]>([]);

    // 1. Инициализация камеры
    useEffect(() => {
        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 640, height: 480 },
                    audio: true,
                });
                setMediaStream(stream);
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }

                const recorder = new MediaRecorder(stream, {
                    mimeType: "video/webm",
                });
                recorder.ondataavailable = (e) => {
                    if (e.data.size > 0) chunksRef.current.push(e.data);
                };
                recorder.start(1000);
                setMediaRecorder(recorder);
                setIsCameraReady(true);
            } catch (err) {
                console.error("Ошибка доступа к камере:", err);
                setCameraError(
                    "Нет доступа к камере или микрофону. Разрешите доступ в браузере и обновите страницу.",
                );
            }
        };

        startCamera();

        return () => {
            if (mediaStream) mediaStream.getTracks().forEach((t) => t.stop());
        };
    }, []);

    // Загрузка видео на бэкенд при завершении
    const uploadVideo = async () => {
        if (chunksRef.current.length === 0) return;
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const formData = new FormData();
        formData.append("file", blob, "interview.webm");
        try {
            await fetch(
                `http://localhost:8000/api/media/upload?interview_id=${payload.interviewId}`,
                {
                    method: "POST",
                    body: formData,
                },
            );
            console.log("Видео загружено");
        } catch (e) {
            console.error("Ошибка загрузки видео:", e);
        }
    };

    useEffect(() => {
        if (
            (finished || failed) &&
            mediaRecorder &&
            mediaRecorder.state !== "inactive"
        ) {
            mediaRecorder.stop();
            setTimeout(uploadVideo, 500);
        }
    }, [finished, failed, mediaRecorder]);

    // 2. Таймеры (общий и на ответ)
    useEffect(() => {
        if (finished || failed || !isCameraReady) return;
        const timer = window.setInterval(() => {
            setTotalSeconds(
                Math.floor((Date.now() - interviewStartTime.current) / 1000),
            );
        }, 1000);
        return () => window.clearInterval(timer);
    }, [finished, failed, isCameraReady]);

    useEffect(() => {
        if (finished || busy || failed || !isCameraReady) return;
        questionStartTime.current = Date.now();
        setAnswerSeconds(0);
        const timer = window.setInterval(() => {
            setAnswerSeconds(
                Math.floor((Date.now() - questionStartTime.current) / 1000),
            );
        }, 1000);
        return () => window.clearInterval(timer);
    }, [msgs.length, finished, failed, isCameraReady]);

    // 3. Защита от выхода из вкладки
    const failInterview = async (reason: string) => {
        if (isFailingRef.current || finished || failed) return;
        isFailingRef.current = true;
        setFailed(true);
        setBusy(true);
        try {
            await api.answer(
                payload.interviewId,
                "___TAB_SWITCH_FAIL___",
                answerSeconds,
            );
            setTimeout(
                () => onFinished(payload.interviewId, payload.level),
                2000,
            );
        } catch (e) {
            setError(String(e));
        }
    };

    useEffect(() => {
        if (finished || failed || !isCameraReady) return;
        const handleBlur = () =>
            failInterview("Выход из активного окна браузера.");
        const handleVisibilityChange = () => {
            if (document.hidden)
                failInterview("Переключение на другую вкладку.");
        };
        window.addEventListener("blur", handleBlur);
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            window.removeEventListener("blur", handleBlur);
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange,
            );
        };
    }, [finished, failed, isCameraReady]);

    // 4. Блокировка копирования
    useEffect(() => {
        const block = (e: Event) => e.preventDefault();
        document.addEventListener("copy", block);
        document.addEventListener("contextmenu", block);
        return () => {
            document.removeEventListener("copy", block);
            document.removeEventListener("contextmenu", block);
        };
    }, []);

    const scrollDown = () => {
        queueMicrotask(() =>
            scroller.current?.scrollTo({
                top: scroller.current.scrollHeight,
                behavior: "smooth",
            }),
        );
    };

    // 5. Отправка ответа
    const send = async (isSkip = false) => {
        const text = isSkip ? "___SKIP___" : answer.trim();
        if ((!text && !isSkip) || busy || finished || failed) return;

        setBusy(true);
        setError(null);

        if (!isSkip) {
            setMsgs((m) => [...m, { role: "user", text }]);
            setAnswer("");
            scrollDown();
        } else {
            setMsgs((m) => [...m, { role: "user", text: "[Вопрос пропущен]" }]);
        }

        const spent = Math.floor(
            (Date.now() - questionStartTime.current) / 1000,
        );

        try {
            const res = await api.answer(payload.interviewId, text, spent);
            setCurrentStage(res.stage);
            setCurrentStageName(res.stage_name);

            if (res.rejected) {
                setFinished(true);
                setMsgs((m) => [
                    ...m,
                    {
                        role: "ai",
                        text: `❌ Интервью прервано: ${res.reject_reason}`,
                    },
                ]);
                scrollDown();
                setTimeout(
                    () => onFinished(payload.interviewId, payload.level),
                    2000,
                );
                return;
            }

            if (res.finished) {
                setFinished(true);
                setMsgs((m) => [
                    ...m,
                    {
                        role: "ai",
                        text: "Интервью завершено. Формируем отчёт…",
                    },
                ]);
                scrollDown();
                setTimeout(
                    () => onFinished(payload.interviewId, payload.level),
                    1000,
                );
                return;
            }

            if (res.question) {
                // Формируем сообщение: если есть код, отделяем его
                let newMsg: Msg = {
                    role: "ai",
                    text: res.question,
                    stageName: res.stage_name,
                };
                if (res.code_snippet) {
                    newMsg.text =
                        res.question + "\n\n__CODE__" + res.code_snippet;
                }
                setMsgs((m) => [...m, newMsg]);
                scrollDown();
            }
        } catch (e) {
            if (!isSkip) {
                setMsgs((m) => m.slice(0, -1)); // откатываем сообщение при ошибке
                setAnswer(text);
            }
            setError(e instanceof ApiError ? e.message : String(e));
        } finally {
            setBusy(false);
        }
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void send(false);
        }
    };

    const progress = Math.min(
        100,
        Math.round(((currentStage + 1) / TOTAL_STAGES) * 100),
    );
    const totalM = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const totalS = String(totalSeconds % 60).padStart(2, "0");
    const timeLeft = Math.max(0, MAX_SECONDS_PER_ANSWER - answerSeconds);

    // ЭКРАН 1: Загрузка камеры (пока нет доступа)
    if (!isCameraReady && !cameraError) {
        return (
            <div className="max-w-3xl mx-auto px-4 py-10 flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin text-accent mb-4" size={32} />
                <h2 className="text-[18px] font-bold">Подключение камеры...</h2>
                <p className="text-muted text-[13px]">
                    Пожалуйста, разрешите доступ к камере и микрофону.
                </p>
            </div>
        );
    }

    // ЭКРАН 2: Ошибка доступа к камере (блокируем интервью)
    if (cameraError) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-10">
                <div className="bg-card rounded-xl2 shadow-card p-8 text-center border border-red-200">
                    <CameraOff
                        size={48}
                        className="text-red-600 mx-auto mb-4"
                    />
                    <h1 className="text-[22px] font-bold text-red-900 mb-2">
                        Доступ к камере заблокирован
                    </h1>
                    <p className="text-[14px] text-muted mb-6">{cameraError}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="rounded-xl2 bg-accent text-white px-6 py-2 font-medium"
                    >
                        Попробовать снова
                    </button>
                </div>
            </div>
        );
    }

    // ЭКРАН 3: Интервью провалено
    if (failed) {
        return (
            <div className="max-w-3xl mx-auto px-4 py-10">
                <div className="bg-card rounded-xl2 shadow-card p-8 text-center space-y-4">
                    <ShieldX size={48} className="text-red-600 mx-auto" />
                    <h1 className="text-[24px] font-bold text-red-900">
                        Интервью прервано
                    </h1>
                    <p className="text-[15px] text-muted">
                        Тест завершён из-за нарушения правил (выход из окна).
                    </p>
                    <Loader2
                        className="animate-spin text-muted mx-auto mt-4"
                        size={24}
                    />
                </div>
            </div>
        );
    }

    // ЭКРАН 4: Основное интервью
    return (
        <div className="max-w-6xl mx-auto px-4 py-10 select-none">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ЛЕВАЯ ПАНЕЛЬ: КАМЕРА */}
                <div className="lg:col-span-1">
                    <div className="bg-card rounded-xl2 shadow-card p-4 sticky top-10">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-[14px] font-bold flex items-center gap-2">
                                <Camera size={16} /> Ваша камера
                            </h2>
                            <span className="text-[11px] font-bold text-red-600 flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />{" "}
                                REC
                            </span>
                        </div>
                        <div className="bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center">
                            <video
                                ref={videoRef}
                                autoPlay
                                muted
                                playsInline
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-[12px] text-muted">
                            <Mic size={14} /> Микрофон активен
                        </div>
                    </div>
                </div>

                {/* ПРАВАЯ ПАНЕЛЬ: ЧАТ */}
                <div className="lg:col-span-2">
                    <div className="bg-card rounded-xl2 shadow-card p-6 flex flex-col h-[80vh]">
                        {/* Шапка */}
                        <div className="flex items-center justify-between gap-3 shrink-0">
                            <div>
                                <h1 className="text-[20px] font-bold">
                                    Интервью
                                </h1>
                                <p className="text-muted text-[12px]">
                                    {payload.level} · {payload.stackId} ·{" "}
                                    {payload.languageId}
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="inline-flex items-center gap-1.5 text-[14px] font-medium bg-page px-2.5 py-1 rounded-lg">
                                    <Clock size={16} className="text-accent" />{" "}
                                    {totalM}:{totalS}
                                </div>
                                <button
                                    onClick={onAbort}
                                    className="text-[13px] text-muted hover:text-red-600 flex items-center gap-1"
                                >
                                    <LogOut size={14} /> Выйти
                                </button>
                            </div>
                        </div>

                        {/* Прогресс */}
                        <div className="mt-3 shrink-0">
                            <div className="flex items-center justify-between text-[12px] text-muted mb-1">
                                <span>
                                    Этап {currentStage + 1} из {TOTAL_STAGES} —{" "}
                                    {currentStageName}
                                </span>
                                <span>{progress}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-page overflow-hidden">
                                <div
                                    className="h-full bg-accent transition-all"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>

                        {/* Предупреждение о времени */}
                        {timeLeft < 30 && !finished && !busy && (
                            <div className="mt-3 shrink-0 bg-red-50 text-red-700 text-[12px] px-3 py-2 rounded-lg flex items-center gap-2 animate-pulse">
                                <AlertTriangle size={16} /> Осталось {timeLeft}{" "}
                                сек.
                            </div>
                        )}

                        {/* Лента сообщений */}
                        <div
                            ref={scroller}
                            className="mt-4 flex-1 overflow-y-auto space-y-3 pr-2"
                        >
                            {msgs.map((m, i) => {
                                const hasCode = m.text.includes("__CODE__");
                                const [textPart, codePart] = hasCode
                                    ? m.text.split("__CODE__")
                                    : [m.text, ""];

                                return (
                                    <div
                                        key={i}
                                        className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                                    >
                                        <div
                                            className={`max-w-[85%] rounded-2xl px-4 py-2 text-[14px] leading-snug ${m.role === "user" ? "bg-accent text-white" : "bg-page text-ink"}`}
                                        >
                                            {m.stageName && (
                                                <div className="text-[10px] uppercase tracking-wide mb-1 opacity-70">
                                                    {m.stageName}
                                                </div>
                                            )}

                                            {hasCode ? (
                                                <>
                                                    <div className="whitespace-pre-wrap mb-3">
                                                        {textPart}
                                                    </div>
                                                    <pre className="bg-[#1e1e1e] text-[#d4d4d4] p-4 rounded-xl overflow-x-auto text-[12px] font-mono whitespace-pre border border-gray-700">
                                                        <code>{codePart}</code>
                                                    </pre>
                                                </>
                                            ) : (
                                                <div className="whitespace-pre-wrap">
                                                    {m.text}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {busy && (
                                <div className="flex items-center gap-2 text-muted text-[13px]">
                                    <Loader2
                                        className="animate-spin"
                                        size={16}
                                    />{" "}
                                    ИИ оценивает ответ…
                                </div>
                            )}
                        </div>

                        {/* Ошибки */}
                        {error && (
                            <div className="mt-3 shrink-0 bg-red-50 text-red-700 text-[13px] px-3 py-2 rounded-lg flex items-center gap-2">
                                <AlertTriangle size={16} /> {error}
                            </div>
                        )}

                        {/* Поле ввода и кнопки */}
                        {!finished ? (
                            <div className="mt-4 shrink-0 flex gap-3 items-stretch">
                                <textarea
                                    value={answer}
                                    onChange={(e) => setAnswer(e.target.value)}
                                    onKeyDown={onKeyDown}
                                    placeholder="Ваш ответ… (Enter — отправить, Shift+Enter — перенос)"
                                    rows={3}
                                    className="flex-1 rounded-xl2 border border-divider px-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 text-[14px] resize-none"
                                />
                                <div className="flex flex-col gap-2 justify-end">
                                    <button
                                        onClick={() => send(false)}
                                        disabled={busy || !answer.trim()}
                                        className="rounded-xl2 bg-accent text-white px-4 h-10 font-medium disabled:opacity-40 flex items-center justify-center min-w-[60px]"
                                    >
                                        {busy ? (
                                            <RotateCcw
                                                size={16}
                                                className="animate-spin"
                                            />
                                        ) : (
                                            <ArrowRight size={16} />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (
                                                confirm(
                                                    "Вы уверены, что хотите пропустить вопрос? Это сильно снизит вашу итоговую оценку.",
                                                )
                                            ) {
                                                send(true);
                                            }
                                        }}
                                        disabled={busy}
                                        className="rounded-xl2 border border-divider text-muted h-10 px-4 font-medium hover:bg-gray-50 flex items-center justify-center gap-2 text-[13px]"
                                    >
                                        <SkipForward size={14} /> Пропустить
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-4 shrink-0 text-accent font-medium flex items-center gap-2">
                                <CheckCircle2 size={18} /> Интервью завершено
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
