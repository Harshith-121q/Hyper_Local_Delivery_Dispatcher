export const generatePath = (start, end, steps = 15) => {
  if (!start || !end) return [];
  const path = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat = start.lat + (end.lat - start.lat) * t;
    const lng = start.lng + (end.lng - start.lng) * t;
    path.push({ lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) });
  }
  return path;
};
