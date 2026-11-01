import assert from "node:assert/strict";
import test from "node:test";
import {
  addCalendarDays,
  eachCalendarDay,
  fetchMetaDailySpend,
  isManualFacebookChannel,
  isMetaAdsExpenseId,
  manualFacebookOverlaps,
  maskMetaAdAccountId,
  metaAccountTimezoneOk,
  metaAdsNote,
  metaAdsRowAction,
  metaAdsSyncWindow,
  metaCurrencyOk,
  metaGraphErrorMessage,
  metaShareTokenMatches,
  normalizeMetaAdAccountId,
  parseMetaInsightRows,
  parseSpendAmount,
  planMetaAdsDays,
  presentedShareToken,
  readMetaAdsSettings,
  readMetaAdsShareSettings,
  redactMetaSecret,
  resolveShareWindow,
  safeMetaNextUrl,
} from "./meta-ads";
import { clearMetaShareCache, readSharedMetaSpend } from "./meta-ads-share";

test("conta act_ vira só os dígitos", () => {
  assert.equal(normalizeMetaAdAccountId(" act_1234567890 "), "1234567890");
  assert.equal(normalizeMetaAdAccountId("1234567890"), "1234567890");
  assert.equal(normalizeMetaAdAccountId("act_abc"), null);
  assert.equal(normalizeMetaAdAccountId(""), null);
});

test("id do gasto da Meta não esbarra em lançamento manual", () => {
  assert.equal(isMetaAdsExpenseId("meta-ads-1234567890-2026-11-01"), true);
  assert.equal(isMetaAdsExpenseId("facebook-manual"), false);
  assert.equal(maskMetaAdAccountId("1234567890"), "act_••••7890");
});

test("janela inclui o dia de hoje e os anteriores", () => {
  assert.deepEqual(metaAdsSyncWindow("2026-11-01", 7), { since: "2026-10-26", until: "2026-11-01" });
  assert.deepEqual(eachCalendarDay("2026-10-30", "2026-11-01"), ["2026-10-30", "2026-10-31", "2026-11-01"]);
  assert.equal(addCalendarDays("2026-10-31", 1), "2026-11-01");
});

test("settings exigem token longo e conta numérica", () => {
  const missing = readMetaAdsSettings({});
  assert.equal(missing.configured, false);
  assert.equal(missing.autoSync, false);

  const ready = readMetaAdsSettings({
    META_ADS_ACCESS_TOKEN: "x".repeat(20),
    META_ADS_ACCOUNT_ID: "act_99887766",
    META_ADS_SELLER_CODE: "Yuri",
    META_ADS_LOOKBACK_DAYS: "3",
    META_ADS_AUTO_SYNC: "0",
  });
  assert.equal(ready.configured, true);
  assert.equal(ready.autoSync, false);
  assert.equal(ready.accountId, "99887766");
  assert.equal(ready.sellerCode, "yuri");
  assert.equal(ready.lookbackDays, 3);
});

test("moeda e fuso fora de Brasília não passam", () => {
  assert.equal(metaCurrencyOk("brl"), true);
  assert.equal(metaCurrencyOk("USD"), false);
  assert.equal(metaCurrencyOk(""), true);
  assert.equal(metaAccountTimezoneOk("America/Sao_Paulo"), true);
  assert.equal(metaAccountTimezoneOk("America/Los_Angeles"), false);
  assert.equal(metaAccountTimezoneOk(""), true);
});

test("insights viram um valor por dia e dia sem gasto fica de fora", () => {
  const days = parseMetaInsightRows([
    { spend: "10.5", date_start: "2026-11-01", date_stop: "2026-11-01" },
    { spend: "0", date_start: "2026-10-31", date_stop: "2026-10-31" },
    { spend: "3,25", date_start: "2026-10-30", date_stop: "2026-10-30" },
    { spend: "9", date_start: "2026-10-30", date_stop: "2026-10-29" },
  ]);
  assert.deepEqual(days, [
    { day: "2026-11-01", amount: 10.5 },
    { day: "2026-10-31", amount: 0 },
    { day: "2026-10-30", amount: 3.25 },
  ]);
  assert.equal(parseSpendAmount("-1"), null);
});

