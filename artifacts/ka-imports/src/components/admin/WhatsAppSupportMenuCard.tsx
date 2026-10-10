import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Loader2, MessageCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type MenuAction = "lookup" | "text" | "handoff" | "list" | "human";

type MenuItem = {
  id: string;
  title: string;
  description: string;
  action: MenuAction;
  message: string;
  followup?: string;
  listTitle?: string;
  buttonLabel?: string;
  items?: MenuItem[];
};

type MenuConfig = {
  greeting: string;
  listTitle: string;
  buttonLabel: string;
  items: MenuItem[];
};

const ACTIONS: Array<{ id: MenuAction; label: string }> = [
  { id: "lookup", label: "Consultar pedido" },
  { id: "text", label: "Enviar um texto" },
  { id: "handoff", label: "Pedir o pedido e chamar atendente" },
  { id: "list", label: "Abrir outra lista" },
  { id: "human", label: "Chamar atendente" },
];

const FIELD = "w-full px-3 rounded-xl border-2 border-border outline-none focus:border-primary text-sm";

function handoffMessage(label: string): string {
  return `Anotei: ${label}.\n\nMe envia o número do pedido ou o CPF, só os números.`;
}

function problemItem(id: string, title: string, description: string, label: string): MenuItem {
  return {
    id,
    title,
    description,
    action: "handoff",
    message: handoffMessage(label),
    followup: "Vou passar para o atendente olhar esse caso.",
  };
}

/** Igual a defaultSupportMenu() no servidor. Sem salvar, o cliente vê este texto. */
function defaultMenu(): MenuConfig {
  return {
    greeting: "Olá! Você entrou em contato com o suporte da Yury Imports.\n\nPara agilizar o seu atendimento, escolha uma das opções abaixo.",
    listTitle: "Atendimento",
    buttonLabel: "Ver opções",
    items: [
      {
        id: "meu-pedido",
        title: "Meu pedido",
        description: "Status, prazo e rastreio",
        action: "lookup",
        message: "Me envia o número do pedido ou o CPF da compra, só os números.\n\nO número do pedido está no WhatsApp ou no e-mail da compra.",
      },
      {
        id: "comprar",
        title: "Quero comprar",
        description: "Abrir o site",
        action: "text",
        message: "Pode comprar em https://www.yury-imports.com",
      },
      {
        id: "problema",
        title: "Problemas com pedido",
        description: "Atraso, falta ou extravio",
        action: "list",
        message: "Certo. Me conta o que aconteceu com o seu pedido.",
        listTitle: "O que houve",
        buttonLabel: "Ver opções",
        items: [
          problemItem("atrasado", "Pedido atrasado", "Não chegou no prazo", "pedido atrasado"),
          problemItem("faltando", "Veio faltando", "Um item não veio", "veio faltando produto"),
          problemItem("sumiu", "Sumiu no correio", "Roubo ou extravio", "sumiu no correio"),
          problemItem("quebrado", "Apreensão ou quebra", "Receita ou produto quebrado", "apreensão ou quebra"),
          problemItem("voltou", "Voltou ao vendedor", "O correio devolveu", "voltou ao vendedor"),
          problemItem("outro", "Outro problema", "Outro caso", "outro problema"),
        ],
      },
      {
        id: "atendente",
        title: "Falar com atendente",
        description: "Uma pessoa responde",
        action: "human",
        message: "Certo. Vou chamar um atendente para continuar por aqui.",
      },
    ],
  };
}

function readMenu(raw: string): MenuConfig {
  const text = raw.trim();
  if (!text) return defaultMenu();
  try {
    const parsed = JSON.parse(text) as MenuConfig;
    if (!parsed || !Array.isArray(parsed.items) || parsed.items.length === 0) return defaultMenu();
    return parsed;
  } catch {
    return defaultMenu();
  }
}

function usedIds(menu: MenuConfig): Set<string> {
  const ids = new Set<string>();
  const walk = (items: MenuItem[]) => {
    for (const item of items) {
      ids.add(item.id);
      if (item.items) walk(item.items);
    }
  };
  walk(menu.items);
  return ids;
}

function createId(used: Set<string>): string {
  let id = "";
  do {
    id = `op${Math.random().toString(36).slice(2, 10)}`;
  } while (used.has(id));
  return id;
}

function blankItem(used: Set<string>, nested: boolean): MenuItem {
  const id = createId(used);
  return {
    id,
    title: "",
    description: "",
    action: nested ? "handoff" : "text",
    message: "",
    followup: nested ? "Vou passar para o atendente olhar esse caso." : "",
    listTitle: "Opções",
    buttonLabel: "Ver opções",
    items: [],
  };
}

function moveItem(items: MenuItem[], index: number, direction: -1 | 1): MenuItem[] {
  const next = index + direction;
  if (next < 0 || next >= items.length) return items;
  const copy = items.slice();
  const [row] = copy.splice(index, 1);
  copy.splice(next, 0, row);
  return copy;
}

