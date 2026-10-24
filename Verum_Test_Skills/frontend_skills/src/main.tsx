import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Принимаем токен из URL (?token=...) и сохраняем в localStorage
const params = new URLSearchParams(window.location.search);
const tokenFromUrl = params.get("token");
if (tokenFromUrl) {
    localStorage.setItem("token", tokenFromUrl);
    params.delete("token");
    const query = params.toString();
    window.history.replaceState(
        {},
        document.title,
        window.location.pathname + (query ? `?${query}` : ""),
    );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
