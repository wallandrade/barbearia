import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, ImagePlus, Loader2, Search, ShieldAlert, ShoppingBag } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { getCheckoutSecurityHeaders } from "@/lib/checkout-security";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type SupportOrderItem = {
  id: string;
  name: string;
  quantity: number;
  price?: number;
};

type SupportOrder = {
  id: string;
  orderNumber?: number | null;
  clientName: string;
  total: number;
  status: string;
  createdAt: string;
  products: SupportOrderItem[];
  includeInsurance?: boolean;
  insuranceClaimStatus?: string;
  parentOrderId?: string | null;
};

type AddressChangePayload = {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
};

type ProblemType = "missing_items" | "other" | "extravio" | "";

type MissingSelection = {
  id: string;
  name: string;
  maxQuantity: number;
  quantity: number;
  selected: boolean;
};

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function formatCpf(value: string): string {
  const digits = digitsOnly(value).slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function formatDateBR(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function formatCep(value: string): string {
  const digits = digitsOnly(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function buildMissingSelections(order: SupportOrder | null): MissingSelection[] {
  if (!order) return [];
  return (order.products || [])
    .filter((p) => p.id && p.quantity > 0)
    .map((p) => ({
      id: p.id,
      name: p.name,
      maxQuantity: Math.max(1, Number(p.quantity) || 1),
      quantity: Math.max(1, Number(p.quantity) || 1),
      selected: false,
    }));
}

export default function Support() {
  const [cpf, setCpf] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [orders, setOrders] = useState<SupportOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [problemType, setProblemType] = useState<ProblemType>("");
  const [missingSelections, setMissingSelections] = useState<MissingSelection[]>([]);
  const [trackingCode, setTrackingCode] = useState("");
  const [description, setDescription] = useState("");
  const [imageData, setImageData] = useState<string | null>(null);
  const [wantsAddressChange, setWantsAddressChange] = useState(false);
  const [newAddress, setNewAddress] = useState<AddressChangePayload>({
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
  });
  const [cepLoading, setCepLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  );

  useEffect(() => {
    setProblemType("");
    const order = orders.find((row) => row.id === selectedOrderId) ?? null;
    setMissingSelections(buildMissingSelections(order));
    setDescription("");
  }, [selectedOrderId, orders]);

  const selectedMissingProducts = useMemo(
    () => missingSelections
      .filter((item) => item.selected && item.quantity > 0)
      .map((item) => ({
        id: item.id,
        name: item.name,
        quantity: Math.min(item.quantity, item.maxQuantity),
      })),
    [missingSelections],
  );

  const handleLookup = async () => {
    const cpfDigits = digitsOnly(cpf);
    if (cpfDigits.length !== 11) {
      toast.error("Informe um CPF valido.");
      return;
    }

    setLookupLoading(true);
    try {
      const res = await fetch(`${BASE}/api/support/orders-by-cpf`, {
        method: "POST",
        headers: await getCheckoutSecurityHeaders(),
        body: JSON.stringify({ cpf: cpfDigits }),
      });
      const data = (await res.json()) as { orders?: SupportOrder[]; message?: string };
      if (!res.ok) {
        toast.error(data.message || "Nao foi possivel localizar pedidos.");
        return;
      }

      const found = (data.orders || []).map((order) => ({
        ...order,
        products: (order.products || [])
          .map((p) => ({
            id: String(p.id || "").trim(),
            name: String(p.name || "Produto"),
            quantity: Number(p.quantity) || 0,
            price: Number(p.price) || 0,
          }))
          .filter((p) => p.id && p.quantity > 0),
      }));
      setOrders(found);
      setSelectedOrderId(found.length === 1 ? found[0].id : "");
      setProblemType("");

      if (found.length === 0) {
        toast.info("Nao encontramos pedidos pagos para este CPF.");
      } else if (found.length === 1) {
        toast.success("Pedido localizado. Escolha o tipo de problema.");
      } else {
        toast.success("Escolha o pedido que voce quer reportar.");
      }
    } catch {
      toast.error("Erro de conexao ao buscar pedidos.");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Envie apenas imagem (JPG ou PNG).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande. Maximo 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setImageData((e.target?.result as string) || null);
    };
    reader.readAsDataURL(file);
  };

  const handleAddressCepChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(event.target.value);
    setNewAddress((prev) => ({ ...prev, cep: formatted }));

    const rawCep = digitsOnly(formatted);
    if (rawCep.length !== 8) return;

    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
      const data = (await res.json()) as {
        erro?: boolean;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      };

      if (!data.erro) {
        setNewAddress((prev) => ({
          ...prev,
          street: data.logradouro || prev.street,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
        }));

        if (!data.logradouro) {
          toast.info("CEP encontrado, mas sem rua cadastrada. Preencha o endereco manualmente.");
        }
      } else {
        toast.error("CEP nao encontrado. Preencha o endereco manualmente.");
      }
    } catch {
      toast.error("Erro ao consultar CEP. Preencha o endereco manualmente.");
    } finally {
      setCepLoading(false);
    }
  };

  const submitTicket = async () => {
    const cpfDigits = digitsOnly(cpf);
    if (!selectedOrderId) {
      toast.error("Selecione o pedido correto.");
      return;
    }
    if (!problemType) {
      toast.error("Escolha o tipo de problema.");
      return;
    }
    if (cpfDigits.length !== 11) {
      toast.error("CPF invalido.");
      return;
    }
    if (problemType === "missing_items" && selectedMissingProducts.length === 0) {
      toast.error("Marque ao menos um produto que faltou.");
      return;
    }
    if (problemType === "other" && description.trim().length < 10) {
      toast.error("Descreva o problema com pelo menos 10 caracteres.");
      return;
    }
    if (trackingCode.trim().length < 6) {
      toast.error("Informe o numero de rastreio (minimo 6 caracteres).");
      return;
    }

    let addressChange: AddressChangePayload | null = null;
    if (wantsAddressChange) {
      const cepDigits = digitsOnly(newAddress.cep);
      const state = String(newAddress.state || "").trim().toUpperCase();
      if (
        cepDigits.length !== 8
        || !String(newAddress.street || "").trim()
        || !String(newAddress.number || "").trim()
        || !String(newAddress.neighborhood || "").trim()
        || !String(newAddress.city || "").trim()
        || state.length !== 2
      ) {
        toast.error("Preencha o novo endereco completo (CEP, rua, numero, bairro, cidade e UF).");
        return;
      }

      addressChange = {
        cep: cepDigits,
        street: String(newAddress.street || "").trim(),
        number: String(newAddress.number || "").trim(),
        complement: String(newAddress.complement || "").trim(),
        neighborhood: String(newAddress.neighborhood || "").trim(),
        city: String(newAddress.city || "").trim(),
        state,
      };
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${BASE}/api/support/tickets`, {
        method: "POST",
        headers: await getCheckoutSecurityHeaders(),
        body: JSON.stringify({
          cpf: cpfDigits,
          orderId: selectedOrderId,
          trackingCode: trackingCode.trim(),
          description: description.trim(),
          imageData,
          addressChange,
          problemType,
          missingProducts: problemType === "missing_items" ? selectedMissingProducts : [],
        }),
      });
      const data = (await res.json()) as { ok?: boolean; ticketId?: string; message?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.message || "Nao foi possivel abrir o chamado.");
        return;
      }
      setTicketId(data.ticketId || "");
      toast.success("Chamado aberto com sucesso.");
    } catch {
      toast.error("Erro de conexao ao enviar chamado.");
    } finally {
      setSubmitting(false);
    }
  };

  const restart = () => {
    setOrders([]);
    setSelectedOrderId("");
    setProblemType("");
    setMissingSelections([]);
    setTrackingCode("");
    setDescription("");
    setImageData(null);
    setWantsAddressChange(false);
    setNewAddress({
      cep: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
    });
    setTicketId(null);
  };

  const showDetailsStep = Boolean(selectedOrder && problemType && (problemType === "other" || problemType === "extravio" || selectedMissingProducts.length > 0 || problemType === "missing_items"));

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white py-8">
        <div className="mx-auto w-full max-w-3xl px-4">
          <div className="rounded-3xl border border-amber-200 bg-white shadow-sm p-6 sm:p-8">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Suporte de Entrega</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900">Reportar problema no pedido</h1>
              <p className="mt-2 text-sm text-slate-600">
                Informe seu CPF para localizar seu pedido, escolha a compra correta e descreva o problema.
              </p>
            </div>

            {ticketId ? (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-800">Chamado enviado</p>
                    <p className="text-sm text-green-700">Protocolo: {ticketId}</p>
                  </div>
                </div>
                <p className="text-sm text-green-700">
                  Nosso time vai analisar e retornar pelo canal cadastrado no pedido.
                </p>
                <Button variant="outline" onClick={restart}>Abrir novo chamado</Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3">
                  <p className="text-sm font-semibold text-slate-800">1. Identificacao</p>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
                    <input
                      value={cpf}
                      onChange={(e) => setCpf(formatCpf(e.target.value))}
                      placeholder="CPF do titular do pedido"
                      inputMode="numeric"
                      autoComplete="off"
                      className="h-14 sm:h-11 w-full flex-1 rounded-xl border border-slate-300 px-4 text-base sm:text-sm outline-none focus:border-amber-500"
                    />
                    <Button onClick={handleLookup} disabled={lookupLoading} className="h-14 sm:h-11 w-full sm:w-auto gap-2 text-base sm:text-sm">
                      {lookupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      Buscar pedidos
                    </Button>
                  </div>
                </div>

                {orders.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3">
                    <p className="text-sm font-semibold text-slate-800">2. Escolha a compra com problema</p>
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {orders.map((order) => {
                        const orderRef = order.orderNumber != null ? String(order.orderNumber) : order.id.slice(0, 8);
                        return (
                          <button
                            key={order.id}
                            type="button"
                            onClick={() => setSelectedOrderId(order.id)}
                            className={`w-full text-left rounded-xl border px-3 py-3 transition ${
                              selectedOrderId === order.id
                                ? "border-amber-500 bg-amber-50"
                                : "border-slate-200 bg-white hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">Pedido #{orderRef}</p>
                                <p className="text-xs text-slate-500">{formatDateBR(order.createdAt)} - {order.clientName}</p>
                              </div>
                              <span className="text-xs font-semibold rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                                {formatCurrency(order.total)}
                              </span>
                            </div>
                            <div className="mt-2 text-xs text-slate-600 flex flex-wrap gap-2">
                              {order.products.slice(0, 3).map((product, idx) => (
                                <span key={`${order.id}-${idx}`} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5">
                                  <ShoppingBag className="w-3 h-3" /> {product.quantity}x {product.name}
                                </span>
                              ))}
                              {order.products.length > 3 && <span>+{order.products.length - 3} itens</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedOrder && (
                  <div className="rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3">
                    <p className="text-sm font-semibold text-slate-800">3. Qual o problema?</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setProblemType("missing_items")}
                        className={`rounded-xl border px-4 py-4 text-left transition ${
                          problemType === "missing_items"
                            ? "border-amber-500 bg-amber-50"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <p className="text-sm font-semibold text-slate-900">Pedido veio faltando</p>
                        <p className="text-xs text-slate-500 mt-1">Selecionar quais produtos nao chegaram</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setProblemType("extravio")}
                        className={`rounded-xl border px-4 py-4 text-left transition ${
                          problemType === "extravio"
                            ? "border-amber-500 bg-amber-50"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <p className="text-sm font-semibold text-slate-900">Não chegou / extravio</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {selectedOrder?.includeInsurance
                            ? "Com seguro: reenvio 1 vez ou estorno do produto"
                            : "Sem seguro: sem reenvio por extravio"}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setProblemType("other")}
                        className={`rounded-xl border px-4 py-4 text-left transition ${
                          problemType === "other"
                            ? "border-amber-500 bg-amber-50"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <p className="text-sm font-semibold text-slate-900">Outro problema</p>
                        <p className="text-xs text-slate-500 mt-1">Atraso, avaria, endereco e demais casos</p>
                      </button>
                    </div>

                    {problemType === "missing_items" && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 space-y-2">
                        <p className="text-sm font-semibold text-slate-800">Selecione o que faltou</p>
                        <p className="text-xs text-slate-600">Marque os produtos e, se quiser, ajuste a quantidade faltante.</p>
                        {missingSelections.length === 0 ? (
                          <p className="text-sm text-slate-500">Este pedido nao tem itens para selecionar.</p>
                        ) : (
                          <div className="space-y-2">
                            {missingSelections.map((item) => (
                              <div
                                key={item.id}
                                className={`flex items-center gap-3 rounded-xl border px-3 py-3 ${
                                  item.selected ? "border-amber-500 bg-white" : "border-slate-200 bg-white"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={item.selected}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setMissingSelections((prev) =>
                                      prev.map((row) => row.id === item.id ? { ...row, selected: checked } : row),
                                    );
                                  }}
                                  className="rounded h-5 w-5"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-900 truncate">{item.name}</p>
                                  <p className="text-xs text-slate-500">No pedido: {item.maxQuantity}x</p>
                                </div>
                                {item.selected && (
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      className="w-8 h-8 rounded-lg border border-slate-300 text-base"
                                      onClick={() => {
                                        setMissingSelections((prev) =>
                                          prev.map((row) =>
                                            row.id === item.id
                                              ? { ...row, quantity: Math.max(1, row.quantity - 1) }
                                              : row,
                                          ),
                                        );
                                      }}
                                    >−</button>
                                    <span className="w-7 text-center text-sm font-semibold">{item.quantity}</span>
                                    <button
                                      type="button"
                                      className="w-8 h-8 rounded-lg border border-slate-300 text-base"
                                      onClick={() => {
                                        setMissingSelections((prev) =>
                                          prev.map((row) =>
                                            row.id === item.id
                                              ? { ...row, quantity: Math.min(row.maxQuantity, row.quantity + 1) }
                                              : row,
                                          ),
                                        );
                                      }}
                                    >+</button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {showDetailsStep && problemType && (problemType === "other" || problemType === "extravio" || selectedMissingProducts.length > 0) && (
                  <div className="rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3">
                    <p className="text-sm font-semibold text-slate-800">
                      {problemType === "missing_items" ? "4. Detalhes (opcional)" : problemType === "extravio" ? "4. Rastreio e detalhes" : "4. Descreva o problema"}
                    </p>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={
                        problemType === "missing_items"
                          ? "Algo mais que queira informar? (opcional)"
                          : "Explique o que aconteceu com sua entrega."
                      }
                      rows={5}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base sm:text-sm outline-none focus:border-amber-500"
                    />
                    <p className="text-sm font-semibold text-slate-800 mt-4">5. Numero de rastreio</p>
                    <input
                      value={trackingCode}
                      onChange={(e) => setTrackingCode(e.target.value)}
                      placeholder="Numero de rastreio do pedido"
                      className="h-12 sm:h-11 w-full rounded-xl border border-slate-300 px-3 text-base sm:text-sm outline-none focus:border-amber-500"
                    />
                    <p className="text-xs text-slate-500">Informe o codigo de rastreio para agilizar o atendimento.</p>

                    <label className="block">
                      <span className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                        <ImagePlus className="w-3.5 h-3.5" /> Anexar imagem (opcional)
                      </span>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="block w-full text-sm" />
                    </label>

                    {imageData && (
                      <div className="rounded-xl border border-slate-200 p-2">
                        <img src={imageData} alt="Comprovacao do problema" className="max-h-64 rounded-lg object-contain mx-auto" />
                      </div>
                    )}

                    <div className="rounded-xl border border-slate-200 p-3 space-y-3">
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={wantsAddressChange}
                          onChange={(e) => setWantsAddressChange(e.target.checked)}
                          className="rounded"
                        />
                        Quero alterar o endereco de entrega deste pedido
                      </label>

                      {wantsAddressChange && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            value={newAddress.cep}
                            onChange={handleAddressCepChange}
                            placeholder="CEP"
                            className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-amber-500"
                          />
                          <input
                            value={newAddress.state}
                            onChange={(e) => setNewAddress((prev) => ({ ...prev, state: String(e.target.value || "").toUpperCase().slice(0, 2) }))}
                            placeholder="UF"
                            className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-amber-500"
                          />
                          <input
                            value={newAddress.street}
                            onChange={(e) => setNewAddress((prev) => ({ ...prev, street: e.target.value }))}
                            placeholder="Rua"
                            className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-amber-500 sm:col-span-2"
                          />
                          <input
                            value={newAddress.number}
                            onChange={(e) => setNewAddress((prev) => ({ ...prev, number: e.target.value }))}
                            placeholder="Numero"
                            className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-amber-500"
                          />
                          <input
                            value={newAddress.complement || ""}
                            onChange={(e) => setNewAddress((prev) => ({ ...prev, complement: e.target.value }))}
                            placeholder="Complemento (opcional)"
                            className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-amber-500"
                          />
                          <input
                            value={newAddress.neighborhood}
                            onChange={(e) => setNewAddress((prev) => ({ ...prev, neighborhood: e.target.value }))}
                            placeholder="Bairro"
                            className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-amber-500"
                          />
                          <input
                            value={newAddress.city}
                            onChange={(e) => setNewAddress((prev) => ({ ...prev, city: e.target.value }))}
                            placeholder="Cidade"
                            className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-amber-500"
                          />
                        </div>
                      )}
                      {wantsAddressChange && cepLoading && (
                        <p className="text-xs text-slate-500 inline-flex items-center gap-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Buscando endereco pelo CEP...
                        </p>
                      )}
                    </div>

                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 mt-0.5" />
                      Cada chamado fica vinculado ao pedido selecionado, evitando confusao para clientes com varias compras.
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedOrderId("");
                          setProblemType("");
                        }}
                      >
                        Trocar pedido
                      </Button>
                      <Button onClick={submitTicket} disabled={submitting} className="gap-2">
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4" />}
                        Enviar chamado
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
