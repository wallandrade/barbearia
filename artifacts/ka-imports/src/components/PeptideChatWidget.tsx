import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import PeptideLibraryPanel from "@/components/PeptideLibraryPanel";

export default function PeptideChatWidget() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed z-[200] right-4 sm:right-6" style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}>
      {open && (
        <div className="mb-3 w-[min(100vw-2rem,380px)] h-[min(70vh,520px)] bg-white border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b bg-slate-900 text-white flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Biblioteca Yury</p>
              <p className="text-[11px] text-slate-300">Informativo · clique no que quer ver</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white/10" aria-label="Fechar">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3 bg-slate-50">
            <PeptideLibraryPanel variant="compact" />
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-14 w-14 rounded-full bg-slate-900 text-white shadow-xl flex items-center justify-center hover:bg-slate-800"
        aria-label="Abrir biblioteca"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </div>
  );
}
