import {
  buildCreatedMessage,
  buildDailyReport,
  buildDeadlineMissedMessage,
  buildMonthlyReport,
  buildNextDayReminder,
  cellTechCounts,
  cellTechWebhookBody,
  filterCellTechOrders,
  monthKey,
  openAlerts,
  reportWindowOpen,
  saoPauloClock,
  type CellTechAlertKind,
  type CellTechListQuery,
  type CellTechOrder,
} from "./cell-tech-logic";
import { clearGestaoCache, GestaoClickError, loadGestaoOrders, ordersFromRows } from "./cell-tech-client";
import {
  claimCellTechAlert,
  publicCellTechSettings,
  readCellTechSettings,
  readSentCellTechAlerts,
  releaseCellTechAlert,
  saveCellTechSettings,
  type CellTechSettings,
  type CellTechSettingsInput,
} from "./cell-tech-store";

const ALERT_CAP = 20;

async function postCellTech(url: string, kind: string, message: string): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cellTechWebhookBody(kind, message)),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`O n8n respondeu ${response.status}.`);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("O n8n não respondeu a tempo.");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function sendClaimed(settings: CellTechSettings, kind: string, osId: string, periodKey: string, message: string): Promise<boolean> {
  if (!settings.webhookUrl) throw new Error("Salve a URL https do webhook do n8n.");
  const claim = await claimCellTechAlert(kind, osId, periodKey);
  if (!claim) return false;
  try {
    await postCellTech(settings.webhookUrl, kind, message);
    return true;
  } catch (error) {
    await releaseCellTechAlert(claim);
    throw error;
  }
}

function requireTokens(settings: CellTechSettings): void {
  if (!settings.accessToken || !settings.secretAccessToken) {
    throw new GestaoClickError("Salve o access token e o secret do Gestão Click.", 400);
  }
}

async function snapshotOrders(settings: CellTechSettings, fresh: boolean, clock = saoPauloClock()) {
  requireTokens(settings);
  const snapshot = await loadGestaoOrders(settings, fetch, fresh);
  return {
    orders: ordersFromRows(snapshot.rows, settings, clock),
    situations: snapshot.situations,
  };
}

function techniciansFrom(orders: CellTechOrder[]) {
  const seen = new Set<string>();
  const technicians: Array<{ id: string; name: string }> = [];
  for (const order of orders) {
    if (!order.technicianId || seen.has(order.technicianId)) continue;
    seen.add(order.technicianId);
    technicians.push({ id: order.technicianId, name: order.technicianName });
  }
  technicians.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  return technicians;
}

export async function getCellTechSettingsView() {
  return publicCellTechSettings(await readCellTechSettings());
}

export async function updateCellTechSettings(input: CellTechSettingsInput) {
  const saved = await saveCellTechSettings(input);
  clearGestaoCache();
  return publicCellTechSettings(saved);
}

export async function cellTechBoard(query: CellTechListQuery, fresh = false) {
  const settings = await readCellTechSettings();
  const loaded = await snapshotOrders(settings, fresh);
  const orders = filterCellTechOrders(loaded.orders, query);
  return {
    orders,
    counts: cellTechCounts(orders),
    situations: loaded.situations,
    technicians: techniciansFrom(loaded.orders),
    fetchedAt: new Date().toISOString(),
  };
}

export async function testCellTechConnection() {
  const settings = await readCellTechSettings();
  const loaded = await snapshotOrders(settings, true);
  return { orders: loaded.orders.length, situations: loaded.situations.length };
}

export async function sendCellTechTestWebhook() {
  const settings = await readCellTechSettings();
  if (!settings.webhookUrl) throw new Error("Salve a URL https do webhook do n8n.");
  await postCellTech(settings.webhookUrl, "test", "*Cell Tech* conectado. Este aviso é só um teste do grupo da loja.");
}

export async function sendCellTechReport(kind: "daily" | "monthly") {
  const settings = await readCellTechSettings();
  const clock = saoPauloClock();
  const loaded = await snapshotOrders(settings, true, clock);
  const periodKey = kind === "daily" ? clock.dayKey : `${monthKey(clock.dayKey)}:baixa`;
  const message = kind === "daily" ? buildDailyReport(loaded.orders, clock) : buildMonthlyReport(loaded.orders, clock);
  const sent = await sendClaimed(settings, kind, "", periodKey, message);
  return { alreadySent: !sent };
}

function alertMessage(kind: CellTechAlertKind, order: CellTechOrder): string {
  if (kind === "created") return buildCreatedMessage(order);
  if (kind === "deadline") return buildDeadlineMissedMessage(order);
  return buildNextDayReminder(order);
}

export async function runCellTechTick(now = new Date()): Promise<{ noticesSent: number; dailySent: boolean; monthlySent: boolean }> {
  const settings = await readCellTechSettings();
  if (!settings.alertsEnabled || !settings.webhookUrl || !settings.accessToken || !settings.secretAccessToken) {
    return { noticesSent: 0, dailySent: false, monthlySent: false };
  }
  const clock = saoPauloClock(now);
  const loaded = await snapshotOrders(settings, false, clock);
  const sent = await readSentCellTechAlerts();
  let noticesSent = 0;
  for (const order of loaded.orders) {
    if (noticesSent >= ALERT_CAP) break;
    const flags = sent.get(order.id) ?? { created: false, deadline: false };
    for (const kind of openAlerts(order, clock, flags)) {
      if (noticesSent >= ALERT_CAP) break;
      try {
        const posted = await sendClaimed(
          settings,
          kind,
          order.id,
          kind === "reminder" ? clock.dayKey : "once",
          alertMessage(kind, order),
        );
        if (posted) noticesSent += 1;
      } catch (error) {
        console.error("[Cell Tech] aviso:", error instanceof Error ? error.message : error);
        break;
      }
    }
  }
  let dailySent = false;
  let monthlySent = false;
  if (reportWindowOpen(clock)) {
    try {
      dailySent = await sendClaimed(settings, "daily", "", clock.dayKey, buildDailyReport(loaded.orders, clock));
    } catch (error) {
      console.error("[Cell Tech] relatório diário:", error instanceof Error ? error.message : error);
    }
    if (clock.day === 1) {
      try {
        monthlySent = await sendClaimed(settings, "monthly", "", `${monthKey(clock.dayKey)}:baixa`, buildMonthlyReport(loaded.orders, clock));
      } catch (error) {
        console.error("[Cell Tech] relatório mensal:", error instanceof Error ? error.message : error);
      }
    }
  }
  return { noticesSent, dailySent, monthlySent };
}

export { GestaoClickError };
