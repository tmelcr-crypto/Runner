'use strict';
/* ---------- 6zzm. THE STORY'S CHAPTER 4 - THE WAR (M19-M24): the crew's war room and each quest's script ----------
   The war room (modes: warRoom; M19's reward): a room behind a red door on the Palm Heights loft's top floor, in the side-on view
   (js/08t) - a cork board with the photos of Crane's people and red string between them (UP: what the crew knows), the map table
   under a lamp, the crew's chairs round it, a window on the city. Later it moves to the Colony's top floor (the Colony line).
   Choice 2 still counts here: Sachs' files taken to the police mean Holloway buried them - every quest from M19 to M22 starts with a
   star. Choice 3 is made in M22 by where you drive (MS_CHOICE.tip). */
const warRoomAt = h => h.id === 'loft' && feat('warRoom') && MS_UNLOCK.warRoom;   // js/08t svLayout: the red door on the top floor
function warBoard() {                     // UP at the board: who is on it
  const ch = MS_CHOICE;
  return 'CRANE - HOLLOWAY (POLICE CHIEF) - PRATT (COUNCILMAN) - SACHS' + (ch.files === 'kept' ? ' (HIS FILES: OURS)' : ' (HIS FILES: BURIED)') + ' - MATEO?';
}
function warRoomDraw(g, X, Y, s, time) {  // js/08t drawSide, a room's things: x along the room (0-820), y up from the floor
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(X(x), Y(y + h), w * s, h * s); };
  svWindow(g, X(690), Y(132), 100 * s, 66 * s, s, time);
  R(140, 46, 190, 90, '#5a3a22'); R(146, 52, 178, 78, '#b88a58');                       // the cork board in its frame
  const pins = [[235, 114, 'CRANE', '#d8c8a0', '#e8e4dc'], [168, 82, 'HOLLOWAY', '#a8714a', '#2a3a6a'], [212, 70, 'PRATT', '#f2c6a0', '#3a3a44'],
    [268, 84, 'SACHS', '#d9a074', '#2a2a30'], [304, 108, 'MATEO ?', '#d9a074', '#f4f6fa']];
  g.strokeStyle = '#e0283c'; g.lineWidth = 1.6 * s; g.beginPath();
  for (const [a, b] of [[0, 1], [0, 2], [0, 3], [0, 4], [1, 2], [2, 3]]) { g.moveTo(X(pins[a][0]), Y(pins[a][1])); g.lineTo(X(pins[b][0]), Y(pins[b][1])); }
  g.stroke();
  g.textAlign = 'center'; g.font = 'bold ' + Math.round(6 * s) + 'px Arial';
  for (const [x, y, name, skin, shirt] of pins) {                                         // a photo: a face over a collar, the name under it
    R(x - 13, y - 26, 26, 30, '#f4f1ea'); R(x - 11, y - 14, 22, 16, '#6a7a8a');
    g.fillStyle = shirt; g.fillRect(X(x - 8), Y(y - 12), 16 * s, 6 * s); g.fillStyle = skin; g.beginPath(); g.arc(X(x), Y(y - 4), 5 * s, 0, TAU); g.fill();
    if (name === 'MATEO ?') { g.fillStyle = '#e0283c'; g.font = 'bold ' + Math.round(14 * s) + 'px Arial'; g.fillText('?', X(x), Y(y - 9)); g.font = 'bold ' + Math.round(6 * s) + 'px Arial'; }
    g.fillStyle = '#ff3b4a'; g.beginPath(); g.arc(X(x), Y(y + 2), 2 * s, 0, TAU); g.fill();
    g.fillStyle = '#1a1a22'; g.fillText(name, X(x), Y(y - 22));
  }
  const chair = (x, back) => { R(x - 12, 22, 24, 4, '#3a2a1e'); R(x - 11, 0, 3, 22, '#2a1e14'); R(x + 8, 0, 3, 22, '#2a1e14'); R(back > 0 ? x + 9 : x - 12, 22, 3, 30, '#3a2a1e'); };
  chair(440, -1); chair(560, 1);                                                           // two behind the table
  g.strokeStyle = '#8a8070'; g.lineWidth = 1 * s; g.beginPath(); g.moveTo(X(500), Y(150)); g.lineTo(X(500), Y(118)); g.stroke();   // the lamp over the table
  R(484, 112, 32, 8, '#2a2a30'); g.fillStyle = 'rgba(255,230,160,.10)'; g.beginPath(); g.moveTo(X(486), Y(112)); g.lineTo(X(410), Y(40)); g.lineTo(X(590), Y(40)); g.lineTo(X(514), Y(112)); g.fill();
  R(400, 34, 200, 6, '#4a3020'); R(406, 0, 8, 34, '#3a2418'); R(586, 0, 8, 34, '#3a2418');          // the map table
  g.fillStyle = '#2a6ab0'; g.beginPath(); g.moveTo(X(404), Y(40)); g.lineTo(X(420), Y(52)); g.lineTo(X(580), Y(52)); g.lineTo(X(596), Y(40)); g.fill();   // the city map on it, seen from the side
  g.fillStyle = '#3f9a5a'; g.beginPath(); g.moveTo(X(440), Y(40)); g.lineTo(X(452), Y(50)); g.lineTo(X(520), Y(51)); g.lineTo(X(548), Y(40)); g.fill();
  R(470, 40, 4, 8, '#e0283c'); R(530, 40, 4, 6, '#ffd23f');                                // pins on the map
  chair(375, 1); chair(625, -1);                                                           // and one at each end
  R(330, 0, 40, 10, '#2a2a30'); R(334, 10, 32, 6, '#7a8a9a');                               // a crate of radios
  g.fillStyle = '#ff3b4a'; g.font = 'bold ' + Math.round(9 * s) + 'px "Arial Black",Arial'; g.fillText('THE CREW', X(235), Y(140));
}
