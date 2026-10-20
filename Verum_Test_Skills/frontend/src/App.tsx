import { useState } from "react";
import Landing from "./pages/Landing";
import Consent from "./pages/Consent";
import Interview from "./pages/Interview";
import Processing from "./pages/Processing";
import Report from "./pages/Report";
import { useSession } from "./hooks/useSession";
import type { LevelId, ReportResponse } from "./types";

export interface StartPayload {
    interviewId: string;
    level: LevelId;
    stackId: string;
    languageId: string;
    firstQuestion: string;
    stage: number;
    stageName: string;
}

export interface Msg {
    role: "ai" | "user";
    text: string;
    stageName?: string;
}

type View =
    | { kind: "landing" }
    | { kind: "consent"; payload: StartPayload }
    | { kind: "interview"; payload: StartPayload; seedMessages: Msg[] }
    | { kind: "processing"; interviewId: string; level: LevelId }
    | { kind: "report"; report: ReportResponse };

export default function App() {
    const { session, save, clear } = useSession();
    const [view, setView] = useState<View>({ kind: "landing" });

    const handleStarted = (payload: StartPayload) => {
        save({
            interviewId: payload.interviewId,
            level: payload.level,
            stackId: payload.stackId,
            languageId: payload.languageId,
            startedAt: Date.now(),
        });
        setView({ kind: "consent", payload });
    };

    const handleConsented = () => {
        if (view.kind !== "consent") return;
        const seed: Msg[] = [
            {
                role: "ai",
                text: view.payload.firstQuestion,
                stageName: view.payload.stageName,
            },
        ];
        setView({
            kind: "interview",
            payload: view.payload,
            seedMessages: seed,
        });
    };

    const handleFinished = (interviewId: string, level: LevelId) =>
        setView({ kind: "processing", interviewId, level });

    const handleReportReady = (report: ReportResponse) => {
        clear();
        setView({ kind: "report", report });
    };

    const handleRestart = () => {
        clear();
        setView({ kind: "landing" });
    };

    return (
        <main className="min-h-screen bg-page">
            {view.kind === "landing" && (
                <Landing
                    activeSession={session}
                    onStarted={handleStarted}
                    onAbandon={clear}
                />
            )}
            {view.kind === "consent" && (
                <Consent
                    payload={view.payload}
                    onConfirm={handleConsented}
                    onCancel={handleRestart}
                />
            )}
            {view.kind === "interview" && (
                <Interview
                    payload={view.payload}
                    seedMessages={view.seedMessages}
                    onFinished={handleFinished}
                    onAbort={handleRestart}
                />
            )}
            {view.kind === "processing" && (
                <Processing
                    interviewId={view.interviewId}
                    level={view.level}
                    onReady={handleReportReady}
                    onAbort={handleRestart}
                />
            )}
            {view.kind === "report" && (
                <Report report={view.report} onRestart={handleRestart} />
            )}
        </main>
    );
}
