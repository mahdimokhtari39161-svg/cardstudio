// a=accent a2=accent2 d=dark l=light s=soft tint i=ink m=multi-colour list
export const PALETTES = {
  rose:    { a: '#c2476a', a2: '#f2a7bd', d: '#4a1730', l: '#fff5f7', s: '#fde2ea', i: '#3b1626', m: ['#e85d8a', '#f7a8c4', '#ffd166', '#8ecae6', '#c77dff'] },
  gold:    { a: '#c9a24a', a2: '#f4d36f', d: '#14213d', l: '#fbf6ea', s: '#efe3c4', i: '#1d2540', m: ['#c9a24a', '#f4d36f', '#8d6e2f', '#e9d8a6', '#14213d'] },
  emerald: { a: '#1f7a5a', a2: '#c9a24a', d: '#0c3b2e', l: '#f3faf6', s: '#d6efe3', i: '#0c3b2e', m: ['#1f7a5a', '#52b788', '#c9a24a', '#95d5b2', '#d8f3dc'] },
  sky:     { a: '#2f7fd1', a2: '#9ed0ff', d: '#0b2a52', l: '#f2f8ff', s: '#d8e9fb', i: '#0b2a52', m: ['#2f7fd1', '#74b9ff', '#ffd166', '#a2d2ff', '#ffafcc'] },
  violet:  { a: '#7b4bd1', a2: '#d7b8ff', d: '#2a1458', l: '#f7f2ff', s: '#e5d8fb', i: '#2a1458', m: ['#7b4bd1', '#c77dff', '#ffd166', '#5eead4', '#f472b6'] },
  coral:   { a: '#ef6a4c', a2: '#ffc08a', d: '#5a1f14', l: '#fff6ef', s: '#ffe1cf', i: '#4a1b12', m: ['#ef6a4c', '#ffb703', '#fb8500', '#8ecae6', '#06d6a0'] },
  teal:    { a: '#14919b', a2: '#e5c158', d: '#073b4c', l: '#f1fbfb', s: '#cdeeee', i: '#073b4c', m: ['#14919b', '#e5c158', '#0a9396', '#94d2bd', '#ee9b00'] },
  crimson: { a: '#b3203a', a2: '#f08a9c', d: '#3d0a17', l: '#fff4f5', s: '#fbd9de', i: '#3d0a17', m: ['#b3203a', '#e5383b', '#f08a9c', '#ffd166', '#6a040f'] },
  navy:    { a: '#1f4e8c', a2: '#8fb4e3', d: '#0d2240', l: '#f4f7fb', s: '#dde6f2', i: '#0d2240', m: ['#1f4e8c', '#8fb4e3', '#c9a24a', '#5c677d', '#dde6f2'] },
  copper:  { a: '#b86b3a', a2: '#e9c39a', d: '#3b1f10', l: '#fbf3ea', s: '#f0dcc6', i: '#3b1f10', m: ['#b86b3a', '#e9c39a', '#8c5a3c', '#d4a373', '#faedcd'] },
  mono:    { a: '#6b7280', a2: '#d1d5db', d: '#111827', l: '#f5f5f4', s: '#e7e5e4', i: '#111827', m: ['#6b7280', '#9ca3af', '#d1d5db', '#374151', '#f5f5f4'] },
  spring:  { a: '#3da35d', a2: '#ffd166', d: '#16422a', l: '#f6fbf0', s: '#e0f2cf', i: '#16422a', m: ['#3da35d', '#ffd166', '#ef476f', '#118ab2', '#f78c6b'] },
};
export const PALETTE_NAMES = Object.keys(PALETTES);

export const SWATCHES = [
  '#000000', '#ffffff', '#1f2937', '#6b7280', '#c9a24a', '#f4d36f', '#b3203a', '#ef6a4c', '#f4a300', '#3da35d',
  '#14919b', '#2f7fd1', '#1f4e8c', '#7b4bd1', '#c2476a', '#f2a7bd', '#fbf6ea', '#14213d', '#0c3b2e', '#4a1730',
];

export const GRADIENT_PRESETS = {
  gold:   ['#8d6e2f', '#f4d36f', '#fff1b8', '#c9a24a', '#8d6e2f'],
  silver: ['#7d8590', '#e6e9ee', '#ffffff', '#aab2bd', '#7d8590'],
  rosegold: ['#9c5b4b', '#f1b8a3', '#ffe3d8', '#d9937e', '#9c5b4b'],
  sunset: ['#ff5e62', '#ff9966', '#ffd166'],
  ocean:  ['#00c6ff', '#0072ff'],
  aurora: ['#7b4bd1', '#14919b', '#52b788'],
};
