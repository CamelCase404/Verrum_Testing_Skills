import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { authApi } from "../api";
import { ArrowLeft, ShieldCheck, Loader2, Mail, Lock } from "lucide-react";

// --- СТАБИЛЬНЫЕ АНИМАЦИИ ---
const fadeIn = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5 } },
};
const slideLeft = {
    hidden: { opacity: 0, x: -30 },
    visible: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.6, ease: "easeOut" },
    },
};
const slideRight = {
    hidden: { opacity: 0, x: 30 },
    visible: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.6, ease: "easeOut" },
    },
};
const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.08, delayChildren: 0.2 },
    },
};
const fadeUp = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function LoginPage({ onLogin }: { onLogin: (u: any) => void }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await authApi.login(email, password);
            localStorage.setItem("token", res.data.access_token);
            const me = await authApi.getMe();
            onLogin(me.data);
            navigate("/");
        } catch (err: any) {
            setError(err.response?.data?.detail || "Ошибка входа");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center p-4 sm:p-8 font-sans text-[#1A1A1A] relative">
            <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => navigate("/")}
                className="absolute top-6 left-6 flex items-center gap-2 text-sm font-medium text-[#666] hover:text-[#155239] transition-colors bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm z-20"
            >
                <ArrowLeft size={16} /> Вернуться на сайт
            </motion.button>

            <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px] relative z-10"
            >
                {/* ЛЕВАЯ ПАНЕЛЬ */}
                <motion.div
                    variants={slideLeft}
                    className="w-full md:w-[45%] bg-[#155239] p-10 flex flex-col items-center justify-center text-center text-white relative overflow-hidden"
                >
                    <div className="absolute top-[-20%] left-[-20%] w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-48 h-48 bg-black/10 rounded-full blur-xl pointer-events-none" />

                    <div className="relative z-10 space-y-4">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.3, type: "spring" }}
                            className="w-16 h-16 bg-white/10 rounded-2xl mx-auto flex items-center justify-center mb-6 backdrop-blur-sm border border-white/20"
                        >
                            <ShieldCheck size={32} />
                        </motion.div>
                        <h2 className="text-3xl font-bold tracking-tight">
                            С возвращением!
                        </h2>
                        <p className="text-sm text-white/80 leading-relaxed px-4">
                            Чтобы оставаться с нами на связи, пожалуйста,
                            войдите, используя свои личные данные.
                        </p>
                    </div>
                </motion.div>

                {/* ПРАВАЯ ПАНЕЛЬ (ФОРМА) */}
                <motion.div
                    variants={slideRight}
                    className="w-full md:w-[55%] p-8 sm:p-12 flex flex-col justify-center bg-white"
                >
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold mb-2">
                            Вход в Verum
                        </h1>
                        <p className="text-xs text-gray-400 mt-2">
                            Используйте свой email и пароль
                        </p>
                    </div>

                    <motion.form
                        variants={staggerContainer}
                        initial="hidden"
                        animate="visible"
                        onSubmit={handleSubmit}
                        className="space-y-4"
                    >
                        <motion.div variants={fadeUp} className="relative">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="Email"
                                className="w-full bg-[#F5F5F3] border-none rounded-lg px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-[#155239]/30 transition-all placeholder:text-gray-400"
                            />
                            <Mail
                                size={18}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                        </motion.div>

                        <motion.div variants={fadeUp} className="relative">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="Пароль"
                                className="w-full bg-[#F5F5F3] border-none rounded-lg px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-[#155239]/30 transition-all placeholder:text-gray-400"
                            />
                            <Lock
                                size={18}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                        </motion.div>

                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div
                                    key="error"
                                    initial={{ opacity: 0, height: 0, y: -8 }}
                                    animate={{
                                        opacity: 1,
                                        height: "auto",
                                        y: 0,
                                    }}
                                    exit={{ opacity: 0, height: 0, y: -8 }}
                                    className="text-red-600 text-xs bg-red-50 border border-red-100 p-3 rounded-lg overflow-hidden text-center"
                                >
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="pt-2 flex flex-col items-center gap-4">
                            <motion.button
                                type="submit"
                                disabled={loading}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.95 }}
                                transition={{
                                    type: "spring",
                                    stiffness: 400,
                                    damping: 25,
                                }}
                                className="bg-[#155239] text-white font-semibold py-3 px-10 rounded-full hover:bg-[#0f3d2a] transition-colors duration-300 shadow-lg shadow-[#155239]/20 hover:shadow-xl hover:shadow-[#155239]/30 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
                            >
                                {loading ? (
                                    <>
                                        <Loader2
                                            size={16}
                                            className="animate-spin"
                                        />
                                        Загрузка...
                                    </>
                                ) : (
                                    "Войти"
                                )}
                            </motion.button>

                            {/* Ссылка на регистрацию под кнопкой */}
                            <div className="text-sm text-gray-500 mt-2">
                                Нет аккаунта?{" "}
                                <Link
                                    to="/register"
                                    className="text-[#155239] font-semibold hover:underline"
                                >
                                    Зарегистрироваться
                                </Link>
                            </div>
                        </div>
                    </motion.form>
                </motion.div>
            </motion.div>
        </div>
    );
}
