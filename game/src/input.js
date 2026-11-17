// Keyboard + mouse input. Tracks held keys, pressed-this-frame edges, and mouse
// position in screen space plus the world-space aim point (set by main.js).
export function createInput() {
  return {
    keys: new Set(),
    pressed: new Set(),
    mouseX: 0, mouseY: 0,
    mouseDown: false, mousePressed: false,
    aimX: 0, aimY: 0,
  };
}

export function attachInput(input, canvas) {
  const down = (e) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (!e.repeat) input.pressed.add(e.code);
    input.keys.add(e.code);
  };
  const up = (e) => input.keys.delete(e.code);
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', () => { input.keys.clear(); });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouseX = e.clientX - r.left;
    input.mouseY = e.clientY - r.top;
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) { input.mouseDown = true; input.mousePressed = true; }
  });
  window.addEventListener('mouseup', (e) => { if (e.button === 0) input.mouseDown = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

export function endFrame(input) {
  input.pressed.clear();
  input.mousePressed = false;
}

export function isDown(input, ...codes) { return codes.some((c) => input.keys.has(c)); }
export function wasPressed(input, ...codes) { return codes.some((c) => input.pressed.has(c)); }
