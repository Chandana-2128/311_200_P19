export const routingTable = [
  { district: "Chikkamagaluru", resource: "Food", primary: "Food Team 1", backup: "Relief Team 1" },
  { district: "Chikkamagaluru", resource: "Medical", primary: "Medical Team 1", backup: "Medical Backup 1" },
  { district: "Shivamogga", resource: "Shelter", primary: "Shelter Team 2", backup: "Relief Team 2" },
  { district: "Koppa", resource: "Rescue", primary: "Rescue Team 3", backup: "Rescue Backup 3" },
  { district: "Tirthahalli", resource: "Water", primary: "Water Team 4", backup: "Relief Team 4" },
  { district: "Balehonnur", resource: "Food", primary: "Food Team 5", backup: "Relief Team 5" }
];

export const seedHandlers = [
  ["Food Team 1","Chikkamagaluru","Food",true,3,0,false],
  ["Relief Team 1","Chikkamagaluru","Food",true,5,0,true],
  ["Medical Team 1","Chikkamagaluru","Medical",true,2,0,false],
  ["Medical Backup 1","Chikkamagaluru","Medical",true,2,0,true],
  ["Shelter Team 2","Shivamogga","Shelter",true,4,0,false],
  ["Relief Team 2","Shivamogga","Shelter",true,4,0,true],
  ["Rescue Team 3","Koppa","Rescue",true,2,0,false],
  ["Rescue Backup 3","Koppa","Rescue",true,2,0,true],
  ["Water Team 4","Tirthahalli","Water",true,5,0,false],
  ["Relief Team 4","Tirthahalli","Water",true,5,0,true],
  ["Food Team 5","Balehonnur","Food",true,3,0,false],
  ["Relief Team 5","Balehonnur","Food",true,3,0,true]
].map(([name,district,resource,available,capacity,activeLoad,backup]) =>
  ({name,district,resource,available,capacity,activeLoad,backup}));

export function classifyReport({ urgency, resource, description }) {
  const text = `${resource} ${description}`.toLowerCase();
  if (/\b(resolved|completed|fixed)\b/.test(text)) return "Resolved";
  if (urgency === "Immediate" || /trapped|life.?threat|critical|missing person/.test(text)) return "Immediate";
  if (urgency === "Urgent" || resource === "Rescue" || resource === "Medical") return "Urgent";
  if (urgency === "Moderate") return "Moderate";
  if (urgency === "Stable") return "Stable";
  return "Moderate";
}

export function chooseHandler({ district, resource, category }, handlers) {
  const route = routingTable.find(r => r.district === district && r.resource === resource);
  if (!route) return { handler: null, reason: "No route found", queued: true };
  const candidates = [route.primary, route.backup];
  const ordered = [...handlers].sort((a,b) => {
    const ap = a.name === route.primary ? 0 : a.name === route.backup ? 1 : 2;
    const bp = b.name === route.primary ? 0 : b.name === route.backup ? 1 : 2;
    return ap - bp;
  });
  for (const h of ordered) {
    if (candidates.includes(h.name) && h.available && h.activeLoad < h.capacity) {
      return { handler: h, reason: h.backup ? "Primary unavailable/full; backup selected" : "Primary route selected", queued: false };
    }
  }
  // Emergency fallback: any available handler for the same resource and district.
  if (category === "Immediate") {
    const emergency = handlers.find(h => h.district === district && h.resource === resource && h.available && h.activeLoad < h.capacity);
    if (emergency) return { handler: emergency, reason: "Emergency fallback selected", queued: false };
  }
  return { handler: null, reason: "No available handler with capacity", queued: true };
}
