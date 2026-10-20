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
const QUESTIONS_PER_STAGE = 5;
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

    const [answeredCount, setAnsweredCount] = useState(0);

    const [answer, setAnswer] = useState("");
    const [busy, setBusy] = useState(false);
    const [finished, setFinished] = useState(false);
    const [failed, setFailed] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [showSkipModal, setShowSkipModal] = useState(false);
    const [hoverSkip, setHoverSkip] = useState(false);

    const [totalSeconds, setTotalSeconds] = useState(0);
    const interviewStartTime = useRef<number>(Date.now());
    const [answerSeconds, setAnswerSeconds] = useState(0);
    const questionStartTime = useRef<number>(Date.now());

    const scroller = useRef<HTMLDivElement>(null);
    const isFailingRef = useRef(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
        null,
    );
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const chunksRef = useRef<Blob[]>([]);

    useEffect(() => {
        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true,
                });
                setMediaStream(stream);
                if (videoRef.current) videoRef.current.srcObject = stream;

                const recorder = new MediaRecorder(stream, {
                    mimeType: "video/webm;codecs=vp8,opus",
                });
                recorder.ondataavailable = (e) => {
                    if (e.data.size > 0) chunksRef.current.push(e.data);
                };
                recorder.start();
                setMediaRecorder(recorder);
                setIsCameraReady(true);
            } catch (err) {
                setCameraError("Нет доступа к камере или микрофону.");
            }
        };
        startCamera();
        return () => mediaStream?.getTracks().forEach((t) => t.stop());
    }, []);

    useEffect(() => {
        if (
            (finished || failed) &&
            mediaRecorder &&
            mediaRecorder.state !== "inactive"
        ) {
            mediaRecorder.stop();
            setTimeout(() => {
                if (chunksRef.current.length === 0) return;
                const blob = new Blob(chunksRef.current, {
                    type: "video/webm",
                });
                const formData = new FormData();
                formData.append("file", blob, "interview.webm");
                fetch(
                    `http://localhost:8000/api/media/upload?interview_id=${payload.interviewId}`,
                    { method: "POST", body: formData },
                ).catch(console.error);
            }, 1000);
        }
    }, [finished, failed, mediaRecorder]);

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
        if (finished || busy || failed || !isCameraReady || showSkipModal)
            return;
        questionStartTime.current = Date.now();
        setAnswerSeconds(0);
        const timer = window.setInterval(() => {
            setAnswerSeconds(
                Math.floor((Date.now() - questionStartTime.current) / 1000),
            );
        }, 1000);
        return () => window.clearInterval(timer);
    }, [msgs.length, finished, failed, isCameraReady, showSkipModal]);

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
        const handleVisibilityChange = () => {
            if (document.hidden && !showSkipModal)
                failInterview("Переключение на другую вкладку.");
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () =>
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange,
            );
    }, [finished, failed, isCameraReady, showSkipModal]);

    useEffect(() => {
        const block = (e: Event) => e.preventDefault();
        document.addEventListener("copy", block);
        document.addEventListener("contextmenu", block);
        return () => {
            document.removeEventListener("copy", block);
            document.removeEventListener("contextmenu", block);
        };
    }, []);

    const scrollDown = () =>
        queueMicrotask(() =>
            scroller.current?.scrollTo({
                top: scroller.current.scrollHeight,
                behavior: "smooth",
            }),
        );

    const send = async (isSkip = false) => {
        const text = isSkip ? "___SKIP___" : answer.trim();
        if ((!text && !isSkip) || busy || finished || failed) return;

        setBusy(true);
        setError(null);
        setShowSkipModal(false);

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
        const prevStage = currentStage;

        try {
            const res = await api.answer(payload.interviewId, text, spent);
            setCurrentStage(res.stage);
            setCurrentStageName(res.stage_name);

            setAnsweredCount((c) => c + 1);

            if (res.rejected) {
                setFinished(true);
                setMsgs((m) => [
                    ...m,
                    {
                        role: "ai",
                        text: `❌ Интервью прервано: ${res.reject_reason}`,
                    },
                ]);
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
                    { role: "ai", text: "Интервью завершено." },
                ]);
                setTimeout(
                    () => onFinished(payload.interviewId, payload.level),
                    1000,
                );
                return;
            }

            if (res.question) {
                let newMsg: Msg = {
                    role: "ai",
                    text: res.question,
                    stageName: res.stage_name,
                };
                if (res.code_snippet)
                    newMsg.text =
                        res.question + "\n\n__CODE__" + res.code_snippet;

                // ОЧИСТКА ТОЛЬКО ПРИ ПЕРЕХОДЕ С 1-ГО НА 2-Й ЭТАП
                if (res.stage === 1 && prevStage === 0) {
                    const stageNotice: Msg = {
                        role: "ai",
                        text: `Переход на этап 2. Code Review`,
                    };
                    setMsgs([stageNotice, newMsg]);
                    setAnsweredCount(0);
                } else {
                    setMsgs((m) => [...m, newMsg]);
                }
                scrollDown();
            }
        } catch (e) {
            if (!isSkip) {
                setMsgs((m) => m.slice(0, -1));
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
        if ((e.ctrlKey || e.metaKey) && e.key === "v") e.preventDefault();
    };

    const totalQuestions = TOTAL_STAGES * QUESTIONS_PER_STAGE;
    const globalProgress = Math.min(
        100,
        Math.round(
            ((currentStage * QUESTIONS_PER_STAGE + answeredCount) /
                totalQuestions) *
                100,
        ),
    );

    const totalM = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const totalS = String(totalSeconds % 60).padStart(2, "0");

    if (!isCameraReady && !cameraError)
        return (
            <div className="text-center py-20">
                <Loader2
                    className="animate-spin mx-auto text-accent"
                    size={32}
                />
                <p className="mt-4 text-muted">Подключение камеры...</p>
            </div>
        );
    if (cameraError)
        return (
            <div className="text-center py-20 text-red-600">
                <CameraOff size={48} className="mx-auto mb-4" />
                <p>{cameraError}</p>
            </div>
        );
    if (failed)
        return (
            <div className="text-center py-20">
                <ShieldX size={48} className="text-red-600 mx-auto" />
                <h1 className="text-xl font-bold mt-4">Интервью прервано</h1>
            </div>
        );

    return (
        <div className="max-w-6xl mx-auto px-4 py-10 select-none relative">
            {showSkipModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-card rounded-xl2 shadow-xl p-6 max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200">
                        <AlertTriangle
                            className="text-amber-500 mx-auto mb-3"
                            size={32}
                        />
                        <h3 className="text-[18px] font-bold text-center mb-2">
                            Пропустить вопрос?
                        </h3>
                        <p className="text-[13px] text-muted text-center mb-6">
                            Это действие{" "}
                            <span className="text-red-600 font-medium">
                                сильно снизит
                            </span>{" "}
                            вашу итоговую оценку.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowSkipModal(false)}
                                className="flex-1 rounded-xl2 border border-divider py-2 text-[14px] font-medium hover:bg-gray-50"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={() => send(true)}
                                className="flex-1 rounded-xl2 bg-red-600 text-white py-2 text-[14px] font-medium hover:bg-red-700"
                            >
                                Да, пропустить
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <div className="bg-card rounded-xl2 shadow-card p-4 sticky top-10">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-[14px] font-bold flex items-center gap-2">
                                <Camera size={16} /> Камера
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
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <div className="bg-card rounded-xl2 shadow-card p-6 flex flex-col h-[80vh]">
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

                        <div className="mt-3 shrink-0">
                            <div className="flex items-center justify-between text-[12px] text-muted mb-1">
                                <span>
                                    Этап {currentStage + 1} из {TOTAL_STAGES} —{" "}
                                    {currentStageName}
                                </span>
                                <span>{globalProgress}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-page overflow-hidden">
                                <div
                                    className="h-full bg-accent transition-all"
                                    style={{ width: `${globalProgress}%` }}
                                />
                            </div>
                        </div>

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

                        {error && (
                            <div className="mt-3 shrink-0 bg-red-50 text-red-700 text-[13px] px-3 py-2 rounded-lg flex items-center gap-2">
                                <AlertTriangle size={16} /> {error}
                            </div>
                        )}

                        {!finished ? (
                            <div className="mt-4 shrink-0 flex flex-col gap-2">
                                <div className="flex gap-3 items-stretch">
                                    <textarea
                                        value={answer}
                                        onChange={(e) =>
                                            setAnswer(e.target.value)
                                        }
                                        onKeyDown={onKeyDown}
                                        onPaste={(e) => e.preventDefault()}
                                        placeholder="Ваш ответ… (Enter — отправить, Shift+Enter — перенос)"
                                        rows={2}
                                        className="flex-1 rounded-xl2 border border-divider px-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 text-[14px] resize-none"
                                    />
                                    <button
                                        onClick={() => send(false)}
                                        disabled={busy || !answer.trim()}
                                        className="rounded-xl2 bg-accent text-white px-4 h-full font-medium disabled:opacity-40 flex items-center justify-center min-w-[60px]"
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
                                </div>

                                <div className="relative flex justify-end">
                                    {hoverSkip && (
                                        <div className="absolute bottom-full mb-2 right-0 w-64 bg-gray-900 text-white text-[11px] px-3 py-2 rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom-2">
                                            Пропуск вопроса зафиксируется ИИ как
                                            отсутствие ответа и сильно снизит
                                            итоговый балл.
                                            <div className="absolute top-full right-6 border-4 border-transparent border-t-gray-900" />
                                        </div>
                                    )}
                                    <button
                                        onMouseEnter={() => setHoverSkip(true)}
                                        onMouseLeave={() => setHoverSkip(false)}
                                        onClick={() => setShowSkipModal(true)}
                                        disabled={busy}
                                        className="text-[12px] text-muted hover:text-amber-600 transition-colors flex items-center gap-1"
                                    >
                                        <SkipForward size={12} /> Пропустить
                                        вопрос
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
