'use strict';
/* ---------- 1g. ITEMS AND STORES ----------
   items: what else lies hidden around the city besides weapons (js/08d), each in a bubble of its own colour, placed and coming back
   like the guns: onMap of each. amount: what one gives (health and armor points; stars for the heat reducer); max: the most you can
   have; price: what it costs in a store that sells it (empty: never sold). Your score is your cash.
   stores: the six stores (js/08e), each with its own colour and its own things to sell - weapon ids from the weapon table (js/01f;
   ammo for every gun and bomb it sells comes with it, at the weapon's Ammo price) and items. They stand on shopping streets spread
   over the city, always the same buildings; each is marked on the map and has a marker at its door.
   Keep the JSON between the markers valid. */
const SHOP_TABLE = /*SHOP-JSON*/{
"items": [
  {"id": "health", "name": "HEALTH", "short": "HEALTH", "color": "#ffffff", "onMap": 10, "amount": 50, "max": 100, "price": 150, "howTo": "Walk over it when you are hurt: +50 health.", "notes": "A white box with a red cross."},
  {"id": "armor", "name": "BODY ARMOR", "short": "ARMOR", "color": "#2f6bff", "onMap": 6, "amount": 50, "max": 100, "price": 250, "howTo": "+50 armor: the blue bar under your health. It takes the damage before your health does.", "notes": "A dark blue vest with lighter plates."},
  {"id": "bribe", "name": "HEAT REDUCER", "short": "HEAT", "color": "#ff2a55", "onMap": 4, "amount": 1, "max": null, "price": null, "howTo": "Walk over it while wanted: one star less. Its bubble flashes red and blue.", "notes": "A police star with an arrow pointing down."}
],
"stores": [
  {"id": "sports", "name": "BAT CAVE SPORTS", "color": "#ffb02e", "sells": ["bat", "golf", "knife", "health"]},
  {"id": "pawn", "name": "LUCKY PAWN", "color": "#c6ff3d", "sells": ["pistol", "revolver", "machete", "knife", "armor"]},
  {"id": "guns", "name": "BULLSEYE GUNS", "color": "#2bf3ff", "sells": ["pistol", "smg", "shotgun", "health", "armor"]},
  {"id": "surplus", "name": "ARMY SURPLUS", "color": "#5dff4f", "sells": ["lmg", "grenade", "machete", "armor"]},
  {"id": "hunting", "name": "TROPHY HUNT & FISH", "color": "#ffe14a", "sells": ["sniper", "shotgun", "revolver", "health"]},
  {"id": "black", "name": "BACK ROOM DEALS", "color": "#ff2bd6", "sells": ["rocket", "pipebomb", "grenade", "lmg", "armor"]}
]
}/*END-SHOP-JSON*/;
const ITEMS = SHOP_TABLE.items, ITEM = Object.fromEntries(ITEMS.map(i => [i.id, i])), STORES_DEF = SHOP_TABLE.stores;
