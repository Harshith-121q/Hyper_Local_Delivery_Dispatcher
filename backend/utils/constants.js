// Static coordinates for logistic network simulation
export const LANDMARKS = {
  WAREHOUSES: [
    { name: "Delhi Source Warehouse", type: "source", location: { lat: 28.6139, lng: 77.2090 }, address: "Connaught Place, Delhi" },
    { name: "Mumbai Source Warehouse", type: "source", location: { lat: 19.0760, lng: 72.8777 }, address: "Dharavi Industrial Area, Mumbai" },
    { name: "Bengaluru Source Warehouse", type: "source", location: { lat: 12.9716, lng: 77.5946 }, address: "Peenya Industrial Area, Bengaluru" }
  ],
  STATE_WAREHOUSES: [
    { name: "NCR State Warehouse", type: "state", location: { lat: 28.4595, lng: 77.0266 }, address: "Sector 48, Gurugram" },
    { name: "Maharashtra State Warehouse", type: "state", location: { lat: 18.5204, lng: 73.8567 }, address: "Shivajinagar, Pune" },
    { name: "Karnataka State Warehouse", type: "state", location: { lat: 12.2958, lng: 76.6394 }, address: "Gokulam, Mysuru" }
  ],
  GODOWNS: [
    // Under NCR State Warehouse
    { name: "Gurugram Sohna Godown", location: { lat: 28.2492, lng: 77.0673 }, address: "Sohna Road, Gurugram", associatedStateWarehouseName: "NCR State Warehouse" },
    { name: "Delhi Dwarka Godown", location: { lat: 28.5823, lng: 77.0500 }, address: "Sector 10, Dwarka, Delhi", associatedStateWarehouseName: "NCR State Warehouse" },
    
    // Under Maharashtra State Warehouse
    { name: "Mumbai Thane Godown", location: { lat: 19.2183, lng: 72.9781 }, address: "Ghodbunder Road, Thane", associatedStateWarehouseName: "Maharashtra State Warehouse" },
    { name: "Pune Chinchwad Godown", location: { lat: 18.6298, lng: 73.7997 }, address: "Thergaon, Chinchwad, Pune", associatedStateWarehouseName: "Maharashtra State Warehouse" },

    // Under Karnataka State Warehouse
    { name: "Bengaluru Whitefield Godown", location: { lat: 12.9698, lng: 77.7500 }, address: "ITPL Main Road, Whitefield", associatedStateWarehouseName: "Karnataka State Warehouse" },
    { name: "Mysuru Hebbal Godown", location: { lat: 12.3500, lng: 76.6200 }, address: "Hebbal Industrial Area, Mysuru", associatedStateWarehouseName: "Karnataka State Warehouse" }
  ]
};

export const VEHICLES = {
  INTER_STATE: "Truck",
  INTRA_STATE: "Mini-Truck",
  LAST_MILE: "Motorcycle"
};
