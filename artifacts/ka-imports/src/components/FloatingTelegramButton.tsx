import { Send } from "lucide-react";

export function FloatingTelegramButton() {
  return (
    <a
      href="https://t.me/+G73302k1jYo0Yjgx"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-40 inline-flex items-center justify-center w-14 h-14 bg-sky-500 text-white rounded-full shadow-lg hover:shadow-xl hover:bg-sky-600 transition-all duration-200 hover:scale-110"
      title="Abrir Telegram"
      aria-label="Abrir Telegram"
    >
      <Send className="w-6 h-6" />
    </a>
  );
}
