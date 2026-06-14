import { generatePath } from '../utils/locationSimulator.js';

export const buildRoutePath = (start, end, steps = 15) => {
  return generatePath(start, end, steps);
};
