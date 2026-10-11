import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function authHeaders(): Record<string, string> {
  const token = sessionStorage.getItem("adminToken") || localStorage.getItem("adminToken") || "";
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

type GroupChat = { name: string; phone: string };
type ProductRow = { id: string; name: string; image: string | null; isActive: boolean; isSoldOut: boolean };
type CustomPost = { id: string; imageUrl: string; linkUrl: string; scheduledAt: string };

export default function WhatsAppGroupCampaignCard() {
  const [enabled, setEnabled] = useState(false);
  const [groups, setGroups] = useState<GroupChat[]>([]);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [posts, setPosts] = useState<CustomPost[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const [configRes, productsRes] = await Promise.all([
      fetch(`${BASE}/api/admin/whatsapp/groups`, { headers: authHeaders(), credentials: "include" }),
      fetch(`${BASE}/api/admin/products`, { headers: authHeaders(), credentials: "include" }),
    ]);
    if (configRes.ok) {
      const data = await configRes.json() as { enabled: boolean; productIds: string[]; groups: GroupChat[]; posts: CustomPost[] };
      setEnabled(Boolean(data.enabled));
      setProductIds(data.productIds || []);
      setGroups(data.groups || []);
      setPosts(data.posts || []);
    }
    if (productsRes.ok) {
      const data = await productsRes.json() as { products?: ProductRow[] };
      setProducts((data.products || []).filter((product) => product.isActive !== false));
    }
  }, []);

  useEffect(() => {
    void refresh().catch(() => undefined);
  }, [refresh]);

  const save = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/admin/whatsapp/groups`, {
        method: "PUT",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify({ enabled, productIds, groups }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) {
        toast.error(data.error || "Não consegui salvar.");
        return;
      }
      toast.success("Automação salva.");
      await refresh();
    } finally {
      setLoading(false);
    }
  };

  const addPost = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/admin/whatsapp/groups/custom`, {
        method: "POST",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify({ imageUrl, linkUrl, scheduledAt }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) {
        toast.error(data.error || "Não consegui agendar.");
        return;
      }
      setImageUrl("");
      setLinkUrl("");
      setScheduledAt("");
      toast.success("Aviso agendado.");
      await refresh();
    } finally {
      setLoading(false);
    }
  };

  const removePost = async (id: string) => {
    await fetch(`${BASE}/api/admin/whatsapp/groups/custom/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
      credentials: "include",
    });
    await refresh();
  };

  const toggleProduct = (id: string) => {
    setProductIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-white p-4 space-y-3">
        <h2 className="text-sm font-semibold">Produtos nos grupos</h2>
        <p className="text-xs text-muted-foreground">
          Sai pelo número de hoje, às 9h, 13h, 17h e 21h, com 3 minutos entre cada grupo. No máximo 6 grupos.
          Antes de ligar, desligue o fluxo Grupos tirzepatida no n8n, senão a mensagem sai duas vezes.
          Produto esgotado ou sem foto https fica de fora da rodada. O número da Poly não envia.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
          Campanha ligada
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          {groups.map((group, index) => (
            <label key={group.phone} className="text-xs space-y-1">
              <span className="text-muted-foreground">{group.name || `Grupo ${index + 1}`}</span>
              <input
                value={group.phone}
                onChange={(event) => setGroups((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, phone: event.target.value } : item))}
                className="w-full h-10 px-3 rounded-xl border-2 border-border text-sm"
              />
            </label>
          ))}
        </div>
        <div className="max-h-80 overflow-auto rounded-xl border border-border divide-y">
          {products.map((product) => {
            const httpsImage = String(product.image || "").startsWith("https://");
            return (
              <label key={product.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={productIds.includes(product.id)}
                  disabled={!httpsImage}
                  onChange={() => toggleProduct(product.id)}
                />
                <span>{product.name}</span>
                {!httpsImage ? <span className="text-xs text-muted-foreground">sem foto https</span> : null}
                {product.isSoldOut ? <span className="text-xs text-muted-foreground">esgotado</span> : null}
              </label>
            );
          })}
        </div>
        <Button type="button" onClick={() => void save()} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Salvar campanha
        </Button>
      </section>

      <section className="rounded-2xl border border-border bg-white p-4 space-y-3">
        <h2 className="text-sm font-semibold">Imagem e link avulso</h2>
        <p className="text-xs text-muted-foreground">
          No horário escolhido, a imagem sai para os mesmos grupos, com 3 minutos entre cada um. O horário é o de São Paulo.
        </p>
        <input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://… imagem" className="w-full h-10 px-3 rounded-xl border-2 border-border text-sm" />
        <input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://… link da mensagem" className="w-full h-10 px-3 rounded-xl border-2 border-border text-sm" />
        <input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className="h-10 px-3 rounded-xl border-2 border-border text-sm" />
        <Button type="button" variant="outline" onClick={() => void addPost()} disabled={loading}>Agendar</Button>
        <ul className="space-y-2">
          {posts.map((post) => (
            <li key={post.id} className="flex items-center justify-between gap-2 text-sm">
              <span>{post.scheduledAt.replace("T", " ")} · {post.linkUrl}</span>
              <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => void removePost(post.id)} aria-label="Remover">
                <Trash2 className="w-4 h-4" />
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
