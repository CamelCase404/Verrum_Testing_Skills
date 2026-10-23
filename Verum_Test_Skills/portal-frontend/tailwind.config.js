/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            colors: {
                page: "#f8fafc",
                card: "#ffffff",
                ink: "#0f172a",
                muted: "#64748b",
                accent: "#155239",
                accentSoft: "#e8f1ec",
                divider: "#e2e8f0",
            },
            borderRadius: { xl2: "18px", "3xl": "24px", "4xl": "32px" },
            boxShadow: {
                card: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
                "3xl": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            },
            fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
            animation: {
                blob: "blob 7s infinite",
            },
            keyframes: {
                blob: {
                    "0%": { transform: "translate(0px, 0px) scale(1)" },
                    "33%": { transform: "translate(30px, -50px) scale(1.1)" },
                    "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
                    "100%": { transform: "translate(0px, 0px) scale(1)" },
                },
            },
        },
    },
    plugins: [],
};
