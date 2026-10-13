'use strict';
/* ---------- 8zy. MISSIONS TEST (mode test, js/01j): every new mission on its own, to try before it goes into STORY ----------
   The owner's answers (docs/STORY.md, MISSIONS TEST mode): picked from a list (no markers on the map), the city as STORY will have it,
   you start with everything, never saved; helpers to restart, jump to a step or replay a cutscene, and the mission's info on screen.
   The mission engine and Quest 01 come next; for now the mode starts with the kit. */
function testKit() {                       // js/15 startGame: lots of cash, every weapon full, full health and armour
  P.score = Math.max(P.score, 1000000);
  WEAPONS.forEach((w, i) => { P.has[i] = true; if (!isMelee(w)) { P.mag[i] = Math.max(P.mag[i] || 0, w.mag || 0); P.ammo[i] = Math.max(P.ammo[i] || 0, w.maxAmmo || 0); } });
  P.hp = hpMax(); P.armor = armorMax();
}
