import { useEffect, useState } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Product = { slug: string; name: string };
type Topic = { id: string; label: string };
type GuideBlock = { title: string; items: string[] };

const FALLBACK_PRODUCTS: Product[] = [
  { slug: "5-amino-1mq", name: "5-Amino-1MQ" },
  { slug: "adamax", name: "Adamax" },
  { slug: "aicar", name: "AICAR" },
  { slug: "aod-9604", name: "AOD-9604" },
  { slug: "dsip", name: "DSIP" },
  { slug: "ghk-cu", name: "GHK-Cu" },
  { slug: "hgh-fragment-176-191", name: "HGH Fragment 176-191" },
  { slug: "slu-pp-332", name: "SLU-PP-332" },
  { slug: "tesamorelin", name: "Tesamorelin" },
  { slug: "mots-c", name: "MOTS-C" },
  { slug: "tirzepatida", name: "Tirzepatida" },
  { slug: "retatrutide", name: "Retatrutide" },
];

const FALLBACK_TOPICS: Topic[] = [
  { id: "about", label: "O que é" },
  { id: "dose", label: "Dose e ciclo" },
  { id: "reconstitute", label: "Reconstituição" },
  { id: "effects", label: "Efeitos e cuidados" },
  { id: "stacks", label: "Pode juntar com" },
  { id: "research", label: "Pesquisa" },
];

export default function PeptideLibraryPanel({ variant = "compact" }: { variant?: "compact" | "page" }) {
  const [products, setProducts] = useState<Product[]>(FALLBACK_PRODUCTS);
  const [topics, setTopics] = useState<Topic[]>(FALLBACK_TOPICS);
  const [product, setProduct] = useState<Product | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [text, setText] = useState("");
  const [disclaimer, setDisclaimer] = useState("");
  const [blocks, setBlocks] = useState<GuideBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isPage = variant === "page";

  useEffect(() => {
    fetch(`${BASE}/api/chat/status`)
      .then((res) => res.json())
      .then((data: { products?: unknown; topics?: unknown }) => {
        if (Array.isArray(data?.products) && data.products.length && typeof data.products[0] === "object") {
          setProducts(data.products as Product[]);
        }
        if (Array.isArray(data?.topics) && data.topics.length) {
          setTopics(data.topics as Topic[]);
        }
      })
      .catch(() => {
        /* fallback local */
      });
  }, []);

  function resetProduct() {
    setProduct(null);
    setTopic(null);
    setText("");
    setDisclaimer("");
    setBlocks([]);
    setError("");
  }

  async function chooseTopic(next: Topic) {
    if (!product) return;
    setTopic(next);
    setLoading(true);
    setError("");
    setBlocks([]);
    setDisclaimer("");
    try {
      const res = await fetch(`${BASE}/api/chat/guide/${encodeURIComponent(product.slug)}/${encodeURIComponent(next.id)}`);
      const data = await res.json().catch(() => ({})) as {
        text?: string;
        message?: string;
        disclaimer?: string;
        blocks?: GuideBlock[];
      };
      if (!res.ok) {
        setText("");
        setError(data.message || "Não encontrei esse trecho.");
        return;
      }
      setDisclaimer(String(data.disclaimer || "").trim());
      setBlocks(Array.isArray(data.blocks) ? data.blocks.filter((block) => block?.title && Array.isArray(block.items)) : []);
      setText(String(data.text || "").trim());
    } catch {
      setText("");
      setError("Falha de conexão. Tente de novo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={isPage ? "space-y-4" : "space-y-3"}>
      {isPage && (
        <div>
          <h2 className="text-xl font-bold text-foreground">Biblioteca de compostos</h2>
          <p className="text-sm text-muted-foreground">Mesmo conteúdo da bolha do cliente. Informativo — clique no composto e no assunto.</p>
        </div>
      )}

      {!product && (
        <>
          <p className="text-sm text-slate-700">Escolha o composto:</p>
          <div className={isPage ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2" : "grid grid-cols-1 gap-2"}>
            {products.map((item) => (
              <button
                key={item.slug}
                type="button"
                onClick={() => { setProduct(item); setTopic(null); setText(""); setDisclaimer(""); setBlocks([]); setError(""); }}
                className="text-left px-3 py-2.5 rounded-xl border bg-white hover:bg-slate-100 text-sm font-medium text-slate-900"
              >
                {item.name}
              </button>
            ))}
          </div>
        </>
      )}

      {product && (
        <>
          <button
            type="button"
            onClick={resetProduct}
            className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Trocar composto
          </button>
          <p className={isPage ? "text-lg font-semibold text-slate-900" : "text-sm font-semibold text-slate-900"}>{product.name}</p>
          <p className="text-xs text-slate-500">O que você quer ver?</p>
          <div className="flex flex-wrap gap-1.5">
            {topics.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={loading}
                onClick={() => { void chooseTopic(item); }}
                className={`text-[11px] px-2.5 py-1.5 rounded-full border disabled:opacity-50 ${
                  topic?.id === item.id
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white hover:bg-slate-100 text-slate-800"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando ficha…
        </div>
      )}

      {error && (
        <div className="rounded-2xl border bg-white px-3 py-2.5 text-sm text-slate-800">
          {error}
        </div>
      )}

      {!error && (disclaimer || blocks.length > 0 || text) && (
        <div className="space-y-2">
          {disclaimer && (
            <p className="text-[11px] leading-snug text-amber-900 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
              {disclaimer}
            </p>
          )}
          {blocks.length > 0 ? blocks.map((block) => (
            <div key={block.title} className="rounded-2xl border bg-white px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                {block.title}
              </p>
              <ul className="space-y-1.5 text-sm text-slate-800 list-disc pl-4">
                {block.items.map((item) => (
                  <li key={item} className="leading-snug">{item}</li>
                ))}
              </ul>
            </div>
          )) : (
            <div className="rounded-2xl border bg-white px-3 py-2.5 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
              {text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
