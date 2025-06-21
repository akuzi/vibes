export interface ColorScheme {
  name: string;
  new: string;
  survived: string;
  died: string;
  dead: string;
}

export const COLOR_SCHEMES: ColorScheme[] = [
  {
    name: 'Ripple',
    new: 'ripple',
    survived: 'ripple',
    died: 'ripple',
    dead: 'white',
  },
  {
    name: 'Three Colors',
    new: 'green',
    survived: 'orange',
    died: 'red',
    dead: 'white',
  },
  {
    name: 'Grayscale',
    new: '#ccc',
    survived: '#666',
    died: '#333',
    dead: 'white',
  },
  {
    name: 'Fire',
    new: 'yellow',
    survived: 'orange',
    died: 'red',
    dead: '#222',
  },
  {
    name: 'Ice',
    new: '#a7d7f9',
    survived: '#49a5e6',
    died: '#0d5a8e',
    dead: 'white',
  },
  {
    name: 'Rainbow',
    new: 'rainbow',
    survived: 'rainbow',
    died: 'rainbow',
    dead: 'white',
  },
];
