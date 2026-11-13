import test from "node:test";
import assert from "node:assert/strict";
import { classifyReport, chooseHandler, routingTable, seedHandlers } from "./dispatch.js";

const base = {district:"Chikkamagaluru",resource:"Food",category:"Moderate"};
const handlers = seedHandlers.map(h=>({...h}));

test("01 Immediate urgency classification",()=>assert.equal(classifyReport({urgency:"Immediate",resource:"Food",description:"Need food"}),"Immediate"));
test("02 Urgent urgency classification",()=>assert.equal(classifyReport({urgency:"Urgent",resource:"Food",description:"Need food"}),"Urgent"));
test("03 Moderate classification",()=>assert.equal(classifyReport({urgency:"Moderate",resource:"Food",description:"Need food"}),"Moderate"));
test("04 Stable classification",()=>assert.equal(classifyReport({urgency:"Stable",resource:"Food",description:"Safe"}),"Stable"));
test("05 Resolved category can be recognized from a completed report",()=>assert.equal(classifyReport({urgency:"Stable",resource:"Food",description:"Request completed and resolved"}),"Resolved"));
test("06 Trapped keyword escalates to Immediate",()=>assert.equal(classifyReport({urgency:"Moderate",resource:"Rescue",description:"People trapped"}),"Immediate"));
test("07 Medical resource is urgent",()=>assert.equal(classifyReport({urgency:"Moderate",resource:"Medical",description:"Medicine"}),"Urgent"));
test("08 Known route selects primary",()=>assert.equal(chooseHandler(base,handlers).handler.name,"Food Team 1"));
test("09 Unknown district is queued",()=>assert.equal(chooseHandler({...base,district:"Unknown"},handlers).queued,true));
test("10 Unknown resource is queued",()=>assert.equal(chooseHandler({...base,resource:"Unknown"},handlers).queued,true));
test("11 Unavailable primary selects backup",()=>{const hs=handlers.map(h=>({...h}));hs.find(h=>h.name==="Food Team 1").available=false;assert.equal(chooseHandler(base,hs).handler.name,"Relief Team 1");});
test("12 Full primary selects backup",()=>{const hs=handlers.map(h=>({...h}));hs.find(h=>h.name==="Food Team 1").activeLoad=3;assert.equal(chooseHandler(base,hs).handler.name,"Relief Team 1");});
test("13 All handlers full queues request",()=>{const hs=handlers.map(h=>({...h,activeLoad:h.capacity}));assert.equal(chooseHandler(base,hs).queued,true);});
test("14 Immediate category remains dispatchable using emergency fallback",()=>{const hs=handlers.map(h=>({...h}));hs.find(h=>h.name==="Food Team 1").available=false;hs.find(h=>h.name==="Relief Team 1").available=false;assert.equal(chooseHandler({...base,category:"Immediate"},hs).queued,true);});
test("15 Routing table contains explicit district-resource routes",()=>assert.ok(routingTable.length>=5));
