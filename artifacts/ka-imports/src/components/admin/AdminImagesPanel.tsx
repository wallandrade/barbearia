import { useEffect, useRef, useState } from "react";
import { Copy, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function authHeaders(): Record<string, string> {
  const token = sessionStorage.getItem("adminToken") || localStorage.getItem("adminToken") || "";
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

type AdminImage = {
  id: string;
  name: string;
  imageUrl: string;
  createdAt: string;
};

function fileLabel(fileName: string): string {
  return fileName.replace(/\.[a-z0-9]{2,5}$/i, "").replace(/\s+/g, " ").trim().slice(0, 120);
}

export default function AdminImagesPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<AdminImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState("");
  const [deletingId, setDeletingId] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/admin/images`, { headers: authHeaders(), credentials: "include" });
      const data = await res.json().catch(() => ({})) as { images?: AdminImage[]; error?: string };
      if (!res.ok) {
        toast.error(data.error || "Não consegui carregar as imagens.");
        return;
      }
      setImages(Array.isArray(data.images) ? data.images : []);
    } catch {
      toast.error("Não consegui carregar as imagens.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const upload = (file: File) => {
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
        const max = 1600;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
        const compressed = ctx ? canvas.toDataURL("image/jpeg", 0.85) : src;
        const label = name.trim() || fileLabel(file.name) || "Imagem";
        setUploading(true);
        try {
          const res = await fetch(`${BASE}/api/admin/images`, {
            method: "POST",
            headers: authHeaders(),
            credentials: "include",
            body: JSON.stringify({ imageData: compressed, name: label }),
          });
          const data = await res.json().catch(() => ({})) as { error?: string; imageUrl?: string };
          if (!res.ok || !data.imageUrl?.startsWith("https://")) {
            toast.error(data.error || "Não consegui salvar a imagem.");
            return;
          }
          setName("");
          toast.success("Imagem salva. A URL está na lista.");
          await load();
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

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL copiada.");
    } catch {
      toast.error("Não consegui copiar a URL.");
    }
  };

  const remove = async (image: AdminImage) => {
    if (!window.confirm(`Tirar “${image.name}” da lista? A URL que você já copiou continua valendo.`)) return;
    setDeletingId(image.id);
    try {
      const res = await fetch(`${BASE}/api/admin/images/${image.id}`, {
        method: "DELETE",
        headers: authHeaders(),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) {
        toast.error(data.error || "Não consegui tirar a imagem.");
        return;
      }
      setImages((current) => current.filter((item) => item.id !== image.id));
    } catch {
      toast.error("Não consegui tirar a imagem.");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="bg-white rounded-xl border border-border p-6 space-y-5">
      <div>
        <h2 className="text-lg font-bold">Imagem</h2>
        <p className="text-sm text-muted-foreground mt-1">
          As fotos enviadas ficam aqui com a URL https. Copie o link quando precisar, por exemplo no aviso de filmagem do n8n.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nome da imagem (opcional)"
          maxLength={120}
          className="h-11 px-3 rounded-xl border-2 border-border bg-white focus:border-primary outline-none text-sm flex-1"
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) upload(file);
          }}
        />
        <Button type="button" className="gap-2" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Enviar imagem
        </Button>
      </div>

      {loading ? (
        <div className="py-10 text-center text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
          Carregando imagens...
        </div>
      ) : images.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6">Nenhuma imagem ainda. Envie a primeira para copiar a URL.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {images.map((image) => (
            <div key={image.id} className="flex gap-3 rounded-xl border border-border p-3">
              <img
                src={image.imageUrl}
                alt={image.name}
                className="w-20 h-20 rounded-lg object-cover bg-muted shrink-0"
              />
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-sm font-semibold truncate">{image.name}</p>
                <p className="text-xs text-muted-foreground break-all line-clamp-2">{image.imageUrl}</p>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => void copyUrl(image.imageUrl)}>
                    <Copy className="w-3.5 h-3.5" />
                    Copiar URL
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={deletingId === image.id}
                    onClick={() => void remove(image)}
                  >
                    {deletingId === image.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
