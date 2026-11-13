import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
  reportId: { type: String, unique: true, index: true },
  name: { type: String, required: true },
  contact: { type: String, required: true },
  district: { type: String, required: true },
  zoneCode: { type: String, required: true },
  resourceCode: { type: String, required: true },
  resource: { type: String, required: true },
  description: { type: String, required: true },
  urgency: { type: String, enum: ["Immediate","Urgent","Moderate","Stable"], required: true },
  category: { type: String, enum: ["Immediate","Urgent","Moderate","Stable","Resolved"], required: true },
  status: { type: String, enum: ["Pending","Assigned","In Progress","Resolved","Queued"], default: "Pending" },
  handler: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  history: [{ status: String, at: { type: Date, default: Date.now }, note: String }]
});

const handlerSchema = new mongoose.Schema({
  name: { type: String, unique: true },
  district: String,
  resource: String,
  available: { type: Boolean, default: true },
  capacity: { type: Number, default: 3 },
  activeLoad: { type: Number, default: 0 },
  backup: { type: Boolean, default: false }
});

export const Report = mongoose.model("Report", reportSchema);
export const Handler = mongoose.model("Handler", handlerSchema);
