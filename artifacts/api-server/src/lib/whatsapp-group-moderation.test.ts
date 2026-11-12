import assert from "node:assert/strict";
import test from "node:test";

import {
  GROUP_MODERATION_FLOOD_COUNT,
  GROUP_MODERATION_REPEAT_COUNT,
  decideGroupModeration,
  detectGroupLinkViolation,
  groupAdminPhones,
  groupIsWatched,
  groupModerationScanText,
  groupNameMatches,
  groupShield,
  groupSpamReason,
  isGroupModerationCandidate,
  moderationActionLabel,
  moderationSnippet,
  moderationSwitchOn,
  phonesMatch,
  readGroupModerationInbound,
} from "./whatsapp-group-moderation";

const hosts = ["yury-imports.com"];
const open = {
  allowHosts: hosts,
  recent: [] as { text: string; at: number }[],
  now: 1_000_000,
  participantPhone: "5511988887777",
  storePhone: "5535999768759",
  connectedPhone: "5535999768759",
  allowPhones: [] as string[],
  adminPhones: [] as string[],
};

test("convite e link de fora saem; o site da loja fica", () => {
  assert.equal(detectGroupLinkViolation("entra em https://chat.whatsapp.com/AbC123", hosts), "invite");
  assert.equal(detectGroupLinkViolation("chama wa.me/5511999999999", hosts), "invite");
  assert.equal(detectGroupLinkViolation("https://whatsapp.com/channel/0029", hosts), "invite");
  assert.equal(detectGroupLinkViolation("grupo t.me/spam", hosts), "invite");
  assert.equal(detectGroupLinkViolation("https://bit.ly/abc", hosts), "external_link");
  assert.equal(detectGroupLinkViolation("https://yury-imports.com.evil.net/a", hosts), "external_link");
  assert.equal(detectGroupLinkViolation("veja https://www.yury-imports.com/produto/1", hosts), null);
  assert.equal(detectGroupLinkViolation("meu email joao@gmail.com", hosts), null);
  assert.equal(detectGroupLinkViolation("bom dia", hosts), null);
});

test("legenda e botão entram; a URL da foto não", () => {
  const photo = {
    isGroup: true,
    type: "ReceivedCallback",
    phone: "120363370084115387-group",
    chatName: "Yuri imports 5",
    messageId: "abc",
    participantPhone: "5511988887777",
    image: { imageUrl: "https://mmg.whatsapp.net/photo.jpg", caption: "" },
  };
  assert.equal(detectGroupLinkViolation(groupModerationScanText(photo), hosts), null);
  const caption = {
    ...photo,
    image: { imageUrl: "https://mmg.whatsapp.net/photo.jpg", caption: "https://chat.whatsapp.com/Convite" },
  };
  assert.equal(detectGroupLinkViolation(groupModerationScanText(caption), hosts), "invite");
  const button = {
    ...photo,
    hydratedTemplate: {
      message: "vem",
      hydratedButtons: [{ urlButton: { displayText: "canal", url: "https://t.me/oferta" } }],
    },
  };
  assert.equal(detectGroupLinkViolation(groupModerationScanText(button), hosts), "invite");
  const storeButton = {
    ...photo,
    buttonsMessage: {
      message: "catalogo",
      buttons: [{ buttonText: { displayText: "https://yury-imports.com/produto/2" } }],
    },
  };
  assert.equal(detectGroupLinkViolation(groupModerationScanText(storeButton), hosts), null);
});

test("repetição e flood", () => {
  const now = 10 * 60 * 1000;
  const repeated = Array.from({ length: GROUP_MODERATION_REPEAT_COUNT - 1 }, (_, index) => ({
    text: "PROMOÇÃO imperdível",
    at: now - (index + 1) * 1000,
  }));
  assert.equal(groupSpamReason(repeated, "promocao imperdivel", now), "repeat");
  assert.equal(groupSpamReason(repeated.slice(0, 2), "promocao imperdivel", now), null);
  const burst = Array.from({ length: GROUP_MODERATION_FLOOD_COUNT - 1 }, (_, index) => ({
    text: `oi ${index}`,
    at: now - index * 1000,
  }));
  assert.equal(groupSpamReason(burst, "mais uma", now), "flood");
  const old = burst.map((item) => ({ ...item, at: now - 2 * 60 * 1000 }));
  assert.equal(groupSpamReason(old, "mais uma", now), null);
});

