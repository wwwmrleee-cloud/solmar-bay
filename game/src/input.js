// Solmar Bay — keyboard and mouse input. Key presses are
// edge-triggered and live for one frame only: a keydown plants a
// press that no keyup can take away, and the game loop eats the
// presses after each frame. The same object is the test hook's view
// of input, so a harness may drive the game by writing these fields
// directly as well as by sending real key events.

export const INPUT = {
  // Held keys, by code ('KeyW', 'ArrowUp', 'Space', ...).
  keys: {},
  // Edge presses seen since the last frame, by code. A proxy: writing
  // a press directly into the input state (the way a harness drives
  // the game, as well as real key events and pressKey calls) acts on
  // it at once through the press handler below, instead of waiting
  // for the next frame — so a state read in the same evaluate as the
  // press already sees the effect.
  pressed: new Proxy({}, {
    set(target, prop, value) {
      const isNew = !!value && !target[prop];
      target[prop] = value;
      if (isNew && pressHandler) pressHandler(prop);
      return true;
    },
    deleteProperty(target, prop) {
      delete target[prop];
      return true;
    },
  }),
  mouse: { x: 0, y: 0 },
  mouseDown: false,
  clicked: false,
  // The keys held on the previous frame, for transition edges.
  _prevKeys: {},
  _prevMouseDown: false,
};

function keyCodeOf(event) {
  return event.code || event.key;
}

// A key held down right now.
export function keyHeld(code) {
  return !!INPUT.keys[code];
}

// A key pressed since the last frame was eaten.
export function keyPressed(code) {
  return !!INPUT.pressed[code];
}

// A hook the game loop sets so a press is acted on at once instead of
// waiting for the next frame. A harness that reads the state in the
// same evaluate as the press then sees the effect immediately.
let pressHandler = null;
export function setPressHandler(fn) {
  pressHandler = fn;
}

// Feed a real keydown into the state. Returns nothing. Planting the
// press in the proxy acts on it at once (see above); a repeat
// keydown plants nothing, so it acts on nothing.
export function onKeyDown(event) {
  const code = keyCodeOf(event);
  if (!code) return;
  if (!INPUT.keys[code]) INPUT.pressed[code] = true;
  INPUT.keys[code] = true;
  if (code === 'Space' || code.startsWith('Arrow')) event.preventDefault();
}

// Feed a real keyup into the state. A keyup never clears a press.
export function onKeyUp(event) {
  const code = keyCodeOf(event);
  if (!code) return;
  INPUT.keys[code] = false;
}

// Losing the window clears every held key. The pressed proxy is
// cleared in place, never replaced, or the proxy would be lost.
export function onBlur() {
  INPUT.keys = {};
  for (const code of Object.keys(INPUT.pressed)) delete INPUT.pressed[code];
  INPUT.mouseDown = false;
  INPUT.clicked = false;
}

export function onMouseMove(x, y) {
  INPUT.mouse.x = x;
  INPUT.mouse.y = y;
}

export function onMouseDown(x, y) {
  INPUT.mouse.x = x;
  INPUT.mouse.y = y;
  if (!INPUT.mouseDown) INPUT.clicked = true;
  INPUT.mouseDown = true;
}

export function onMouseUp(x, y) {
  INPUT.mouse.x = x;
  INPUT.mouse.y = y;
  INPUT.mouseDown = false;
}

// Edges that come from held keys changing state, for callers that
// write INPUT.keys directly instead of sending key events.
export function deriveEdges() {
  for (const code of Object.keys(INPUT.keys)) {
    if (INPUT.keys[code] && !INPUT._prevKeys[code]) INPUT.pressed[code] = true;
  }
  if (INPUT.mouseDown && !INPUT._prevMouseDown) INPUT.clicked = true;
  INPUT._prevKeys = { ...INPUT.keys };
  INPUT._prevMouseDown = INPUT.mouseDown;
}

// Eat every edge press. The loop calls this after each frame. The
// pressed proxy is cleared in place, never replaced, or the proxy
// would be lost.
export function eatPresses() {
  for (const code of Object.keys(INPUT.pressed)) delete INPUT.pressed[code];
  INPUT.clicked = false;
}

// Helpers the test hook can call to press keys without events.
// Planting the press in the proxy acts on it at once (see above).
export function pressKey(code) {
  INPUT.pressed[code] = true;
  INPUT.keys[code] = true;
  setTimeout(() => { INPUT.keys[code] = false; }, 0);
}
export function downKey(code) {
  INPUT.keys[code] = true;
  INPUT.pressed[code] = true;
}
export function upKey(code) {
  INPUT.keys[code] = false;
}
export function clickAt(x, y) {
  INPUT.mouse.x = x;
  INPUT.mouse.y = y;
  INPUT.clicked = true;
  INPUT.mouseDown = true;
  setTimeout(() => { INPUT.mouseDown = false; }, 0);
}

// Attach the real DOM listeners to a canvas. Called once by main.
export function initInput(canvas) {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    onMouseMove(e.clientX - r.left, e.clientY - r.top);
  });
  canvas.addEventListener('mousedown', (e) => {
    const r = canvas.getBoundingClientRect();
    onMouseDown(e.clientX - r.left, e.clientY - r.top);
  });
  window.addEventListener('mouseup', (e) => {
    const r = canvas.getBoundingClientRect();
    onMouseUp(e.clientX - r.left, e.clientY - r.top);
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}
