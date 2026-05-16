import React from "react";

export default function WhatsAppGroup2() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Card Container */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-3xl p-8 shadow-2xl text-center space-y-6">
          {/* WhatsApp Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/20">
              <svg
                className="w-12 h-12 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-4.946 1.347l-.355.192-.368-.06c-1.286-.264-2.514-.597-3.635-1.12l.326 1.971c.44 2.65.218 5.295-.67 7.738 1.218.419 2.357 1.003 3.297 1.719l.462.39c2.159-.456 4.442-.409 6.57.454l.502.305c1.578-1.08 2.920-2.489 3.822-4.08-1.936-1.02-3.607-2.598-4.757-4.524l-.235-.453zm0 0" />
              </svg>
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
