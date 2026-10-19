import type {
    AnswerResponse,
    CatalogResponse,
    LevelApi,
    ReportResponse,
    StartInterviewResponse,
} from "./types";

const BASE =
    (import.meta.env.VITE_API_URL as string | undefined) ??
    "http://localhost:8000";

export class ApiError extends Error {
    constructor(
        public status: number,
        message: string,
        public body?: unknown,
    ) {
        super(message);
        this.name = "ApiError";
    }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    let res: Response;
    try {
        res = await fetch(`${BASE}${path}`, {
            ...init,
            headers: {
                Accept: "application/json",
                ...(init?.body ? { "Content-Type": "application/json" } : {}),
                ...(init?.headers ?? {}),
            },
        });
    } catch (e) {
        throw new ApiError(0, `Сеть недоступна: ${(e as Error).message}`);
    }
    if (!res.ok) {
        let body: unknown = undefined;
        try {
            body = await res.json();
        } catch {}
        const message =
            typeof body === "object" && body && "detail" in body
                ? String((body as { detail: unknown }).detail)
                : `${res.status} ${res.statusText}`;
        throw new ApiError(res.status, message, body);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
}

export const api = {
    catalog: () => request<CatalogResponse>("/api/catalog"),

    // Теперь принимает массив language_ids
    startInterview: (
        level: LevelApi,
        stack_id: string,
        language_ids: string[],
    ) =>
        request<StartInterviewResponse>("/api/interview/start", {
            method: "POST",
            body: JSON.stringify({ level, stack_id, language_ids }),
        }),

    answer: (interview_id: string, answer: string, seconds_spent: number) =>
        request<AnswerResponse>("/api/interview/answer", {
            method: "POST",
            body: JSON.stringify({ interview_id, answer, seconds_spent }),
        }),

    report: (interview_id: string) =>
        request<ReportResponse>(
            `/api/interview/${encodeURIComponent(interview_id)}/report`,
        ),
};