function clientError(menu: MenuConfig): string {
  if (!menu.greeting.trim()) return "Escreva a saudação.";
  if (!menu.listTitle.trim()) return "Escreva o título da lista.";
  if (!menu.buttonLabel.trim()) return "Escreva o texto do botão.";
  if (menu.items.length < 1 || menu.items.length > 10) return "O menu precisa de 1 a 10 opções.";
  const check = (item: MenuItem, nested: boolean): string => {
    if (!item.title.trim()) return "Toda opção precisa de um nome.";
    if (!item.message.trim()) return `Escreva o texto de "${item.title}".`;
    if (item.action === "list") {
      if (nested) return `A opção "${item.title}" não pode abrir outra lista.`;
      if (!item.listTitle?.trim()) return `Informe o título da lista "${item.title}".`;
      if (!item.buttonLabel?.trim()) return `Informe o botão da lista "${item.title}".`;
      if (!item.items?.length) return `A lista "${item.title}" precisa de uma opção.`;
      for (const child of item.items) {
        const error = check(child, true);
        if (error) return error;
      }
    }
    return "";
  };
  for (const item of menu.items) {
    const error = check(item, false);
    if (error) return error;
  }
  return "";
}

function actionHint(action: MenuAction): string {
  if (action === "lookup") return "O cliente manda o número ou o CPF. A loja responde situação, produtos e rastreio.";
  if (action === "text") return "Este texto sai uma vez. A próxima mensagem abre o menu de novo.";
  if (action === "handoff") return "O cliente manda o número ou o CPF. A loja mostra o pedido e chama o atendente.";
  if (action === "human") return "Este texto sai uma vez. As próximas mensagens ficam com o atendente por 2 horas.";
  return "Este texto abre a lista abaixo.";
}