test("admin, loja e allowlist não são punidos", () => {
  const link = { ...open, text: "https://chat.whatsapp.com/AbC" };
  assert.deepEqual(decideGroupModeration({ ...link, adminPhones: ["5511988887777"] }), { act: false, shield: "admin" });
  assert.deepEqual(decideGroupModeration({ ...link, participantPhone: "+55 35 99976-8759" }), { act: false, shield: "store" });
  assert.equal(phonesMatch("35999768759", "5535999768759"), true);
  assert.deepEqual(decideGroupModeration({ ...link, allowPhones: ["5511988887777"] }), { act: false, shield: "allowlist" });
  assert.equal(groupShield({ ...open, allowPhones: [] }), null);
  const acted = decideGroupModeration(link);
  assert.equal(acted.act, true);
  if (acted.act) assert.equal(acted.reason, "invite");
  assert.equal(moderationSwitchOn(undefined, undefined), false);
  assert.equal(moderationSwitchOn("", "0"), false);
  assert.equal(moderationSwitchOn("1", "0"), true);
  assert.equal(moderationSwitchOn("0", "1"), false);
  assert.equal(moderationSwitchOn("", "1"), true);
});

test("só os grupos Yuri imports, pelo id ou pelo nome", () => {
  assert.equal(groupNameMatches("Yuri imports 7"), true);
  assert.equal(groupNameMatches("  YURI IMPORTS "), true);
  assert.equal(groupNameMatches("Outro grupo"), false);
  assert.equal(groupIsWatched("120363370084115387-group", "Qualquer", []), false);
  assert.equal(groupIsWatched("120363370084115387-group", "Yuri imports 5", []), true);
  assert.equal(groupIsWatched("120363370084115387-group", "Outro", ["120363370084115387-group"]), true);
  assert.equal(groupIsWatched("outro-group", "Yuri imports 1", ["120363370084115387-group"]), false);
});

test("webhook de grupo e metadata dos admins", () => {
  const inbound = readGroupModerationInbound({
    isGroup: true,
    type: "ReceivedCallback",
    phone: "120363427421663973-group",
    chatName: "Yuri imports 6",
    messageId: "MSG1",
    participantPhone: "5511911112222",
    connectedPhone: "5535999768759",
    fromMe: false,
    text: { message: "oi" },
  });
  assert.equal(inbound?.groupId, "120363427421663973-group");
  assert.equal(isGroupModerationCandidate({ isGroup: true, type: "MessageStatusCallback", phone: "120363-group" }), false);
  assert.equal(isGroupModerationCandidate({ isGroup: false, type: "ReceivedCallback", phone: "5511999999999", text: { message: "oi" } }), false);
  const admins = groupAdminPhones({
    subject: "Yuri imports 1",
    owner: "5535999768759",
    participants: [
      { phone: "5511000000000", isAdmin: false, isSuperAdmin: false },
      { phone: "551122223333", isAdmin: true, isSuperAdmin: false },
    ],
  });
  assert.deepEqual(admins?.admins, ["5535999768759", "551122223333"]);
  assert.equal(admins?.name, "Yuri imports 1");
  assert.equal(groupAdminPhones({ subject: "sem lista" }), null);
  assert.equal(moderationActionLabel(true, true), "deleted_and_removed");
  assert.equal(moderationActionLabel(true, false), "deleted_remove_failed");
  assert.equal(moderationActionLabel(false, false), "failed");
  assert.equal(moderationSnippet(`  ${"a".repeat(200)}  `).length, 180);
});
