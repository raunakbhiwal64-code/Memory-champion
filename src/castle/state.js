// Shared, mutable engine state. Modules import this object rather than
// passing a context around; there is only ever one castle on screen.
export const S = {
  scene: null, camera: null, renderer: null, composer: null, clock: null,
  quality: 'high',
  colliders: [],      // {x, z, r} circles the player can't enter
  animated: [],       // (t, dt) => void, run every frame
  lightSources: [],   // candidate positions for the pooled point lights
  stationViews: [],   // per station: ring, badge, card, orb
  player: { x: 0, z: 0, yaw: 0, speed: 0, walkPhase: 0 },
  cam: { yaw: 0, pitch: 0.3, dist: 5.2, curDist: 5.2 },
  keys: {},
  input: { joyX: 0, joyZ: 0 },
  palaceId: null,
  mode: 'study',
  recall: null,       // {order, pos, marks, revealed}
  panelStation: -1,   // -1 closed, >=0 station panel, -2 summary panel
  nearbyStation: -1,
  currentRoom: null,
  running: false
};

export const WALL_FALLBACK_H = 7;
export const PLAYER_R = 0.42;
export const INTERACT_R = 1.5;
export const FACE_YAW = { s: 0, e: Math.PI / 2, n: Math.PI, w: -Math.PI / 2 };

// The castle layout (CASTLE_ROOMS, CASTLE_STATIONS, castleCellAt, castleRingPos...)
// and app helpers (DB, updateLocus, finishWalk, toast...) are top-level
// declarations of the classic script in index.html. Module code can read
// them as plain identifiers because both share the global scope.
