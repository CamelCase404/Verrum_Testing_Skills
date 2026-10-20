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
    competency_architecture?: number | null;
    competency_code_understanding?: number | null;
    competency_prompting?: number | null;
    competency_adaptability?: number | null;
    competency_soft_skills?: number | null;
    total_score_100?: number | null;
    final_grade?: "Junior" | "Middle" | "Senior" | "Reject" | null;
    rejected: boolean;
    reject_reason?: string | null;
}
export interface SessionState {
    interviewId: string;
    level: LevelId;
    stackId: string;
    languageId: string;
    startedAt: number;
}
