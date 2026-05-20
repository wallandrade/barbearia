import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { installGlobalErrorReporting } from "@/lib/client-error-reporting";

function renderBootstrapFallback(): void {
	const root = document.getElementById("root");
	if (!root) return;

	root.innerHTML = `
		<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#f8fafc;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
			<div style="max-width:420px;text-align:center;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;box-shadow:0 8px 24px rgba(15,23,42,.08);">
				<h1 style="margin:0 0 8px 0;font-size:20px;color:#0f172a;">Nao foi possivel carregar a pagina</h1>
				<p style="margin:0 0 16px 0;color:#475569;font-size:14px;">O aplicativo encontrou um erro de inicializacao. Tente recarregar.</p>
				<button id="ka-reload-btn" style="border:0;border-radius:10px;background:#0f172a;color:#fff;padding:10px 16px;font-weight:600;cursor:pointer;">Recarregar</button>
			</div>
		</div>
	`;

	const button = document.getElementById("ka-reload-btn");
	button?.addEventListener("click", () => window.location.reload());
}

// Recover automatically when a newly deployed version invalidates cached chunks.
window.addEventListener("vite:preloadError", (event) => {
	event.preventDefault();
	window.location.reload();
});

window.addEventListener("error", () => {
	const root = document.getElementById("root");
	if (root && root.childElementCount === 0) {
		renderBootstrapFallback();
	}
});

installGlobalErrorReporting();

try {
	createRoot(document.getElementById("root")!).render(<App />);
} catch {
	renderBootstrapFallback();
}
