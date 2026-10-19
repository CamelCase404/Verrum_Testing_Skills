export type LevelApi = "Junior" | "Middle" | "Senior";
export type LevelId = "junior" | "middle" | "senior";

export interface Option {
    id: string;
    name: string;
    icon: string;
    description: string;
}
export interface StackOption extends Option {
    languages: Option[];
}
export interface CatalogResponse {
    levels: Option[];
    stacks: StackOption[];
}

export interface StartInterviewResponse {
    interview_id: string;
    stage: number;
    stage_name: string;
    question: string;
    code_snippet?: string;
}
export interface AnswerResponse {
    stage: number;
    stage_name: string;
    question?: string | null;
    code_snippet?: string | null;
    finished: boolean;
    rejected: boolean;
    reject_reason?: string | null;
}
export interface StageScore {
    stage: number;
    stage_name: string;
    score: number;
    evidence: string[];
    gaps: string[];
}
export type Recommendation = "hire" | "no_hire" | "insufficient_evidence";
export interface ReportResponse {
    interview_id: string;
    level: LevelApi;
    stack_id: string;
    language_id: string;
    summary: string;
    stages: StageScore[];
    strengths: string[];
    gaps: string[];
    recommendation: Recommendation;
    code_review_score?: number | null;
    prompt_skill_score?: number | null;
    rejected: boolean;
    reject_reason?: string | null;
    average_time_seconds?: number | null;
    time_efficiency_score?: number | null;
}
export interface SessionState {
    interviewId: string;
    level: LevelId;
    stackId: string;
    languageId: string;
    startedAt: number;
}
