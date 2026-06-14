export const calculateDistance = (loc1, loc2) => {
  if (!loc1 || !loc2) return 0;
  const R = 6371; // Earth radius in km
  const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
  const dLng = (loc2.lng - loc1.lng) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // distance in km
};

export const calculateETA = (distanceKm, stageNumber) => {
  // speed in km/h: Stage 1 = 60, Stage 2 = 50, Stage 3 = 30
  let speed = 40;
  if (stageNumber === 1) speed = 60;
  else if (stageNumber === 2) speed = 50;
  else if (stageNumber === 3) speed = 30;

  const hours = distanceKm / speed;
  const minutes = Math.round(hours * 60);
  
  // Return Date object
  const etaDate = new Date();
  etaDate.setMinutes(etaDate.getMinutes() + minutes);
  return etaDate;
};
