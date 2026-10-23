import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, LogOut, Search, User, ArrowRight } from "lucide-react";
import { api } from "../api";

export default function DashboardPage({ user }: { user: any }) {
    const navigate = useNavigate();
    const [candidates, setCandidates] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Форма поиска
    const [grade, setGrade] = useState("");
    const [stack, setStack] = useState("");
    const [language, setLanguage] = useState("");

    const logout = () => {
        localStorage.removeItem("token");
        window.location.href = "/";
    };

    const goToInterview = () => {
        const token = localStorage.getItem("token");
        // Передаем токен во второй фронтенд
        window.location.href = `http://localhost:5173/?token=${token}`;
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post("/api/auth/search", {
                grade: grade || null,
                stack: stack || null,
                language: language || null,
            });
            setCandidates(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F5F5F3] font-sans text-[#1A1A1A] flex flex-col">
            {/* Хедер */}
            <header className="bg-white border-b border-[#E5E5E5] px-6 py-4 flex justify-between items-center sticky top-0 z-50">
                <div
                    className="font-bold text-xl flex items-center gap-2 cursor-pointer text-[#155239]"
                    onClick={() => navigate("/")}
                >
                    <ShieldCheck size={24} /> Verum Portal
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-[#666]">
                        Вы: <b className="text-[#1A1A1A]">{user.full_name}</b>{" "}
                        <span className="text-xs bg-[#E8F1EC] text-[#155239] px-2 py-1 rounded-md ml-1">
                            {user.role === "developer"
                                ? "Разработчик"
                                : "Компания"}
                        </span>
                    </span>
                    <button
                        onClick={logout}
                        className="text-[#888] hover:text-red-600 text-sm flex items-center gap-1 transition-colors"
                    >
                        <LogOut size={16} /> Выйти
                    </button>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 py-10 flex-grow w-full">
                {user.role === "developer" ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl shadow-xl border border-[#E5E5E5] p-8 sm:p-10 space-y-8"
                    >
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">
                                Личный кабинет
                            </h1>
                            <p className="text-[#666] mt-2">
                                Управляйте своим профилем и подтверждайте
                                навыки.
                            </p>
                        </div>

                        <div className="bg-[#E8F1EC] border border-[#155239]/20 p-6 sm:p-8 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div>
                                <h2 className="text-xl font-bold text-[#155239]">
                                    Пройдите ИИ-собеседование
                                </h2>
                                <p className="text-sm text-[#155239]/70 mt-1">
                                    Подтвердите свои навыки, чтобы компании
                                    могли найти вас.
                                </p>
                            </div>
                            <button
                                onClick={goToInterview}
                                className="bg-[#155239] text-white px-8 py-3.5 rounded-lg font-medium flex items-center gap-2 hover:bg-[#0f3d2a] transition-all shadow-lg shadow-[#155239]/20 hover:-translate-y-0.5 whitespace-nowrap"
                            >
                                Пройти тест <ArrowRight size={18} />
                            </button>
                        </div>

                        <div>
                            <h2 className="text-xl font-bold mb-4">
                                Ваша статистика
                            </h2>
                            {user.skills_data ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="bg-[#F5F5F3] p-6 rounded-xl border border-[#E5E5E5]">
                                        <p className="text-sm text-[#888] mb-1">
                                            Общий балл
                                        </p>
                                        <p className="text-3xl font-bold text-[#155239]">
                                            {user.skills_data.total_score_100}{" "}
                                            <span className="text-lg text-[#888] font-normal">
                                                / 100
                                            </span>
                                        </p>
                                    </div>
                                    <div className="bg-[#F5F5F3] p-6 rounded-xl border border-[#E5E5E5]">
                                        <p className="text-sm text-[#888] mb-1">
                                            Подтвержденный уровень
                                        </p>
                                        <p className="text-3xl font-bold text-[#155239]">
                                            {user.skills_data.final_grade}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-[#F5F5F3] p-8 rounded-xl border border-[#E5E5E5] text-center">
                                    <p className="text-[#666]">
                                        Вы еще не проходили собеседование.
                                        Нажмите «Пройти тест», чтобы получить
                                        оценку навыков.
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        <div className="bg-white rounded-2xl shadow-xl border border-[#E5E5E5] p-8 sm:p-10">
                            <h1 className="text-3xl font-bold tracking-tight mb-2">
                                Поиск специалистов
                            </h1>
                            <p className="text-[#666] mb-8">
                                Найдите проверенных ИИ разработчиков под ваши
                                задачи.
                            </p>

                            <form
                                onSubmit={handleSearch}
                                className="grid grid-cols-1 md:grid-cols-4 gap-4"
                            >
                                <select
                                    value={grade}
                                    onChange={(e) => setGrade(e.target.value)}
                                    className="rounded-lg border border-[#E5E5E5] px-4 py-3 bg-[#F5F5F3] text-sm outline-none focus:ring-2 focus:ring-[#155239]/30"
                                >
                                    <option value="">Любой грейд</option>
                                    <option value="Junior">Junior</option>
                                    <option value="Middle">Middle</option>
                                    <option value="Senior">Senior</option>
                                </select>

                                <select
                                    value={stack}
                                    onChange={(e) => setStack(e.target.value)}
                                    className="rounded-lg border border-[#E5E5E5] px-4 py-3 bg-[#F5F5F3] text-sm outline-none focus:ring-2 focus:ring-[#155239]/30"
                                >
                                    <option value="">Любой стек</option>
                                    <option value="backend">Backend</option>
                                    <option value="frontend">Frontend</option>
                                    <option value="mobile-ios">iOS</option>
                                </select>

                                <input
                                    type="text"
                                    placeholder="Язык (python, csharp...)"
                                    value={language}
                                    onChange={(e) =>
                                        setLanguage(e.target.value)
                                    }
                                    className="rounded-lg border border-[#E5E5E5] px-4 py-3 bg-[#F5F5F3] text-sm outline-none focus:ring-2 focus:ring-[#155239]/30"
                                />

                                <button
                                    type="submit"
                                    className="bg-[#155239] text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-[#0f3d2a] transition-all shadow-lg shadow-[#155239]/20 py-3"
                                >
                                    <Search size={18} /> Найти
                                </button>
                            </form>
                        </div>

                        {loading ? (
                            <div className="text-center py-10 text-[#666]">
                                Поиск кандидатов...
                            </div>
                        ) : candidates.length > 0 ? (
                            <div className="grid gap-4">
                                {candidates.map((c) => (
                                    <motion.div
                                        key={c.id}
                                        whileHover={{ y: -2 }}
                                        className="bg-white border border-[#E5E5E5] p-6 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm hover:shadow-md transition-all"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-[#E8F1EC] rounded-full flex items-center justify-center text-[#155239]">
                                                <User size={24} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-lg">
                                                    {c.full_name}
                                                </div>
                                                <div className="text-sm text-[#666] font-medium">
                                                    {c.final_grade} · {c.stack}{" "}
                                                    · {c.language}
                                                </div>
                                                <div className="text-xs text-[#888] mt-1 max-w-md line-clamp-1">
                                                    {c.summary}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-left sm:text-right w-full sm:w-auto bg-[#F5F5F3] px-4 py-2 rounded-lg">
                                            <div className="text-xl font-bold text-[#155239]">
                                                {c.total_score} / 100
                                            </div>
                                            <div className="text-xs text-[#888]">
                                                Оценка ИИ
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16 text-[#666] bg-white rounded-2xl border border-[#E5E5E5] shadow-sm">
                                <Search
                                    size={32}
                                    className="mx-auto text-[#CCC] mb-3"
                                />
                                Никого не найдено. Попробуйте изменить критерии
                                поиска.
                            </div>
                        )}
                    </motion.div>
                )}
            </main>
        </div>
    );
}
