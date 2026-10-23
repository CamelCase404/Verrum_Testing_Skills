import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
    ArrowRight,
    Code2,
    Search,
    PlayCircle,
    Sparkles,
    Mail,
    MapPin,
} from "lucide-react";

// --- АНИМАЦИИ ДЛЯ ГЛАВНОГО ЭКРАНА (Framer Motion) ---
const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: "easeOut" },
    },
};

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
};

const cardHover = { y: -4, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" };

// --- ХУК ДЛЯ ПОЯВЛЕНИЯ ПРИ СКРОЛЛЕ (IntersectionObserver) ---
function useScrollReveal() {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect(); // Отключаем после первого срабатывания
                }
            },
            { threshold: 0.2 },
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => observer.disconnect();
    }, []);

    return { ref, isVisible };
}

export default function HomePage() {
    const navigate = useNavigate();

    // Используем наш кастомный хук для секций
    const howItWorks = useScrollReveal();
    const steps = useScrollReveal();

    return (
        <div className="min-h-screen bg-[#F5F5F3] font-sans text-[#1A1A1A] flex flex-col overflow-hidden">
            {/* Хедер */}
            <header className="fixed w-full top-0 z-50 bg-[#F5F5F3]/90 backdrop-blur-md border-b border-[#E5E5E5]">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 font-bold text-xl cursor-pointer"
                        onClick={() => navigate("/")}
                    >
                        Verum
                    </motion.div>

                    <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#666]">
                        {["Как работает", "Уровни", "Заказчикам"].map(
                            (item, i) => (
                                <motion.a
                                    key={i}
                                    href={`#${item === "Как работает" ? "how-it-works" : item === "Уровни" ? "levels" : "for-companies"}`}
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="hover:text-black transition-colors"
                                >
                                    {item}
                                </motion.a>
                            ),
                        )}
                    </nav>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2"
                    >
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate("/login")}
                            className="text-sm font-medium px-5 py-2.5 rounded-lg border border-transparent hover:border-[#E5E5E5] hover:bg-white transition-colors"
                        >
                            Войти
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() =>
                                navigate("/register", {
                                    state: { role: "developer" },
                                })
                            }
                            className="bg-[#155239] text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-[#0f3d2a] transition-colors shadow-sm"
                        >
                            Регистрация
                        </motion.button>
                    </motion.div>
                </div>
            </header>

            {/* Главный экран */}
            <main className="flex-grow pt-32 pb-20 relative">
                <div className="absolute top-20 left-[-10%] w-[500px] h-[500px] bg-green-200/20 rounded-full blur-[120px] pointer-events-none -z-10"></div>

                <section className="max-w-7xl mx-auto px-6 mb-24">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={staggerContainer}
                            className="space-y-8"
                        >
                            <motion.div
                                variants={fadeUp}
                                className="text-xs font-bold tracking-widest uppercase text-[#888]"
                            >
                                Биржа фриланса · Верификация ИИ
                            </motion.div>

                            <motion.h1
                                variants={fadeUp}
                                className="text-5xl lg:text-7xl font-bold leading-[1.05] tracking-tight"
                            >
                                Навыки <br />
                                <span className="text-[#155239]">
                                    проверены,
                                </span>{" "}
                                <br />а не заявлены
                            </motion.h1>

                            <motion.p
                                variants={fadeUp}
                                className="text-lg text-[#666] max-w-md leading-relaxed"
                            >
                                Verum анализирует GitHub, парсит чаты с ИИ и
                                проводит стресс-тест с мутацией кода. Заказчик
                                получает шортлист тех, кто действительно
                                подходит.
                            </motion.p>

                            <motion.div
                                variants={fadeUp}
                                className="flex flex-wrap gap-4 pt-4"
                            >
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() =>
                                        navigate("/register", {
                                            state: { role: "company" },
                                        })
                                    }
                                    className="bg-[#155239] text-white font-medium px-8 py-4 rounded-lg flex items-center gap-2 hover:bg-[#0f3d2a] transition-colors shadow-lg shadow-[#155239]/20"
                                >
                                    Найти специалиста <ArrowRight size={18} />
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() =>
                                        navigate("/register", {
                                            state: { role: "developer" },
                                        })
                                    }
                                    className="bg-white text-[#1A1A1A] border border-[#E5E5E5] font-medium px-8 py-4 rounded-lg hover:border-[#155239] transition-colors shadow-sm"
                                >
                                    Я специалист
                                </motion.button>
                            </motion.div>

                            <motion.div
                                variants={fadeUp}
                                className="flex gap-12 pt-8 border-t border-[#E5E5E5]"
                            >
                                {[
                                    { value: "3", label: "уровня проверки" },
                                    { value: "2 400", label: "профиля прошли" },
                                    { value: "~7 мин", label: "до шортлиста" },
                                ].map((stat, i) => (
                                    <div key={i}>
                                        <div className="text-2xl font-bold">
                                            {stat.value}
                                        </div>
                                        <div className="text-xs text-[#888] mt-1">
                                            {stat.label}
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        </motion.div>

                        {/* Карточка разработчика */}
                        <motion.div
                            initial={{ opacity: 0, x: 50, rotate: 2 }}
                            animate={{ opacity: 1, x: 0, rotate: 0 }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                            className="relative hidden lg:flex items-center justify-center"
                        >
                            <div className="bg-white p-8 rounded-2xl shadow-2xl border border-[#E5E5E5] w-full max-w-md relative z-10">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 bg-[#E8F1EC] rounded-full flex items-center justify-center text-[#155239] font-bold text-lg">
                                        МК
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">
                                            Марина Ковалёва
                                        </h3>
                                        <p className="text-sm text-[#888]">
                                            Frontend-разработчик
                                        </p>
                                    </div>
                                    <motion.div
                                        animate={{ y: [0, -5, 0] }}
                                        transition={{
                                            repeat: Infinity,
                                            duration: 2,
                                        }}
                                        className="ml-auto bg-[#F5F5F3] text-[#1A1A1A] text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-2 border border-[#E5E5E5]"
                                    >
                                        <Code2 size={14} /> Verified
                                    </motion.div>
                                </div>

                                <div className="space-y-4 mb-6">
                                    {[
                                        {
                                            label: "Анализ GitHub",
                                            score: 86,
                                            color: "bg-[#155239]",
                                        },
                                        {
                                            label: "Качество кода",
                                            score: 82,
                                            color: "bg-[#155239]",
                                        },
                                        {
                                            label: "Работа с ИИ",
                                            score: 74,
                                            color: "bg-[#D97706]",
                                        },
                                    ].map((skill, i) => (
                                        <div key={i}>
                                            <div className="flex justify-between text-sm font-medium mb-1.5">
                                                <span className="text-[#666]">
                                                    {skill.label}
                                                </span>
                                                <span className="font-bold">
                                                    {skill.score}
                                                </span>
                                            </div>
                                            <div className="h-2 w-full bg-[#F5F5F3] rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{
                                                        width: `${skill.score}%`,
                                                    }}
                                                    transition={{
                                                        duration: 1.2,
                                                        delay: 0.8 + i * 0.2,
                                                    }}
                                                    className={`h-full ${skill.color} rounded-full`}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex flex-wrap gap-2 mb-6">
                                    {[
                                        "React",
                                        "TypeScript",
                                        "Next.js",
                                        "Node",
                                    ].map((tag) => (
                                        <span
                                            key={tag}
                                            className="bg-[#E8F1EC] text-[#155239] text-xs font-medium px-3 py-1 rounded-md"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>

                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    className="bg-[#F5F5F3] rounded-xl p-4 border border-[#E5E5E5] flex items-center gap-3 cursor-pointer"
                                >
                                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-[#155239] shadow-sm">
                                        <Sparkles size={14} />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold">
                                            Собеседование пройдено
                                        </div>
                                        <div className="text-xs text-[#888]">
                                            10 минут · 14 вопросов
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* Блок 1: Как происходит найм */}
                <section
                    id="how-it-works"
                    className="py-24 bg-white border-y border-[#E5E5E5]"
                >
                    <div className="max-w-7xl mx-auto px-6">
                        <div
                            ref={howItWorks.ref}
                            className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"
                        >
                            {/* CSS Анимация появления */}
                            <div
                                className={`transition-all duration-700 ease-out ${howItWorks.isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-10"}`}
                            >
                                <div className="text-xs font-bold tracking-widest uppercase text-[#888] mb-4">
                                    Как происходит найм
                                </div>
                                <h2 className="text-4xl font-bold mb-6">
                                    Опишите задачу —<br />
                                    получите шортлист
                                </h2>
                                <p className="text-[#666] mb-8 leading-relaxed">
                                    Не нужно перебирать портфолио и придумывать
                                    тестовые. Напишите афишу своими словами —
                                    система разберёт её и подберёт людей.
                                </p>
                                <ul className="space-y-3">
                                    {[
                                        "Разбор афиши: стек, уровень, формат, сроки",
                                        "Определение потребности в ИИ-навыках",
                                        "Ранжирование специалистов по релевантности",
                                        "Прозрачная причина совпадения",
                                    ].map((item, i) => (
                                        <li
                                            key={i}
                                            className="flex items-center gap-2 text-sm text-[#666]"
                                        >
                                            <div className="w-1.5 h-1.5 rounded-full bg-[#155239]" />{" "}
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div
                                className={`transition-all duration-700 ease-out delay-150 ${howItWorks.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"} bg-[#F5F5F3] rounded-2xl border border-[#E5E5E5] shadow-xl overflow-hidden`}
                            >
                                <div className="p-6 border-b border-[#E5E5E5] flex justify-between items-center bg-white">
                                    <h3 className="font-bold">
                                        Поиск разработчика
                                    </h3>
                                    <span className="text-xs font-bold text-[#155239] bg-[#E8F1EC] px-2 py-1 rounded">
                                        ПОИСК
                                    </span>
                                </div>
                                <div className="p-6 space-y-6">
                                    <div className="bg-white p-4 rounded-xl text-sm text-[#666] border border-[#E5E5E5]">
                                        Ищу фронтенд-разработчика в команду для
                                        переписывания личного кабинета. Стек —
                                        React + TypeScript, бэкенд на REST.
                                        Обязательно опыт с ИИ-ассистентами.
                                        Занятость — частичная, 6 недель.
                                    </div>

                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between border-b border-[#E5E5E5] pb-2">
                                            <span className="text-[#888]">
                                                Навыки
                                            </span>
                                            <span className="font-medium text-right">
                                                React · TypeScript · REST
                                            </span>
                                        </div>
                                        <div className="flex justify-between border-b border-[#E5E5E5] pb-2">
                                            <span className="text-[#888]">
                                                Уровень
                                            </span>
                                            <span className="font-medium text-right">
                                                Middle и выше
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-[#888]">
                                                Формат
                                            </span>
                                            <span className="font-medium text-right">
                                                Частичная · 6 недель
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs font-bold text-[#888] uppercase mb-3">
                                            Найденные специалисты
                                        </div>
                                        <div className="space-y-3">
                                            {[
                                                {
                                                    name: "Марина Ковалёва",
                                                    role: "Frontend",
                                                    match: "94%",
                                                },
                                                {
                                                    name: "Алина Ткачук",
                                                    role: "Frontend",
                                                    match: "81%",
                                                },
                                                {
                                                    name: "Данила Ершов",
                                                    role: "Fullstack",
                                                    match: "76%",
                                                },
                                            ].map((c, i) => (
                                                <motion.div
                                                    key={i}
                                                    whileHover={cardHover}
                                                    className="flex items-center justify-between p-3 rounded-xl border border-[#E5E5E5] bg-white transition-colors cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-[#E8F1EC] flex items-center justify-center text-[#155239] text-xs font-bold">
                                                            {c.name
                                                                .split(" ")
                                                                .map(
                                                                    (n) => n[0],
                                                                )
                                                                .join("")}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold">
                                                                {c.name}
                                                            </div>
                                                            <div className="text-[11px] text-[#888]">
                                                                {c.role}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-sm font-bold">
                                                        {c.match}
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Блок 2: Как проходит собеседование */}
                <section id="levels" className="py-24">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="mb-16">
                            <div className="text-xs font-bold tracking-widest uppercase text-[#888] mb-4">
                                Как проходит собеседование
                            </div>
                            <h2 className="text-4xl font-bold">
                                Три шага вместо десяти переписок
                            </h2>
                        </div>

                        <div
                            ref={steps.ref}
                            className="grid grid-cols-1 md:grid-cols-3 gap-6"
                        >
                            {[
                                {
                                    icon: Code2,
                                    title: "1. Анализ кода",
                                    desc: "ИИ подключается к GitHub, оценивает структуру проектов, стиль кода и историю коммитов.",
                                    delay: "delay-0",
                                },
                                {
                                    icon: PlayCircle,
                                    title: "2. ИИ-собеседование",
                                    desc: "Проводим стресс-тест с мутацией кода. Кандидат ищет баги и объясняет архитектурные решения.",
                                    delay: "delay-150",
                                },
                                {
                                    icon: Search,
                                    title: "3. Готовый шортлист",
                                    desc: "Вы получаете список кандидатов, отсортированных по релевантности к вашей задаче.",
                                    delay: "delay-300",
                                },
                            ].map((f, i) => (
                                <div
                                    key={i}
                                    className={`transition-all duration-700 ease-out ${f.delay} ${
                                        steps.isVisible
                                            ? "opacity-100 translate-y-0"
                                            : "opacity-0 translate-y-12"
                                    } p-8 rounded-2xl bg-white border border-[#E5E5E5] hover:shadow-xl hover:-translate-y-1`}
                                >
                                    <div className="w-12 h-12 bg-[#F5F5F3] text-[#155239] rounded-xl flex items-center justify-center mb-6">
                                        <f.icon size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold mb-3">
                                        {f.title}
                                    </h3>
                                    <p className="text-[#666] text-sm leading-relaxed">
                                        {f.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            {/* Футер */}
            <footer className="bg-white border-t border-[#E5E5E5] py-16">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
                    <div className="col-span-1 md:col-span-2">
                        <div className="font-bold text-xl mb-4">Verum</div>
                        <p className="text-sm text-[#888] max-w-xs leading-relaxed">
                            Платформа для объективной оценки технических навыков
                            разработчиков.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-bold mb-4 text-sm">Компания</h4>
                        <ul className="space-y-3 text-sm text-[#666]">
                            <li>
                                <a href="#" className="hover:text-[#155239]">
                                    О нас
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-[#155239]">
                                    Контакты
                                </a>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold mb-4 text-sm">Контакты</h4>
                        <ul className="space-y-3 text-sm text-[#666]">
                            <li className="flex items-center gap-2">
                                <Mail size={16} /> support@verum.ai
                            </li>
                            <li className="flex items-center gap-2">
                                <MapPin size={16} /> Москва
                            </li>
                        </ul>
                    </div>
                </div>
            </footer>
        </div>
    );
}
