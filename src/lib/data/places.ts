import type { StartPlace } from "@/lib/types";

/** Start points and metro stations, pinned from OpenStreetMap (© OpenStreetMap contributors, ODbL). */
export const PLACES: StartPlace[] = [
  { id: "shyambazar", name: "Shyambazar Metro", kind: "metro", lat: 22.60133, lng: 88.3725, aliases: ["shyambazar", "shyam bazar", "shyambazar five point", "paanch mathar mor", "5 point crossing"] },
  { id: "shobhabazar", name: "Shobhabazar Sutanuti Metro", kind: "metro", lat: 22.59588, lng: 88.3652, aliases: ["shobhabazar", "sovabazar", "sutanuti", "shobhabazar sutanuti"] },
  { id: "girish-park", name: "Girish Park Metro", kind: "metro", lat: 22.58714, lng: 88.36294, aliases: ["girish park"] },
  { id: "mg-road", name: "Mahatma Gandhi Road Metro", kind: "metro", lat: 22.58092, lng: 88.36133, aliases: ["mg road", "mahatma gandhi road", "m.g. road"] },
  { id: "central", name: "Central Metro", kind: "metro", lat: 22.57249, lng: 88.35874, aliases: ["central", "central metro", "bowbazar"] },
  { id: "esplanade", name: "Esplanade Metro", kind: "metro", lat: 22.56361, lng: 88.35121, aliases: ["esplanade", "dharmatala", "esplanade metro"] },
  { id: "sealdah", name: "Sealdah Station", kind: "rail", lat: 22.56738, lng: 88.37102, aliases: ["sealdah"] },
  { id: "college-street", name: "College Street", kind: "landmark", lat: 22.5745, lng: 88.3634, aliases: ["college street", "boipara", "coffee house"] },
  { id: "belgachia", name: "Belgachia Metro", kind: "metro", lat: 22.60592, lng: 88.38639, aliases: ["belgachia"] },
  { id: "dum-dum", name: "Dum Dum Station", kind: "metro", lat: 22.62111, lng: 88.3929, aliases: ["dum dum", "dumdum"] },
  { id: "lake-town", name: "Lake Town (Jaya Cinema)", kind: "landmark", lat: 22.6045, lng: 88.4012, aliases: ["lake town", "laketown", "jaya", "vip road"] },
  { id: "city-centre", name: "City Centre Metro, Salt Lake", kind: "metro", lat: 22.5871, lng: 88.40789, aliases: ["city centre", "city center", "salt lake", "bidhannagar"] },
  { id: "kalighat", name: "Kalighat Metro", kind: "metro", lat: 22.51688, lng: 88.34584, aliases: ["kalighat", "kalighat metro"] },
  { id: "jatin-das-park", name: "Jatin Das Park Metro", kind: "metro", lat: 22.52415, lng: 88.34647, aliases: ["jatin das park", "jatin das", "hazra"] },
  { id: "rabindra-sarobar", name: "Rabindra Sarobar Metro", kind: "metro", lat: 22.50722, lng: 88.34549, aliases: ["rabindra sarobar", "lake", "dhakuria lake", "lake mall"] },
  { id: "netaji-bhavan", name: "Netaji Bhavan Metro", kind: "metro", lat: 22.53318, lng: 88.34593, aliases: ["netaji bhavan", "bhowanipore", "bhawanipur"] },
  { id: "tollygunge", name: "Mahanayak Uttam Kumar Metro (Tollygunge)", kind: "metro", lat: 22.49477, lng: 88.34509, aliases: ["tollygunge", "tolly", "uttam kumar", "mahanayak uttam kumar"] },
  { id: "gariahat", name: "Gariahat Crossing", kind: "landmark", lat: 22.51964, lng: 88.36562, aliases: ["gariahat", "gariahat crossing", "gariahat more"] },
  { id: "ballygunge", name: "Ballygunge Station", kind: "rail", lat: 22.51934, lng: 88.37198, aliases: ["ballygunge", "ballygunge station"] },
  { id: "dhakuria", name: "Dhakuria Station", kind: "rail", lat: 22.50911, lng: 88.37113, aliases: ["dhakuria"] },
  { id: "behala-chowrasta", name: "Behala Chowrasta Metro", kind: "metro", lat: 22.48735, lng: 88.31338, aliases: ["behala chowrasta", "behala", "chowrasta"] },
  { id: "behala-bazar", name: "Behala Bazar Metro", kind: "metro", lat: 22.49876, lng: 88.31739, aliases: ["behala bazar"] },
  { id: "kavi-nazrul", name: "Kavi Nazrul Metro", kind: "metro", lat: 22.46425, lng: 88.38046, aliases: ["kavi nazrul", "garia"] },
  { id: "belur", name: "Belur Math Station", kind: "rail", lat: 22.6313, lng: 88.35058, aliases: ["belur", "belur math"] },
];

export const PLACE_BY_ID = new Map(PLACES.map((p) => [p.id, p]));
export const METROS = PLACES.filter((p) => p.kind === "metro");
