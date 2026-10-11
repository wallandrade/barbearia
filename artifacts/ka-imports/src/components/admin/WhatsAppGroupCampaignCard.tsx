import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Loader2, Pencil, Trash2, Upload } from "lucide-react";
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
type ScheduleMode = "once" | "times" | "interval";
type CustomPost = {
  id: string;
  imageUrl: string;
  caption: string;
  linkUrl: string;
  scheduledAt: string;
  scheduleMode?: ScheduleMode;
  times?: string[];
  intervalHours?: number;
  durationDays?: number;
};

function postWhen(post: CustomPost): string {
  const days = post.durationDays && post.durationDays > 1 ? ` · ${post.durationDays} dias` : "";
  if (post.scheduleMode === "times") return `${post.scheduledAt.slice(0, 10)} · ${(post.times || []).join(", ")}${days}`;
  if (post.scheduleMode === "interval") return `${post.scheduledAt.replace("T", " ")} · de ${post.intervalHours} em ${post.intervalHours} horas${days}`;
  return post.scheduledAt.replace("T", " ");
}

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
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("once");
  const [scheduleDate, setScheduleDate] = useState("");
  const [times, setTimes] = useState<string[]>(["09:00"]);
  const [intervalHours, setIntervalHours] = useState(4);
  const [durationDays, setDurationDays] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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

  const clearPostForm = () => {
    setEditingId(null);
    setImageUrl("");
    setCaption("");
    setLinkUrl("");
    setScheduledAt("");
    setScheduleMode("once");
    setScheduleDate("");
    setTimes(["09:00"]);
    setIntervalHours(4);
    setDurationDays(1);
  };

  const addPost = async () => {
    setLoading(true);
    try {
      const res = await fetch(editingId ? `${BASE}/api/admin/whatsapp/groups/custom/${editingId}` : `${BASE}/api/admin/whatsapp/groups/custom`, {
        method: editingId ? "PUT" : "POST",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify({ imageUrl, caption, linkUrl, scheduledAt, scheduleDate, scheduleMode, times, intervalHours, durationDays }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) {
        toast.error(data.error || "Não consegui salvar o aviso.");
        return;
      }
      const wasEditing = Boolean(editingId);
      clearPostForm();
      toast.success(wasEditing ? "Aviso atualizado." : "Aviso agendado.");
      await refresh();
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (post: CustomPost) => {
    const match = post.scheduledAt.match(/(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
    setEditingId(post.id);
    setImageUrl(post.imageUrl);
    setCaption(post.caption || "");
    setLinkUrl(post.caption?.includes(post.linkUrl) ? "" : post.linkUrl);
    setScheduledAt(match ? `${match[1]}T${match[2]}` : post.scheduledAt.slice(0, 16));
    setScheduleDate(match?.[1] || post.scheduledAt.slice(0, 10));
    setScheduleMode(post.scheduleMode === "times" || post.scheduleMode === "interval" ? post.scheduleMode : "once");
    setTimes(post.times && post.times.length > 0 ? post.times : ["09:00"]);
    setIntervalHours(post.intervalHours && post.intervalHours > 0 ? post.intervalHours : 4);
    setDurationDays(post.durationDays && post.durationDays > 0 ? post.durationDays : 1);
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
                {httpsImage || String(product.image || "").startsWith("data:image/") ? (
                  <img src={product.image || ""} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-border object-cover" />
                ) : (
                  <span className="h-10 w-10 shrink-0 rounded-lg border border-border bg-muted" />
                )}
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
        <div className="flex flex-wrap gap-3 text-sm">
          {([
            ["once", "Uma vez"],
            ["times", "Vários horários"],
            ["interval", "De X em X horas"],
          ] as const).map(([mode, label]) => (
            <label key={mode} className="flex items-center gap-2">
              <input type="radio" checked={scheduleMode === mode} onChange={() => setScheduleMode(mode)} />
              {label}
            </label>
          ))}
        </div>
        {scheduleMode === "times" ? (
          <div className="space-y-2">
            <input type="date" value={scheduleDate} onChange={(event) => setScheduleDate(event.target.value)} className="h-10 px-3 rounded-xl border-2 border-border text-sm" />
            {times.map((time, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="time"
                  value={time}
                  onChange={(event) => setTimes((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))}
                  className="h-10 px-3 rounded-xl border-2 border-border text-sm"
                />
                {times.length > 1 ? (
                  <Button type="button" variant="outline" className="h-10" onClick={() => setTimes((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Tirar</Button>
                ) : null}
              </div>
            ))}
            <Button type="button" variant="outline" disabled={times.length >= 12} onClick={() => setTimes((current) => [...current, "12:00"])}>Adicionar horário</Button>
            <label className="flex items-center gap-2 text-sm">
              Permanece
              <input type="number" min={1} max={30} value={durationDays} onChange={(event) => setDurationDays(Number(event.target.value) || 1)} className="h-10 w-20 px-3 rounded-xl border-2 border-border text-sm" />
              dias
            </label>
            <p className="text-xs text-muted-foreground">Esses horários se repetem por esses dias, com 3 minutos entre os grupos. No máximo 12 horários e 30 dias.</p>
          </div>
        ) : scheduleMode === "interval" ? (
          <div className="space-y-2">
            <input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className="h-10 px-3 rounded-xl border-2 border-border text-sm" />
            <label className="flex items-center gap-2 text-sm">
              De
              <input type="number" min={1} max={12} value={intervalHours} onChange={(event) => setIntervalHours(Number(event.target.value) || 1)} className="h-10 w-20 px-3 rounded-xl border-2 border-border text-sm" />
              em {intervalHours} horas
            </label>
            <label className="flex items-center gap-2 text-sm">
              Permanece
              <input type="number" min={1} max={30} value={durationDays} onChange={(event) => setDurationDays(Number(event.target.value) || 1)} className="h-10 w-20 px-3 rounded-xl border-2 border-border text-sm" />
              dias
            </label>
            <p className="text-xs text-muted-foreground">A partir desse horário, de {intervalHours} em {intervalHours} horas, por {durationDays} {durationDays === 1 ? "dia" : "dias"}. No máximo 30 dias, com 3 minutos entre os grupos.</p>
          </div>
        ) : (
          <input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className="h-10 px-3 rounded-xl border-2 border-border text-sm" />
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => void addPost()} disabled={loading}>
            {editingId ? "Salvar aviso" : "Agendar"}
          </Button>
          {editingId ? (
            <Button type="button" variant="outline" onClick={clearPostForm}>Cancelar</Button>
          ) : null}
        </div>
        <ul className="space-y-2">
          {posts.map((post) => (
            <li key={post.id} className="flex items-start justify-between gap-2 text-sm">
              <span className="min-w-0 break-words">{postWhen(post)} · {post.caption || post.linkUrl}</span>
              <span className="flex shrink-0 gap-1">
                <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => startEdit(post)} aria-label="Editar">
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => void removePost(post.id)} aria-label="Remover">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
