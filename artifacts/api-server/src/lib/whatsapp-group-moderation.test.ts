import assert from "node:assert/strict";
import test from "node:test";

import {
  decideGroupModeration,
  detectGroupLinkViolation,
  groupAdminPhones,
  groupIsWatched,
  groupModerationScanText,
  groupNameMatches,
  groupShield,
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

test("só o convite chat.whatsapp.com gera ação", () => {
  assert.equal(detectGroupLinkViolation("entra em https://chat.whatsapp.com/AbC123"), "invite");
  assert.equal(detectGroupLinkViolation("http://chat.whatsapp.com/AbC123"), "invite");
  assert.equal(detectGroupLinkViolation("chat.whatsapp.com/AbC123"), "invite");
  assert.equal(detectGroupLinkViolation("https://www.chat.whatsapp.com/AbC123"), "invite");
  assert.equal(detectGroupLinkViolation("chama wa.me/5511999999999"), null);
  assert.equal(detectGroupLinkViolation("https://whatsapp.com/channel/0029"), null);
  assert.equal(detectGroupLinkViolation("grupo t.me/spam"), null);
  assert.equal(detectGroupLinkViolation("https://bit.ly/abc"), null);
  assert.equal(detectGroupLinkViolation("veja https://www.yury-imports.com/produto/1"), null);
  assert.equal(detectGroupLinkViolation("bom dia"), null);
  const invite = decideGroupModeration({ ...open, text: "https://chat.whatsapp.com/AbC123" });
  assert.equal(invite.act, true);
  if (invite.act) assert.equal(invite.reason, "invite");
});

test("figurinha, mídia e texto normal não geram ação", () => {
  const sticker = groupModerationScanText({
    isGroup: true,
    type: "ReceivedCallback",
    sticker: { stickerUrl: "https://mmg.whatsapp.net/sticker.webp", mimeType: "image/webp" },
  });
  assert.equal(sticker, "");
  assert.equal(decideGroupModeration({ ...open, text: sticker }).act, false);
  const repeated = Array.from({ length: 12 }, (_, index) => ({ text: "", at: open.now - index * 1000 }));
  assert.equal(decideGroupModeration({ ...open, text: sticker, recent: repeated }).act, false);
  const photo = groupModerationScanText({
    image: { imageUrl: "https://mmg.whatsapp.net/photo.jpg", caption: "" },
    video: { videoUrl: "https://mmg.whatsapp.net/video.mp4", caption: "olha isso" },
  });
  assert.equal(decideGroupModeration({ ...open, text: photo }).act, false);
  assert.equal(decideGroupModeration({ ...open, text: "bom dia, chegou sim" }).act, false);
  assert.equal(decideGroupModeration({ ...open, text: "https://bit.ly/abc" }).act, false);
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
  assert.equal(detectGroupLinkViolation(groupModerationScanText(photo)), null);
  const caption = {
    ...photo,
    image: { imageUrl: "https://mmg.whatsapp.net/photo.jpg", caption: "https://chat.whatsapp.com/Convite" },
  };
  assert.equal(detectGroupLinkViolation(groupModerationScanText(caption)), "invite");
  const button = {
    ...photo,
    hydratedTemplate: {
      message: "vem",
      hydratedButtons: [{ urlButton: { displayText: "canal", url: "https://t.me/oferta" } }],
    },
  };
  assert.equal(detectGroupLinkViolation(groupModerationScanText(button)), null);
  assert.equal(decideGroupModeration({ ...open, text: groupModerationScanText(button) }).act, false);
  const storeButton = {
    ...photo,
    buttonsMessage: {
      message: "catalogo",
      buttons: [{ buttonText: { displayText: "https://yury-imports.com/produto/2" } }],
    },
  };
  assert.equal(detectGroupLinkViolation(groupModerationScanText(storeButton)), null);
});

test("rajada e repetição não geram ação", () => {
  const now = 10 * 60 * 1000;
  const burst = Array.from({ length: 20 }, (_, index) => ({
    text: index % 2 === 0 ? "" : "oi",
    at: now - index * 500,
  }));
  assert.equal(decideGroupModeration({ ...open, text: "", recent: burst, now }).act, false);
  assert.equal(decideGroupModeration({ ...open, text: "PROMOÇÃO imperdível", recent: burst, now }).act, false);
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

test("só os grupos Yuri imports 1 a 7, pelo nome exato ou pelo ID sem nome", () => {
  for (let number = 1; number <= 7; number += 1) {
    assert.equal(groupNameMatches(`Yuri imports ${number}`), true);
    assert.equal(groupIsWatched("qualquer-id", `Yuri imports ${number}`, []), true);
  }
  assert.equal(groupNameMatches("  YURI IMPORTS 3 "), true);
  assert.equal(groupNameMatches("Yuri imports"), false);
  assert.equal(groupNameMatches("Yuri imports 8"), false);
  assert.equal(groupNameMatches("Yuri imports extra"), false);
  assert.equal(groupIsWatched("120363370084115387-group", "", ["120363370084115387-group"]), true);
  assert.equal(groupIsWatched("120363370084115387-group", "", []), false);
});

test("Cell Tech e qualquer outro grupo são ignorados", () => {
  const cellId = "120363000000000000-group";
  assert.equal(groupNameMatches("Cell Tech - Grupo"), false);
  assert.equal(groupNameMatches("Cell Tech"), false);
  assert.equal(groupIsWatched(cellId, "Cell Tech - Grupo", [cellId]), false);
  assert.equal(groupIsWatched(cellId, "Cell Tech", []), false);
  assert.equal(groupIsWatched("familia-group", "Família", ["familia-group"]), false);
  assert.equal(groupIsWatched("outro-group", "Outro grupo", []), false);
  assert.equal(groupIsWatched("120363370084115387-group", "Yuri imports 8", ["120363370084115387-group"]), false);
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
