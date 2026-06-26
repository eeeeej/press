import { Course } from '../types';

export const courses: Course[] = [

  {
      id: 1,
    name: "EVCC Vale",
    holes: [
      { number: 1, par: 4, yards: 334, handicap: 16 },
      { number: 2, par: 4, yards: 448, handicap: 6 },
      { number: 3, par: 4, yards: 345, handicap: 8 },
      { number: 4, par: 4, yards: 357, handicap: 14 },
      { number: 5, par: 3, yards: 148, handicap: 18 },
      { number: 6, par: 5, yards: 552, handicap: 4 },
      { number: 7, par: 3, yards: 190, handicap: 10 },
      { number: 8, par: 4, yards: 434, handicap: 2 },
      { number: 9, par: 4, yards: 337, handicap: 12 }
    ]
  },
  
  {
    id: 2,
    name: "EVCC Creek",
    holes: [
      { number: 1, par: 4, yards: 332, handicap: 11 },
      { number: 2, par: 5, yards: 517, handicap: 7 },
      { number: 3, par: 3, yards: 169, handicap: 17 },
      { number: 4, par: 4, yards: 302, handicap: 15 },
      { number: 5, par: 4, yards: 372, handicap: 3 },
      { number: 6, par: 5, yards: 490, handicap: 9 },
      { number: 7, par: 4, yards: 440, handicap: 1 },
      { number: 8, par: 3, yards: 177, handicap: 13 },
      { number: 9, par: 4, yards: 407, handicap: 5 }
    ]
  },

  {
    id: 3,
    name: "EVCC Ridge (odd)",
    holes: [
      { number: 1, par: 4, yards: 362, handicap: 3 },
      { number: 2, par: 4, yards: 393, handicap: 11 },
      { number: 3, par: 3, yards: 157, handicap: 17 },
      { number: 4, par: 5, yards: 538, handicap: 1 },
      { number: 5, par: 4, yards: 429, handicap: 5 },
      { number: 6, par: 3, yards: 188, handicap: 9 },
      { number: 7, par: 4, yards: 361, handicap: 15 },
      { number: 8, par: 4, yards: 365, handicap: 7 },
      { number: 9, par: 5, yards: 524, handicap: 13 }
    ]
  },

  {
    id: 4,
    name: "EVCC Ridge (even)",
    holes: [
      { number: 1, par: 4, yards: 362, handicap: 4 },
      { number: 2, par: 4, yards: 393, handicap: 12 },
      { number: 3, par: 3, yards: 157, handicap: 18 },
      { number: 4, par: 5, yards: 538, handicap: 2 },
      { number: 5, par: 4, yards: 429, handicap: 6 },
      { number: 6, par: 3, yards: 188, handicap: 10 },
      { number: 7, par: 4, yards: 361, handicap: 16 },
      { number: 8, par: 4, yards: 365, handicap: 8 },
      { number: 9, par: 5, yards: 524, handicap: 14 }
    ]
  }
];