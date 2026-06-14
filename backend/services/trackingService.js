import Tracking from '../models/Tracking.js';
import { buildRoutePath } from './routeService.js';

export const initializeTracking = async (orderId, stageNumber, fromLoc, toLoc) => {
  // Customize path fidelity depending on stage
  let steps = 15;
  if (stageNumber === 1) steps = 20;
  else if (stageNumber === 3) steps = 10;

  const pathCoordinates = buildRoutePath(fromLoc, toLoc, steps);
  
  // Clean up any old stage records for safety
  await Tracking.deleteMany({ orderId, stageNumber });

  const tracking = new Tracking({
    orderId,
    stageNumber,
    pathCoordinates,
    currentCoordinateIndex: 0,
    currentLocation: { lat: fromLoc.lat, lng: fromLoc.lng },
    logs: [
      {
        event: 'Tracking Initialized',
        details: `Stage ${stageNumber} initialized from ${fromLoc.name} to ${toLoc.name}`
      }
    ]
  });

  return await tracking.save();
};

export const addTrackingLog = async (orderId, stageNumber, event, details = '') => {
  const tracking = await Tracking.findOne({ orderId, stageNumber });
  if (tracking) {
    tracking.logs.push({ event, details });
    await tracking.save();
  }
};
