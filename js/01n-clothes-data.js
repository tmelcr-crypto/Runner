'use strict';
/* ---------- 1n. CLOTHES ----------
   The ten clothes shops and what each sells (js/08l), the pieces you start with, and the rule that new clothes lose the police.
   Five pieces you wear: hat, glasses, top, bottoms, shoes. Each item: shop (empty: yours from the start, never sold), slot, style - the
   shape it is drawn with (js/11c), c1 its main colour, c2 a second colour (print, trim, stripes, band, frame, sole), price in euros.
     hat      cap beanie bucket fedora cowboy hardhat beret bandana headband
     glasses  shades aviators round visor
     top      tee tank hawaii shirt check hoodie jacket suit leather hivis jersey camo
     bottoms  jeans trousers shorts track cargo
     shoes    sneakers boots sandals loafers cowboy
   tools/clothes_sheet.py exports it to Apple Numbers or Excel and reads an edited copy back (prices are also in tools/economy_sheet.py):
     python3 tools/clothes_sheet.py export clothes.numbers  /  python3 tools/clothes_sheet.py import clothes.numbers
   Keep the JSON between the markers valid. */
const CLOTHES_TABLE = /*CLOTHES-JSON*/{
"settings": [
  {"id": "loseUpTo", "name": "New clothes lose the police up to", "unit": "stars", "min": 0, "max": 5, "v": 3, "note": "Change at least one piece at a clothes shop while no cop sees you go in, and a wanted level up to this goes."},
  {"id": "dropTo", "name": "Above that the wanted level drops to", "unit": "stars", "min": 0, "max": 5, "v": 3, "note": "A higher wanted level only comes down to this."}
],
"shops": [
  {"id": "surf", "name": "SUNSET SURF", "color": "#2bf3ff", "theme": "Beachwear: Hawaiian shirts, board shorts, flip-flops, bucket hats, shades."},
  {"id": "neon", "name": "NEON THREADS", "color": "#ff3fb4", "theme": "80s style: pastel blazers and trousers, loafers, aviators."},
  {"id": "block", "name": "BLOCK KINGS", "color": "#a259ff", "theme": "Streetwear: hoodies, track pants, caps, beanies, high-tops."},
  {"id": "velvet", "name": "VELVET & GOLD", "color": "#ffd23f", "theme": "Luxury: suits, silk shirts, fedoras, oxford shoes."},
  {"id": "iron", "name": "IRON & INK", "color": "#ff7a3d", "theme": "Biker: leather jackets, ripped jeans, boots, bandanas."},
  {"id": "star", "name": "LONE STAR", "color": "#ffb02e", "theme": "Western: cowboy hats and boots, denim and checked shirts."},
  {"id": "flex", "name": "FLEX ATHLETICS", "color": "#3dffa6", "theme": "Sportswear: jerseys, running shorts, track gear, sweatbands."},
  {"id": "hard", "name": "HARD HAT", "color": "#ffe14a", "theme": "Workwear: hard hats, hi-vis vests, cargo trousers, work boots."},
  {"id": "army", "name": "ARMY & NAVY", "color": "#5dff4f", "theme": "Surplus: camo jackets, berets, cargo pants, combat boots."},
  {"id": "night", "name": "MIDNIGHT", "color": "#ff2bd6", "theme": "Punk and club wear: spiked leather, neon hoodies, platform boots, visors."}
],
"items": [
  {"id": "own_tee", "name": "YELLOW T-SHIRT", "shop": "", "slot": "top", "style": "tee", "c1": "#ffd23f", "c2": "", "price": null, "notes": ""},
  {"id": "own_jeans", "name": "DARK JEANS", "shop": "", "slot": "bottoms", "style": "jeans", "c1": "#2a2d3a", "c2": "", "price": null, "notes": ""},
  {"id": "own_sneakers", "name": "OLD SNEAKERS", "shop": "", "slot": "shoes", "style": "sneakers", "c1": "#e8e8ee", "c2": "#2a2d3a", "price": null, "notes": ""},
  {"id": "surf_hawaii_red", "name": "HAWAIIAN SHIRT", "shop": "surf", "slot": "top", "style": "hawaii", "c1": "#e0364f", "c2": "#ffe14a", "price": 180, "notes": ""},
  {"id": "surf_hawaii_teal", "name": "HAWAIIAN SHIRT", "shop": "surf", "slot": "top", "style": "hawaii", "c1": "#1fa39a", "c2": "#ff6fae", "price": 180, "notes": ""},
  {"id": "surf_tank", "name": "SURF TANK TOP", "shop": "surf", "slot": "top", "style": "tank", "c1": "#ffffff", "c2": "#2bf3ff", "price": 60, "notes": ""},
  {"id": "surf_shorts_or", "name": "BOARD SHORTS", "shop": "surf", "slot": "bottoms", "style": "shorts", "c1": "#ff7a3d", "c2": "#ffe14a", "price": 90, "notes": ""},
  {"id": "surf_shorts_bl", "name": "BOARD SHORTS", "shop": "surf", "slot": "bottoms", "style": "shorts", "c1": "#2f6bff", "c2": "#ffffff", "price": 90, "notes": ""},
  {"id": "surf_flips", "name": "FLIP-FLOPS", "shop": "surf", "slot": "shoes", "style": "sandals", "c1": "#ff3fb4", "c2": "#ffe14a", "price": 30, "notes": ""},
  {"id": "surf_bucket", "name": "BUCKET HAT", "shop": "surf", "slot": "hat", "style": "bucket", "c1": "#f2e6c9", "c2": "#1fa39a", "price": 45, "notes": ""},
  {"id": "surf_shades", "name": "SURF SHADES", "shop": "surf", "slot": "glasses", "style": "shades", "c1": "#15161c", "c2": "#2bf3ff", "price": 60, "notes": ""},
  {"id": "surf_round", "name": "ROUND SUNGLASSES", "shop": "surf", "slot": "glasses", "style": "round", "c1": "#ff9d2b", "c2": "#3a2a1a", "price": 70, "notes": ""},
  {"id": "neon_blazer_pk", "name": "PASTEL BLAZER", "shop": "neon", "slot": "top", "style": "suit", "c1": "#ffb3c7", "c2": "#9be8c8", "price": 650, "notes": ""},
  {"id": "neon_blazer_mt", "name": "PASTEL BLAZER", "shop": "neon", "slot": "top", "style": "suit", "c1": "#9be8c8", "c2": "#ffffff", "price": 650, "notes": ""},
  {"id": "neon_tee", "name": "NEON T-SHIRT", "shop": "neon", "slot": "top", "style": "tee", "c1": "#ff3fb4", "c2": "#2bf3ff", "price": 50, "notes": ""},
  {"id": "neon_trousers_w", "name": "LINEN TROUSERS", "shop": "neon", "slot": "bottoms", "style": "trousers", "c1": "#f4efe6", "c2": "", "price": 320, "notes": ""},
  {"id": "neon_trousers_l", "name": "PASTEL TROUSERS", "shop": "neon", "slot": "bottoms", "style": "trousers", "c1": "#c9b3ff", "c2": "", "price": 320, "notes": ""},
  {"id": "neon_loafers", "name": "WHITE LOAFERS", "shop": "neon", "slot": "shoes", "style": "loafers", "c1": "#f4efe6", "c2": "#9be8c8", "price": 280, "notes": ""},
  {"id": "neon_aviators", "name": "GOLD AVIATORS", "shop": "neon", "slot": "glasses", "style": "aviators", "c1": "#2a2a30", "c2": "#ffd23f", "price": 220, "notes": ""},
  {"id": "neon_shutters", "name": "SHUTTER SHADES", "shop": "neon", "slot": "glasses", "style": "visor", "c1": "#ff3fb4", "c2": "", "price": 40, "notes": ""},
  {"id": "neon_headband", "name": "AEROBICS HEADBAND", "shop": "neon", "slot": "hat", "style": "headband", "c1": "#2bf3ff", "c2": "", "price": 25, "notes": ""},
  {"id": "block_hoodie_p", "name": "HOODIE", "shop": "block", "slot": "top", "style": "hoodie", "c1": "#6a3cff", "c2": "#ffe14a", "price": 160, "notes": ""},
  {"id": "block_hoodie_b", "name": "HOODIE", "shop": "block", "slot": "top", "style": "hoodie", "c1": "#14161d", "c2": "#ff3b5c", "price": 160, "notes": ""},
  {"id": "block_tee", "name": "OVERSIZED TEE", "shop": "block", "slot": "top", "style": "tee", "c1": "#ffffff", "c2": "#a259ff", "price": 70, "notes": ""},
  {"id": "block_track_b", "name": "TRACK PANTS", "shop": "block", "slot": "bottoms", "style": "track", "c1": "#14161d", "c2": "#ffffff", "price": 110, "notes": ""},
  {"id": "block_track_r", "name": "TRACK PANTS", "shop": "block", "slot": "bottoms", "style": "track", "c1": "#e0364f", "c2": "#ffffff", "price": 110, "notes": ""},
  {"id": "block_jeans", "name": "BAGGY JEANS", "shop": "block", "slot": "bottoms", "style": "jeans", "c1": "#3b5b9a", "c2": "", "price": 120, "notes": ""},
  {"id": "block_hightops", "name": "HIGH-TOPS", "shop": "block", "slot": "shoes", "style": "sneakers", "c1": "#ffffff", "c2": "#e0364f", "price": 240, "notes": ""},
  {"id": "block_sneak_b", "name": "BLACK SNEAKERS", "shop": "block", "slot": "shoes", "style": "sneakers", "c1": "#14161d", "c2": "#3dffa6", "price": 200, "notes": ""},
  {"id": "block_cap", "name": "SNAPBACK CAP", "shop": "block", "slot": "hat", "style": "cap", "c1": "#14161d", "c2": "#a259ff", "price": 55, "notes": ""},
  {"id": "block_beanie", "name": "BEANIE", "shop": "block", "slot": "hat", "style": "beanie", "c1": "#ffe14a", "c2": "#14161d", "price": 35, "notes": ""},
  {"id": "velvet_suit_b", "name": "BLACK SUIT JACKET", "shop": "velvet", "slot": "top", "style": "suit", "c1": "#14161d", "c2": "#e0364f", "price": 1500, "notes": ""},
  {"id": "velvet_suit_w", "name": "WHITE SUIT JACKET", "shop": "velvet", "slot": "top", "style": "suit", "c1": "#f4efe6", "c2": "#14161d", "price": 1400, "notes": ""},
  {"id": "velvet_jacket", "name": "VELVET JACKET", "shop": "velvet", "slot": "top", "style": "suit", "c1": "#6b1830", "c2": "#ffd23f", "price": 1200, "notes": ""},
  {"id": "velvet_silk", "name": "SILK SHIRT", "shop": "velvet", "slot": "top", "style": "shirt", "c1": "#ffd23f", "c2": "", "price": 350, "notes": ""},
  {"id": "velvet_trou_b", "name": "SUIT TROUSERS", "shop": "velvet", "slot": "bottoms", "style": "trousers", "c1": "#14161d", "c2": "", "price": 500, "notes": ""},
  {"id": "velvet_trou_w", "name": "WHITE TROUSERS", "shop": "velvet", "slot": "bottoms", "style": "trousers", "c1": "#f4efe6", "c2": "", "price": 480, "notes": ""},
  {"id": "velvet_oxfords", "name": "OXFORD SHOES", "shop": "velvet", "slot": "shoes", "style": "loafers", "c1": "#2a1a10", "c2": "#0a0a0a", "price": 600, "notes": ""},
  {"id": "velvet_fedora", "name": "FEDORA", "shop": "velvet", "slot": "hat", "style": "fedora", "c1": "#14161d", "c2": "#ffd23f", "price": 300, "notes": ""},
  {"id": "velvet_glasses", "name": "GOLD RIMS", "shop": "velvet", "slot": "glasses", "style": "round", "c1": "#2a2a30", "c2": "#ffd23f", "price": 300, "notes": ""},
  {"id": "iron_leather_b", "name": "LEATHER JACKET", "shop": "iron", "slot": "top", "style": "leather", "c1": "#1a1a1e", "c2": "#c0c0c8", "price": 800, "notes": ""},
  {"id": "iron_leather_br", "name": "BROWN LEATHER", "shop": "iron", "slot": "top", "style": "leather", "c1": "#5a3420", "c2": "#d9a074", "price": 750, "notes": ""},
  {"id": "iron_bandtee", "name": "BAND T-SHIRT", "shop": "iron", "slot": "top", "style": "tee", "c1": "#14161d", "c2": "#ff3b5c", "price": 45, "notes": ""},
  {"id": "iron_tank", "name": "BLACK TANK TOP", "shop": "iron", "slot": "top", "style": "tank", "c1": "#14161d", "c2": "", "price": 40, "notes": ""},
  {"id": "iron_ripped", "name": "RIPPED JEANS", "shop": "iron", "slot": "bottoms", "style": "jeans", "c1": "#2b3f6b", "c2": "#c9d4e6", "price": 140, "notes": ""},
  {"id": "iron_boots", "name": "BIKER BOOTS", "shop": "iron", "slot": "shoes", "style": "boots", "c1": "#14161d", "c2": "#c0c0c8", "price": 380, "notes": ""},
  {"id": "iron_bandana", "name": "BANDANA", "shop": "iron", "slot": "hat", "style": "bandana", "c1": "#e0364f", "c2": "#ffffff", "price": 25, "notes": ""},
  {"id": "iron_shades", "name": "BIKER SHADES", "shop": "iron", "slot": "glasses", "style": "shades", "c1": "#15161c", "c2": "#ff7a3d", "price": 90, "notes": ""},
  {"id": "star_hat_br", "name": "COWBOY HAT", "shop": "star", "slot": "hat", "style": "cowboy", "c1": "#8a5a2b", "c2": "#3a2414", "price": 260, "notes": ""},
  {"id": "star_hat_w", "name": "WHITE STETSON", "shop": "star", "slot": "hat", "style": "cowboy", "c1": "#f2e6c9", "c2": "#8a5a2b", "price": 280, "notes": ""},
  {"id": "star_denim", "name": "DENIM SHIRT", "shop": "star", "slot": "top", "style": "shirt", "c1": "#4a6fa8", "c2": "", "price": 140, "notes": ""},
  {"id": "star_check", "name": "CHECKED SHIRT", "shop": "star", "slot": "top", "style": "check", "c1": "#c0392b", "c2": "#14161d", "price": 120, "notes": ""},
  {"id": "star_jacket", "name": "DENIM JACKET", "shop": "star", "slot": "top", "style": "jacket", "c1": "#3b5b9a", "c2": "#f2e6c9", "price": 260, "notes": ""},
  {"id": "star_jeans", "name": "RODEO JEANS", "shop": "star", "slot": "bottoms", "style": "jeans", "c1": "#1f2d4f", "c2": "", "price": 130, "notes": ""},
  {"id": "star_boots", "name": "COWBOY BOOTS", "shop": "star", "slot": "shoes", "style": "cowboy", "c1": "#7a4a22", "c2": "#c0c0c8", "price": 450, "notes": ""},
  {"id": "star_boots_b", "name": "BLACK COWBOY BOOTS", "shop": "star", "slot": "shoes", "style": "cowboy", "c1": "#14161d", "c2": "#ffd23f", "price": 480, "notes": ""},
  {"id": "flex_jersey_or", "name": "BASKETBALL JERSEY", "shop": "flex", "slot": "top", "style": "jersey", "c1": "#ff7a3d", "c2": "#ffffff", "price": 150, "notes": ""},
  {"id": "flex_jersey_bl", "name": "FOOTBALL JERSEY", "shop": "flex", "slot": "top", "style": "jersey", "c1": "#2f6bff", "c2": "#ffe14a", "price": 150, "notes": ""},
  {"id": "flex_track", "name": "TRACK JACKET", "shop": "flex", "slot": "top", "style": "jacket", "c1": "#3dffa6", "c2": "#14161d", "price": 180, "notes": ""},
  {"id": "flex_shorts", "name": "RUNNING SHORTS", "shop": "flex", "slot": "bottoms", "style": "shorts", "c1": "#14161d", "c2": "#3dffa6", "price": 60, "notes": ""},
  {"id": "flex_pants", "name": "TRACK PANTS", "shop": "flex", "slot": "bottoms", "style": "track", "c1": "#2f6bff", "c2": "#ffffff", "price": 100, "notes": ""},
  {"id": "flex_shoes", "name": "RUNNING SHOES", "shop": "flex", "slot": "shoes", "style": "sneakers", "c1": "#3dffa6", "c2": "#ffffff", "price": 220, "notes": ""},
  {"id": "flex_sweatband", "name": "SWEATBAND", "shop": "flex", "slot": "hat", "style": "headband", "c1": "#ffffff", "c2": "#e0364f", "price": 20, "notes": ""},
  {"id": "flex_cap", "name": "SPORTS CAP", "shop": "flex", "slot": "hat", "style": "cap", "c1": "#ffffff", "c2": "#3dffa6", "price": 40, "notes": ""},
  {"id": "flex_visor", "name": "SPORT VISOR", "shop": "flex", "slot": "glasses", "style": "visor", "c1": "#2bf3ff", "c2": "", "price": 120, "notes": ""},
  {"id": "hard_hat_y", "name": "HARD HAT", "shop": "hard", "slot": "hat", "style": "hardhat", "c1": "#ffd23f", "c2": "", "price": 60, "notes": ""},
  {"id": "hard_hat_o", "name": "ORANGE HARD HAT", "shop": "hard", "slot": "hat", "style": "hardhat", "c1": "#ff7a3d", "c2": "", "price": 60, "notes": ""},
  {"id": "hard_vest_o", "name": "HI-VIS VEST", "shop": "hard", "slot": "top", "style": "hivis", "c1": "#ff7a3d", "c2": "#d8dde6", "price": 70, "notes": ""},
  {"id": "hard_vest_y", "name": "HI-VIS VEST", "shop": "hard", "slot": "top", "style": "hivis", "c1": "#e8ff3a", "c2": "#d8dde6", "price": 70, "notes": ""},
  {"id": "hard_shirt", "name": "WORK SHIRT", "shop": "hard", "slot": "top", "style": "shirt", "c1": "#3a5a7a", "c2": "", "price": 80, "notes": ""},
  {"id": "hard_cargo", "name": "CARGO TROUSERS", "shop": "hard", "slot": "bottoms", "style": "cargo", "c1": "#4a4636", "c2": "#2a281e", "price": 110, "notes": ""},
  {"id": "hard_boots", "name": "WORK BOOTS", "shop": "hard", "slot": "shoes", "style": "boots", "c1": "#8a5a2b", "c2": "#ffd23f", "price": 190, "notes": ""},
  {"id": "hard_glasses", "name": "SAFETY GLASSES", "shop": "hard", "slot": "glasses", "style": "round", "c1": "#cfeeff", "c2": "#ffd23f", "price": 40, "notes": ""},
  {"id": "army_camo", "name": "CAMO JACKET", "shop": "army", "slot": "top", "style": "camo", "c1": "#4f5a2f", "c2": "#2a2e1a", "price": 220, "notes": ""},
  {"id": "army_desert", "name": "DESERT CAMO", "shop": "army", "slot": "top", "style": "camo", "c1": "#c2a46e", "c2": "#8a6a3e", "price": 220, "notes": ""},
  {"id": "army_tee", "name": "OLIVE T-SHIRT", "shop": "army", "slot": "top", "style": "tee", "c1": "#4f5a2f", "c2": "", "price": 40, "notes": ""},
  {"id": "army_cargo", "name": "CARGO PANTS", "shop": "army", "slot": "bottoms", "style": "cargo", "c1": "#3e4a2a", "c2": "#2a2e1a", "price": 120, "notes": ""},
  {"id": "army_boots", "name": "COMBAT BOOTS", "shop": "army", "slot": "shoes", "style": "boots", "c1": "#1a1a1a", "c2": "#3e4a2a", "price": 260, "notes": ""},
  {"id": "army_beret", "name": "BERET", "shop": "army", "slot": "hat", "style": "beret", "c1": "#3e4a2a", "c2": "#ffd23f", "price": 70, "notes": ""},
  {"id": "army_beret_r", "name": "RED BERET", "shop": "army", "slot": "hat", "style": "beret", "c1": "#8b1a1a", "c2": "#ffd23f", "price": 70, "notes": ""},
  {"id": "army_aviators", "name": "PILOT AVIATORS", "shop": "army", "slot": "glasses", "style": "aviators", "c1": "#15161c", "c2": "#c0c0c8", "price": 150, "notes": ""},
  {"id": "night_spiked", "name": "SPIKED LEATHER", "shop": "night", "slot": "top", "style": "leather", "c1": "#14161d", "c2": "#ff2bd6", "price": 700, "notes": ""},
  {"id": "night_hoodie", "name": "NEON HOODIE", "shop": "night", "slot": "top", "style": "hoodie", "c1": "#2bf3ff", "c2": "#ff2bd6", "price": 180, "notes": ""},
  {"id": "night_mesh", "name": "CLUB TANK TOP", "shop": "night", "slot": "top", "style": "tank", "c1": "#14161d", "c2": "#ff2bd6", "price": 60, "notes": ""},
  {"id": "night_plaid", "name": "TARTAN TROUSERS", "shop": "night", "slot": "bottoms", "style": "trousers", "c1": "#8b1a1a", "c2": "", "price": 160, "notes": ""},
  {"id": "night_skinny", "name": "BLACK SKINNY JEANS", "shop": "night", "slot": "bottoms", "style": "jeans", "c1": "#14161d", "c2": "", "price": 140, "notes": ""},
  {"id": "night_platform", "name": "PLATFORM BOOTS", "shop": "night", "slot": "shoes", "style": "boots", "c1": "#14161d", "c2": "#ff2bd6", "price": 420, "notes": ""},
  {"id": "night_visor", "name": "NEON VISOR", "shop": "night", "slot": "glasses", "style": "visor", "c1": "#ff2bd6", "c2": "", "price": 80, "notes": ""},
  {"id": "night_beanie", "name": "BLACK BEANIE", "shop": "night", "slot": "hat", "style": "beanie", "c1": "#14161d", "c2": "#ff2bd6", "price": 35, "notes": ""},
  {"id": "night_shades", "name": "CLUB SHADES", "shop": "night", "slot": "glasses", "style": "shades", "c1": "#15161c", "c2": "#3dffa6", "price": 90, "notes": ""}
]
}/*END-CLOTHES-JSON*/;
const CL_SLOTS = ['hat', 'glasses', 'top', 'bottoms', 'shoes'];
const CLOTH = Object.fromEntries(CLOTHES_TABLE.items.map(i => [i.id, i]));
const CL_SHOPS = CLOTHES_TABLE.shops;
const CL = Object.fromEntries(CLOTHES_TABLE.settings.map(r => [r.id, r.v]));
const CL_START = () => { const o = { hat: null, glasses: null, top: null, bottoms: null, shoes: null }; for (const i of CLOTHES_TABLE.items) if (!i.shop && !o[i.slot]) o[i.slot] = i.id; return o; };   // what you wear in a new game