function ItemEditor({
  item,
  nested,
  canRemove,
  onChange,
  onRemove,
  onUp,
  onDown,
}: {
  item: MenuItem;
  nested: boolean;
  canRemove: boolean;
  onChange: (item: MenuItem) => void;
  onRemove: () => void;
  onUp: () => void;
  onDown: () => void;
}) {
  const actions = nested ? ACTIONS.filter((action) => action.id !== "list") : ACTIONS;
  const setAction = (action: MenuAction) => {
    const next: MenuItem = { ...item, action };
    if (action === "list" && (!next.items || next.items.length === 0)) {
      const used = new Set<string>([item.id]);
      next.items = [blankItem(used, true)];
      next.listTitle = next.listTitle || "Opções";
      next.buttonLabel = next.buttonLabel || "Ver opções";
    }
    if (!next.message.trim()) {
      if (action === "lookup") next.message = "Me envia o número do pedido ou o CPF da compra, só os números.";
      if (action === "human") next.message = "Certo. Vou chamar um atendente para continuar por aqui.";
      if (action === "handoff") next.message = "Me envia o número do pedido ou o CPF, só os números.";
    }
    if (action === "handoff" && !next.followup?.trim()) next.followup = "Vou passar para o atendente olhar esse caso.";
    onChange(next);
  };

  return (
    <div className={`space-y-3 rounded-2xl border border-border p-3 ${nested ? "bg-muted/30" : "bg-background"}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{nested ? "Opção da lista" : "Opção do menu"}</p>
        <div className="flex gap-1">
          <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={onUp} aria-label="Subir">
            <ChevronUp className="w-4 h-4" />
          </Button>
          <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={onDown} aria-label="Descer">
            <ChevronDown className="w-4 h-4" />
          </Button>
          <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={onRemove} disabled={!canRemove} aria-label="Remover">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <label className="block text-xs font-medium">
        Nome no WhatsApp ({item.title.length}/24)
        <input
          value={item.title}
          maxLength={24}
          onChange={(event) => onChange({ ...item, title: event.target.value })}
          className={`mt-1 h-10 ${FIELD}`}
        />
      </label>
      <label className="block text-xs font-medium">
        Descrição ({item.description.length}/72)
        <input
          value={item.description}
          maxLength={72}
          onChange={(event) => onChange({ ...item, description: event.target.value })}
          className={`mt-1 h-10 ${FIELD}`}
        />
      </label>
      <label className="block text-xs font-medium">
        O que acontece
        <select
          value={item.action}
          onChange={(event) => setAction(event.target.value as MenuAction)}
          className={`mt-1 h-10 ${FIELD}`}
        >
          {actions.map((action) => (
            <option key={action.id} value={action.id}>{action.label}</option>
          ))}
        </select>
      </label>
      <p className="text-xs text-muted-foreground">{actionHint(item.action)}</p>
      <label className="block text-xs font-medium">
        Texto ({item.message.length}/900)
        <textarea
          value={item.message}
          maxLength={900}
          rows={3}
          onChange={(event) => onChange({ ...item, message: event.target.value })}
          className={`mt-1 py-2 ${FIELD}`}
        />
      </label>
      {item.action === "handoff" && (
        <label className="block text-xs font-medium">
          Texto depois que o pedido for encontrado
          <textarea
            value={item.followup || ""}
            maxLength={900}
            rows={2}
            onChange={(event) => onChange({ ...item, followup: event.target.value })}
            className={`mt-1 py-2 ${FIELD}`}
          />
        </label>
      )}
      {item.action === "list" && (
        <div className="space-y-3 border-t border-border pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-xs font-medium">
              Título da lista ({(item.listTitle || "").length}/24)
              <input
                value={item.listTitle || ""}
                maxLength={24}
                onChange={(event) => onChange({ ...item, listTitle: event.target.value })}
                className={`mt-1 h-10 ${FIELD}`}
              />
            </label>
            <label className="block text-xs font-medium">
              Botão ({(item.buttonLabel || "").length}/20)
              <input
                value={item.buttonLabel || ""}
                maxLength={20}
                onChange={(event) => onChange({ ...item, buttonLabel: event.target.value })}
                className={`mt-1 h-10 ${FIELD}`}
              />
            </label>
          </div>
          {(item.items || []).map((child, index) => (
            <ItemEditor
              key={child.id}
              item={child}
              nested
              canRemove={(item.items || []).length > 1}
              onChange={(next) => {
                const items = (item.items || []).slice();
                items[index] = next;
                onChange({ ...item, items });
              }}
              onRemove={() => onChange({ ...item, items: (item.items || []).filter((row) => row.id !== child.id) })}
              onUp={() => onChange({ ...item, items: moveItem(item.items || [], index, -1) })}
              onDown={() => onChange({ ...item, items: moveItem(item.items || [], index, 1) })}
            />
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={(item.items || []).length >= 10}
            onClick={() => {
              const used = usedIds({ greeting: "", listTitle: "", buttonLabel: "", items: item.items || [] });
              onChange({ ...item, items: [...(item.items || []), blankItem(used, true)] });
            }}
          >
            <Plus className="w-4 h-4" />
            <span className="ml-1">Opção nesta lista</span>
          </Button>
        </div>
      )}
    </div>
  );
}

export default function WhatsAppSupportMenuCard({
  saved,
  saving,
  onSave,
}: {
  saved: string;
  saving: boolean;
  onSave: (value: string) => void;
}) {
  const [menu, setMenu] = useState<MenuConfig>(() => readMenu(saved));

  useEffect(() => {
    setMenu(readMenu(saved));
  }, [saved]);

  const save = () => {
    const error = clientError(menu);
    if (error) {
      toast.error(error);
      return;
    }
    onSave(JSON.stringify(menu));
  };

  return (
    <div className="max-w-3xl bg-card border border-border/60 rounded-2xl p-5 shadow-sm space-y-4">
      <div>
        <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          Menu de atendimento
        </h2>
        <p className="text-muted-foreground text-sm">
          Estes textos são os que o cliente vê no WhatsApp. O nome cabe em 24 letras, a descrição em 72, e cada lista tem no máximo 10 opções.
        </p>
      </div>
      <label className="block text-xs font-medium">
        Saudação ({menu.greeting.length}/900)
        <textarea
          value={menu.greeting}
          maxLength={900}
          rows={4}
          onChange={(event) => setMenu({ ...menu, greeting: event.target.value })}
          className={`mt-1 py-2 ${FIELD}`}
        />
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block text-xs font-medium">
          Título da lista ({menu.listTitle.length}/24)
          <input
            value={menu.listTitle}
            maxLength={24}
            onChange={(event) => setMenu({ ...menu, listTitle: event.target.value })}
            className={`mt-1 h-10 ${FIELD}`}
          />
        </label>
        <label className="block text-xs font-medium">
          Botão ({menu.buttonLabel.length}/20)
          <input
            value={menu.buttonLabel}
            maxLength={20}
            onChange={(event) => setMenu({ ...menu, buttonLabel: event.target.value })}
            className={`mt-1 h-10 ${FIELD}`}
          />
        </label>
      </div>
      {menu.items.map((item, index) => (
        <ItemEditor
          key={item.id}
          item={item}
          nested={false}
          canRemove={menu.items.length > 1}
          onChange={(next) => {
            const items = menu.items.slice();
            items[index] = next;
            setMenu({ ...menu, items });
          }}
          onRemove={() => setMenu({ ...menu, items: menu.items.filter((row) => row.id !== item.id) })}
          onUp={() => setMenu({ ...menu, items: moveItem(menu.items, index, -1) })}
          onDown={() => setMenu({ ...menu, items: moveItem(menu.items, index, 1) })}
        />
      ))}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={menu.items.length >= 10}
          onClick={() => setMenu({ ...menu, items: [...menu.items, blankItem(usedIds(menu), false)] })}
        >
          <Plus className="w-4 h-4" />
          <span className="ml-1">Adicionar opção</span>
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setMenu(defaultMenu())}>
          Restaurar texto original
        </Button>
        <Button type="button" size="sm" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar menu"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Consultar pedido continua buscando o pedido de verdade. Restaurar só preenche a tela. Clique em Salvar menu para o cliente passar a ver o texto.
      </p>
    </div>
  );
}
