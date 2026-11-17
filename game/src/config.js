// Solmar Bay — constants, city layout and mission definitions.
// Original game: nothing here comes from any commercial game.
export const WORLD = { width: 3600, height: 2800 };
export const ROAD_W = 96;
export const BLOCK = 450; // road centre spacing
export const STEP = 1 / 60;

export const COLORS = {
  grass: '#7ec850',
  grassDark: '#6db844',
  road: '#3a3f4a',
  roadLine: '#e8d44d',
  sidewalk: '#b9b3a4',
  sand: '#ecd9a0',
  water: '#2f9fd8',
  building: ['#e8b04b', '#d96a4a', '#5b8dd9', '#c95f8f', '#7fb069', '#a06cd5', '#e07a5f', '#4a90a4'],
  palm: '#3f9e4d',
};

// Road centre lines (vertical and horizontal), computed from BLOCK spacing.
export const V_ROADS = [];
for (let x = 225; x < WORLD.width - 200; x += BLOCK) V_ROADS.push(x);
export const H_ROADS = [];
for (let y = 225; y < WORLD.height - 200; y += BLOCK) H_ROADS.push(y);

export const PLAYER = { speed: 185, radius: 14, hp: 100, startX: 675, startY: 1125 };
export const CAR = { accel: 420, brake: 620, maxSpeed: 430, reverseMax: 150, radius: 20 };
export const BULLET_SPEED = 760;
export const SAVE_KEY = 'solmar-bay-save-v1';

// Mission definitions: name, intro dialogue, pay, waypoint helper.
// Waypoints are resolved against named places in world.js (PLACES).
export const MISSIONS = [
  {
    id: 1, name: 'Meet Mara',
    brief: 'Meet Mara Solis at the Sunrise Cafe, downtown.',
    dialogue: [
      'Mara Solis: Danny Vega. Right on time. I like that.',
      'Mara Solis: I run this town\'s deliveries. You drive, you get paid. Simple.',
      'Mara Solis: First job is easy — just don\'t make a scene.',
    ],
    pay: 200,
  },
  {
    id: 2, name: 'The Getaway',
    brief: 'Steal the getaway car and drive it to the Hideout. The police are already looking.',
    dialogue: [
      'Mara Solis: That blue coupe by the cafe is ours now. Take it.',
      'Mara Solis: Cops are on the prowl — lose them before the hideout.',
    ],
    pay: 400,
  },
  {
    id: 3, name: 'Three Packages',
    brief: 'Collect 3 packages across town: the Park, the Port, and the Beach.',
    dialogue: [
      'Mara Solis: Three drops, three corners of town. Grab them all.',
      'Mara Solis: Don\'t let the rival crew spot you carrying them.',
    ],
    pay: 500,
  },
  {
    id: 4, name: 'Defend the Hideout',
    brief: 'Rival crew is hitting the Hideout. Hold them off — take down all 6.',
    dialogue: [
      'Mara Solis: They found the hideout! Get back here and hold the line!',
      'Mara Solis: Six of them. Make every bullet count.',
    ],
    pay: 600,
  },
  {
    id: 5, name: 'Harbour Heist',
    brief: 'Grab the cash at the Port, then escape to the Hideout. Expect the whole force.',
    dialogue: [
      'Mara Solis: One last job, Danny. The harbour cash. Then we\'re set.',
      'Mara Solis: The whole force will be on you. Drive like your life depends on it.',
    ],
    pay: 1000,
  },
];

export const HIDDEN_PACKAGES = 5;
export const HIDDEN_PAY = 50;
