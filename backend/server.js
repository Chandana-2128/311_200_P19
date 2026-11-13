import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { Report, Handler } from "./models.js";
import { routingTable, seedHandlers, classifyReport, chooseHandler } from "./dispatch.js";

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/flood_relief";
const VALIDATOR_URL = process.env.VALIDATOR_URL || "http://127.0.0.1:8000";

app.get("/api/health", (_req,res) => res.json({status:"ok", service:"flood-relief-api"}));

async function validateCodes(zoneCode, resourceCode) {
  const response = await fetch(`${VALIDATOR_URL}/validate`, {
    method:"POST", headers:{"content-type":"application/json"},
    body:JSON.stringify({zone_code:zoneCode, resource_code:resourceCode})
  });
  if (!response.ok) throw new Error("Python validation service unavailable");
  return response.json();
}

app.post("/api/reports", async (req,res) => {
  try {
    const {name,contact,district,zoneCode,resourceCode,resource,description,urgency} = req.body;
    if (![name,contact,district,zoneCode,resourceCode,resource,description,urgency].every(v => typeof v === "string" && v.trim())) {
      return res.status(400).json({error:"Please complete every required field."});
    }
    const validation = await validateCodes(zoneCode.trim(), resourceCode.trim());
    if (!validation.valid) return res.status(400).json({error:"Validation failed", validation});
    const category = classifyReport({urgency,resource,description});
    const handlers = await Handler.find();
    const decision = chooseHandler({district,resource,category}, handlers);
    const report = await Report.create({
      reportId:`FR-${randomUUID().slice(0,8).toUpperCase()}`,
      name,contact,district,zoneCode,resourceCode,resource,description,urgency,category,
      status: decision.queued ? "Queued" : "Assigned",
      handler: decision.handler?.name || null,
      history:[{status:decision.queued ? "Queued" : "Assigned",note:decision.reason}]
    });
    if (decision.handler) {
      decision.handler.activeLoad += 1;
      await decision.handler.save();
    }
    res.status(201).json({report, validation, dispatch:{handler:decision.handler?.name || null,reason:decision.reason,queued:decision.queued}});
  } catch (e) { res.status(500).json({error:e.message}); }
});

app.get("/api/reports", async (_req,res) => {
  const reports = await Report.find().limit(500);
  const rank = {Immediate:0,Urgent:1,Moderate:2,Stable:3,Resolved:4};
  // Queued reports appear first in deterministic emergency-priority order.
  reports.sort((a,b) => {
    if (a.status === "Queued" && b.status !== "Queued") return -1;
    if (b.status === "Queued" && a.status !== "Queued") return 1;
    if (a.status === "Queued" && b.status === "Queued") return (rank[a.category]??9)-(rank[b.category]??9) || a.createdAt-b.createdAt;
    return b.createdAt-a.createdAt;
  });
  res.json(reports);
});

app.patch("/api/reports/:id/status", async (req,res) => {
  const allowed = ["Pending","Assigned","In Progress","Resolved"];
  if (!allowed.includes(req.body.status)) return res.status(400).json({error:"Invalid status"});
  const report = await Report.findOne({reportId:req.params.id});
  if (!report) return res.status(404).json({error:"Report not found"});
  const oldStatus = report.status;
  report.status = req.body.status;
  report.history.push({status:req.body.status,note:"Updated by handler/admin"});
  if (req.body.status === "Resolved" && oldStatus !== "Resolved" && report.handler) {
    await Handler.updateOne({name:report.handler},{$inc:{activeLoad:-1}});
  }
  await report.save();
  // When work is resolved, try to dispatch the highest-priority queued request.
  if (req.body.status === "Resolved" && oldStatus !== "Resolved") await dispatchNextQueued();
  res.json(report);
});

async function dispatchNextQueued() {
  const queued = await Report.find({status:"Queued"});
  const rank = {Immediate:0,Urgent:1,Moderate:2,Stable:3,Resolved:4};
  queued.sort((a,b)=>(rank[a.category]??9)-(rank[b.category]??9) || a.createdAt-b.createdAt);
  for (const report of queued) {
    const handlers = await Handler.find();
    const decision = chooseHandler({district:report.district,resource:report.resource,category:report.category},handlers);
    if (decision.handler) {
      decision.handler.activeLoad += 1;
      await decision.handler.save();
      report.handler = decision.handler.name;
      report.status = "Assigned";
      report.history.push({status:"Assigned",note:`Queue dispatch: ${decision.reason}`});
      await report.save();
      break;
    }
  }
}

app.get("/api/handlers", async (_req,res) => res.json(await Handler.find().sort({district:1,name:1})));
app.patch("/api/handlers/:id", async (req,res) => {
  const handler = await Handler.findByIdAndUpdate(req.params.id, req.body, {new:true,runValidators:true});
  if (!handler) return res.status(404).json({error:"Handler not found"});
  if (handler.available && handler.activeLoad < handler.capacity) await dispatchNextQueued();
  res.json(handler);
});
app.get("/api/routing", (_req,res) => res.json(routingTable));
app.get("/api/analytics", async (_req,res) => {
  const reports = await Report.find();
  const count = key => reports.filter(r => r[key]).length;
  const byCategory = Object.fromEntries(["Immediate","Urgent","Moderate","Stable","Resolved"].map(k => [k,reports.filter(r=>r.category===k).length]));
  const byStatus = Object.fromEntries(["Pending","Assigned","In Progress","Resolved","Queued"].map(k => [k,reports.filter(r=>r.status===k).length]));
  const byDistrict = {};
  reports.forEach(r => byDistrict[r.district]=(byDistrict[r.district]||0)+1);
  res.json({total:reports.length,byCategory,byStatus,byDistrict});
});

async function start() {
  await mongoose.connect(MONGO_URI);
  for (const h of seedHandlers) await Handler.updateOne({name:h.name},{$setOnInsert:h},{upsert:true});
  app.listen(PORT, "0.0.0.0", () => console.log(`API listening on ${PORT}`));
}
if (process.env.NODE_ENV !== "test") start().catch(err => {console.error(err);process.exit(1);});
export default app;
