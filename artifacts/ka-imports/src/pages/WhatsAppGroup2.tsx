import React from "react";
import { FaWhatsapp } from "react-icons/fa";

export default function WhatsAppGroup2() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Card Container */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-3xl p-8 shadow-2xl text-center space-y-6">
          {/* WhatsApp Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/20">
              <FaWhatsapp className="w-11 h-11 text-white" aria-hidden="true" />
            </div>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-3xl font-bold text-white mb-4">Grupo Ka Imports</h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Clique no botão abaixo para ser redirecionado(a) imediatamente para nosso grupo exclusivo no WhatsApp.
            </p>
          </div>

          {/* CTA Button */}
          <a
            href="https://chat.whatsapp.com/EiJB9AGZGmt44gsJSqEVMk"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block w-full"
          >
            <button className="w-full bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-white font-bold py-4 px-6 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg shadow-green-500/30 hover:shadow-green-500/50">
              ENTRAR NO GRUPO KA IMPORTS
            </button>
          </a>

          {/* Encrypted Message */}
          <div className="flex items-center justify-center gap-2 text-slate-400 text-xs">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
            </svg>
            <span>Conversa Criptografada</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-slate-500 text-sm">
          <p>© 2024 Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
}
