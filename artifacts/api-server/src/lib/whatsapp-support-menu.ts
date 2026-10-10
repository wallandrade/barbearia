export const WHATSAPP_SUPPORT_MENU_SETTING = "whatsapp_support_menu";

const STORE_URL = "https://www.yury-imports.com";
const MAX_ITEMS = 10;
const MAX_TITLE = 24;
const MAX_DESCRIPTION = 72;
const MAX_BUTTON = 20;
const MAX_GREETING = 900;
const MAX_MESSAGE = 900;

export type SupportMenuAction = "lookup" | "text" | "handoff" | "list" | "human";

export type SupportMenuItem = {
  id: string;
  title: string;
  description: string;
  action: SupportMenuAction;
  message: string;
  followup?: string;
  listTitle?: string;
  buttonLabel?: string;
  items?: SupportMenuItem[];
};

export type SupportMenuConfig = {
  greeting: string;
  listTitle: string;
  buttonLabel: string;
  items: SupportMenuItem[];
};

const ACTIONS = new Set<SupportMenuAction>(["lookup", "text", "handoff", "list", "human"]);

function handoffMessage(label: string): string {
  return `Anotei: ${label}.\n\nMe envia o número do pedido ou o CPF, só os números.`;
}

function problemItem(id: string, title: string, description: string, label: string): SupportMenuItem {
  return {
    id,
    title,
    description,
    action: "handoff",
    message: handoffMessage(label),
    followup: "Vou passar para o atendente olhar esse caso.",
  };
}

/** Textos de hoje. Sem registro no admin, o cliente continua vendo este menu. */
export function defaultSupportMenu(): SupportMenuConfig {
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
        message: `Pode comprar em ${STORE_URL}`,
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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readRaw(raw: unknown): Record<string, unknown> | null {
  if (typeof raw === "string") {
    const text = raw.trim();
    if (!text) return null;
    try {
      return asRecord(JSON.parse(text));
    } catch {
      return null;
    }
  }
  return asRecord(raw);
}

function cleanId(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function validId(id: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,31}$/.test(id);
}

function readItem(value: unknown, nested: boolean, ids: Set<string>): { item: SupportMenuItem | null; error: string } {
  const row = asRecord(value);
  if (!row) return { item: null, error: "Tem uma opção inválida no menu." };
  const id = cleanId(row.id);
  const title = String(row.title || "").trim();
  const description = String(row.description || "").trim();
  const action = String(row.action || "").trim() as SupportMenuAction;
  const message = String(row.message || "").trim();
  if (!validId(id)) return { item: null, error: "Cada opção precisa de um identificador curto, só letras e números." };
  if (ids.has(id)) return { item: null, error: "Tem duas opções com o mesmo identificador." };
  if (!title || title.length > MAX_TITLE) {
    return { item: null, error: title ? `O nome "${title.slice(0, 24)}" passa de 24 letras.` : "Toda opção precisa de um nome de até 24 letras." };
  }
  if (description.length > MAX_DESCRIPTION) return { item: null, error: `A descrição de "${title}" passa de 72 letras.` };
  if (!ACTIONS.has(action)) return { item: null, error: `A opção "${title}" está sem uma ação.` };
  if (nested && action === "list") return { item: null, error: `A opção "${title}" não pode abrir outra lista.` };
  if (!message || message.length > MAX_MESSAGE) {
    return { item: null, error: message ? `O texto de "${title}" passa de 900 letras.` : `Escreva o texto de "${title}".` };
  }
  ids.add(id);
  const item: SupportMenuItem = { id, title, description, action, message };
  if (action === "handoff") {
    const followup = String(row.followup || "").trim();
    if (followup.length > MAX_MESSAGE) return { item: null, error: `O texto final de "${title}" passa de 900 letras.` };
    if (followup) item.followup = followup;
  }
  if (action === "list") {
    const listTitle = String(row.listTitle || "").trim();
    const buttonLabel = String(row.buttonLabel || "").trim();
    if (!listTitle || listTitle.length > MAX_TITLE) {
      return { item: null, error: listTitle ? `O título da lista "${title}" passa de 24 letras.` : `Informe o título da lista "${title}".` };
    }
    if (!buttonLabel || buttonLabel.length > MAX_BUTTON) {
      return { item: null, error: buttonLabel ? `O botão da lista "${title}" passa de 20 letras.` : `Informe o botão da lista "${title}".` };
    }
    const children = Array.isArray(row.items) ? row.items : [];
    if (children.length < 1 || children.length > MAX_ITEMS) {
      return { item: null, error: `A lista "${title}" precisa de 1 a 10 opções.` };
    }
    const items: SupportMenuItem[] = [];
    for (const child of children) {
      const parsed = readItem(child, true, ids);
      if (!parsed.item) return parsed;
      items.push(parsed.item);
    }
    item.listTitle = listTitle;
    item.buttonLabel = buttonLabel;
    item.items = items;
  }
  return { item, error: "" };
}

/** Gravação do admin. Texto vazio ou inválido não substitui o menu. */
export function supportMenuSaveError(raw: unknown): { menu: SupportMenuConfig | null; error: string } {
  const row = readRaw(raw);
  if (!row) return { menu: null, error: "Menu inválido." };
  const greeting = String(row.greeting || "").trim();
  const listTitle = String(row.listTitle || "").trim();
  const buttonLabel = String(row.buttonLabel || "").trim();
  if (!greeting || greeting.length > MAX_GREETING) {
    return { menu: null, error: greeting ? "A saudação passa de 900 letras." : "Escreva a saudação." };
  }
  if (!listTitle || listTitle.length > MAX_TITLE) {
    return { menu: null, error: listTitle ? "O título da lista passa de 24 letras." : "Escreva o título da lista." };
  }
  if (!buttonLabel || buttonLabel.length > MAX_BUTTON) {
    return { menu: null, error: buttonLabel ? "O botão passa de 20 letras." : "Escreva o texto do botão." };
  }
  const source = Array.isArray(row.items) ? row.items : [];
  if (source.length < 1 || source.length > MAX_ITEMS) {
    return { menu: null, error: "O menu precisa de 1 a 10 opções." };
  }
  const ids = new Set<string>();
  const items: SupportMenuItem[] = [];
  for (const entry of source) {
    const parsed = readItem(entry, false, ids);
    if (!parsed.item) return { menu: null, error: parsed.error };
    items.push(parsed.item);
  }
  return { menu: { greeting, listTitle, buttonLabel, items }, error: "" };
}

export function parseSupportMenu(raw: string | null | undefined): SupportMenuConfig {
  const text = String(raw || "").trim();
  if (!text) return defaultSupportMenu();
  return supportMenuSaveError(text).menu ?? defaultSupportMenu();
}

export function supportMenuItems(menu: SupportMenuConfig): SupportMenuItem[] {
  const items: SupportMenuItem[] = [];
  const walk = (list: SupportMenuItem[]) => {
    for (const item of list) {
      items.push(item);
      if (item.action === "list" && item.items) walk(item.items);
    }
  };
  walk(menu.items);
  return items;
}

export function supportMenuFollowup(item: SupportMenuItem | null | undefined): string {
  const text = String(item?.followup || "").trim();
  if (!text) return "";
  return `\n\n${text}`;
}