test("plano cobre a janela inteira e zera o dia que a Meta não devolveu", () => {
  const plan = planMetaAdsDays("99", "2026-10-30", "2026-11-01", [
    { day: "2026-11-01", amount: 12.34 },
  ]);
  assert.deepEqual(plan.map((day) => [day.day, day.amount, day.id]), [
    ["2026-10-30", 0, "meta-ads-99-2026-10-30"],
    ["2026-10-31", 0, "meta-ads-99-2026-10-31"],
    ["2026-11-01", 12.34, "meta-ads-99-2026-11-01"],
  ]);
});

test("linha igual não regrava e gasto zero apaga só se já existir", () => {
  const periodStart = new Date("2026-11-01T03:00:00.000Z");
  const periodEnd = new Date("2026-11-02T02:59:59.000Z");
  const note = metaAdsNote("99", "Yury");
  assert.equal(metaAdsRowAction({
    amount: "12.34",
    channel: "Facebook",
    note,
    sellerCode: null,
    expenseStartDate: periodStart,
    expenseEndDate: periodEnd,
  }, {
    day: "2026-11-01",
    amount: 12.34,
    channel: "Facebook",
    note,
    sellerCode: null,
  }), "unchanged");

  assert.equal(metaAdsRowAction(null, {
    day: "2026-11-01",
    amount: 0,
    channel: "Facebook",
    note,
    sellerCode: null,
  }), "skip");

  assert.equal(metaAdsRowAction({
    amount: "4.00",
    channel: "Facebook",
    note,
    sellerCode: null,
    expenseStartDate: periodStart,
    expenseEndDate: periodEnd,
  }, {
    day: "2026-11-01",
    amount: 0,
    channel: "Facebook",
    note,
    sellerCode: null,
  }), "delete");
});

test("lançamento manual de Facebook no mesmo dia é aviso, não é a linha da Meta", () => {
  assert.equal(isManualFacebookChannel("Facebook"), true);
  assert.equal(isManualFacebookChannel("Facebook Ads"), true);
  assert.equal(isManualFacebookChannel("Google"), false);
  const start = new Date("2026-11-01T03:00:00.000Z");
  const end = new Date("2026-11-02T02:59:59.000Z");
  const overlaps = manualFacebookOverlaps([
    { id: "manual-1", channel: "Facebook", expenseStartDate: start, expenseEndDate: end, expenseDate: start },
    { id: "meta-ads-99-2026-11-01", channel: "Facebook", expenseStartDate: start, expenseEndDate: end, expenseDate: start },
  ], ["2026-11-01", "2026-11-02"]);
  assert.deepEqual(overlaps, ["2026-11-01"]);
});

test("conta compartilhada não é a conta da loja e exige senha longa", () => {
  const same = readMetaAdsShareSettings({
    META_ADS_ACCESS_TOKEN: "f".repeat(20),
    META_ADS_ACCOUNT_ID: "11111",
    META_ADS_SHARE_ACCOUNT_ID: "11111",
    META_ADS_SHARE_TOKEN: "s".repeat(16),
  });
  assert.equal(same.enabled, false);
  assert.equal(same.sameAsStoreAccount, true);

  const ready = readMetaAdsShareSettings({
    META_ADS_ACCESS_TOKEN: "f".repeat(20),
    META_ADS_ACCOUNT_ID: "11111",
    META_ADS_SHARE_ACCOUNT_ID: "act_22222",
    META_ADS_SHARE_TOKEN: "senha-da-outra-loja",
  });
  assert.equal(ready.enabled, true);
  assert.equal(ready.accountId, "22222");
  assert.equal(metaShareTokenMatches(ready.shareToken, "senha-da-outra-loja"), true);
  assert.equal(metaShareTokenMatches(ready.shareToken, "outra"), false);
  assert.equal(presentedShareToken({ authorization: "Bearer senha-da-outra-loja" }), "senha-da-outra-loja");
});

