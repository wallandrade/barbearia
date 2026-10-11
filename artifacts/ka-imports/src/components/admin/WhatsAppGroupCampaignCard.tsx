import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Loader2, Trash2, Upload } from "lucide-react";
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
type CustomPost = { id: string; imageUrl: string; caption: string; linkUrl: string; scheduledAt: string };

export default function WhatsAppGroupCampaignCard() {
  const [enabled, setEnabled] = useState(false);
  const [groups, setGroups] = useState<GroupChat[]>([]);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [posts, setPosts] = useState<CustomPost[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const uploadImage = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 10MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result || "");
      if (!src.startsWith("data:image/")) {
        toast.error("Envie uma imagem JPG, PNG, WebP ou GIF.");
        return;
      }
      const img = new Image();
      img.onload = async () => {
        const max = 1280;
        const scale = img.width > max ? max / img.width : 1;
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = ctx ? canvas.toDataURL("image/jpeg", 0.85) : src;
        setUploading(true);
        try {
          const res = await fetch(`${BASE}/api/admin/whatsapp/groups/upload-image`, {
            method: "POST",
            headers: authHeaders(),
            credentials: "include",
            body: JSON.stringify({ imageData: compressed }),
          });
          const data = await res.json().catch(() => ({})) as { error?: string; imageUrl?: string };
          if (!res.ok || !data.imageUrl?.startsWith("https://")) {
            toast.error(data.error || "Não consegui salvar a imagem.");
            return;
          }
          setImageUrl(data.imageUrl);
          toast.success("Imagem salva. A URL já está no campo.");
        } catch {
          toast.error("Não consegui salvar a imagem.");
        } finally {
          setUploading(false);
          if (fileRef.current) fileRef.current.value = "";
        }
      };
      img.onerror = () => toast.error("Não consegui ler essa imagem.");
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const addPost = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/admin/whatsapp/groups/custom`, {
        method: "POST",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify({ imageUrl, caption, linkUrl, scheduledAt }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) {
        toast.error(data.error || "Não consegui agendar.");
        return;
      }
      setImageUrl("");
      setCaption("");
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
          Carregue a foto e escreva o texto. Se o link https já estiver no texto, o outro campo pode ficar vazio. No horário escolhido, a mensagem vai para os mesmos grupos, com 3 minutos entre cada um. O horário é o de São Paulo.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) uploadImage(file);
          }}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Carregar imagem
          </Button>
          {imageUrl.startsWith("https://") ? (
            <img src={imageUrl} alt="" className="h-14 w-14 rounded-lg border border-border object-cover" />
          ) : null}
        </div>
        <div className="flex gap-2">
          <input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="A URL da imagem aparece aqui" className="w-full h-10 px-3 rounded-xl border-2 border-border text-sm" />
          <Button
            type="button"
            variant="outline"
            className="h-10 shrink-0"
            disabled={!imageUrl}
            onClick={() => {
              void navigator.clipboard.writeText(imageUrl).then(
                () => toast.success("URL copiada."),
                () => toast.error("Não consegui copiar a URL."),
              );
            }}
          >
            <Copy className="w-4 h-4" />
            Copiar URL
          </Button>
        </div>
        <textarea value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Texto que vai junto com a imagem" rows={4} maxLength={1000} className="w-full px-3 py-2 rounded-xl border-2 border-border text-sm" />
        <input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="Link https, só se ainda não estiver no texto" className="w-full h-10 px-3 rounded-xl border-2 border-border text-sm" />
        <input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className="h-10 px-3 rounded-xl border-2 border-border text-sm" />
        <Button type="button" variant="outline" onClick={() => void addPost()} disabled={loading}>Agendar</Button>
        <ul className="space-y-2">
          {posts.map((post) => (
            <li key={post.id} className="flex items-center justify-between gap-2 text-sm">
              <span>{post.scheduledAt.replace("T", " ")} · {post.caption || post.linkUrl}</span>
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