test("janela compartilhada usa os últimos dias ou recusa mais de 31", () => {
  assert.deepEqual(resolveShareWindow("2026-11-01", "", "", 7), { since: "2026-10-26", until: "2026-11-01" });
  assert.deepEqual(resolveShareWindow("2026-11-01", "2026-11-01", "2026-11-01", 7), { since: "2026-11-01", until: "2026-11-01" });
  const tooLong = resolveShareWindow("2026-11-01", "2026-09-01", "2026-11-01", 7);
  assert.equal("error" in tooLong, true);
});

test("leitura da Meta devolve o dia e o zero que ela omitiu", async () => {
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    const body = url.includes("/insights")
      ? { data: [{ spend: "8.5", date_start: "2026-11-01", date_stop: "2026-11-01" }] }
      : { name: "C2", currency: "BRL", timezone_name: "America/Sao_Paulo" };
    return new Response(JSON.stringify(body), { status: 200 });
  };
  const spend = await fetchMetaDailySpend({
    accountId: "22222",
    facebookToken: "f".repeat(20),
    since: "2026-10-31",
    until: "2026-11-01",
    fetchImpl,
  });
  assert.deepEqual(spend.days, [
    { date: "2026-10-31", amount: 0 },
    { date: "2026-11-01", amount: 8.5 },
  ]);
  assert.equal(spend.total, 8.5);
});

test("API compartilhada exige a senha e não devolve o token do Facebook", async () => {
  clearMetaShareCache();
  const env = {
    META_ADS_ACCESS_TOKEN: "facebook-token-secreto",
    META_ADS_ACCOUNT_ID: "11111",
    META_ADS_SHARE_ACCOUNT_ID: "22222",
    META_ADS_SHARE_TOKEN: "senha-da-outra-loja",
  } as NodeJS.ProcessEnv;
  const denied = await readSharedMetaSpend({
    env,
    headers: {},
    now: new Date("2026-11-01T15:00:00.000Z"),
  });
  assert.equal(denied.status, 401);

  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    const body = url.includes("/insights")
      ? { data: [{ spend: "4", date_start: "2026-11-01", date_stop: "2026-11-01" }] }
      : { currency: "BRL", timezone_name: "America/Sao_Paulo" };
    return new Response(JSON.stringify(body), { status: 200 });
  };
  const ok = await readSharedMetaSpend({
    env,
    headers: { "x-api-key": "senha-da-outra-loja" },
    dateFrom: "2026-11-01",
    dateTo: "2026-11-01",
    now: new Date("2026-11-01T15:00:00.000Z"),
    fetchImpl,
  });
  assert.equal(ok.status, 200);
  const encoded = JSON.stringify(ok.body);
  assert.equal(encoded.includes("facebook-token-secreto"), false);
  assert.equal(encoded.includes("22222"), false);
  assert.equal((ok.body as { total: number }).total, 4);
  assert.equal((ok.body as { accountIdMasked: string }).accountIdMasked, "act_••••2222");
});

test("erro e paginação da Meta não levam o token nem saem do graph", () => {
  assert.equal(
    metaGraphErrorMessage({ error: { message: "Invalid token access_token=segredo" } }),
    "Invalid token access_token=***",
  );
  assert.equal(redactMetaSecret("https://graph.facebook.com/x?access_token=abc"), "https://graph.facebook.com/x?access_token=***");
  assert.equal(safeMetaNextUrl("https://graph.facebook.com/v21.0/act_1/insights?after=1"), "https://graph.facebook.com/v21.0/act_1/insights?after=1");
  assert.equal(safeMetaNextUrl("https://example.com/insights"), null);
  assert.equal(safeMetaNextUrl("http://graph.facebook.com/x"), null);
});
