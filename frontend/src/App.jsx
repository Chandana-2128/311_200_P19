import React,{useEffect,useState} from "react";
import { LayoutDashboard, FilePlus2, ClipboardList, Users, Route, BarChart3, ShieldAlert, RefreshCw } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const empty = {name:"",contact:"",district:"Chikkamagaluru",zoneCode:"ZNCHI123",resourceCode:"RESF01",resource:"Food",description:"",urgency:"Moderate"};
const nav = [
  ["Submit Report",FilePlus2],["Reports",ClipboardList],["Handlers",Users],["Routing",Route],["Analytics",BarChart3]
];
async function request(path,options={}) {
  const r=await fetch(API+path,{headers:{"Content-Type":"application/json"},...options});
  const data=await r.json();
  if(!r.ok) throw new Error(data.error || "Request failed");
  return data;
}
export default function App(){
  const [page,setPage]=useState("Submit Report");
  const [form,setForm]=useState(empty);
  const [reports,setReports]=useState([]);
  const [handlers,setHandlers]=useState([]);
  const [routing,setRouting]=useState([]);
  const [analytics,setAnalytics]=useState(null);
  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  async function load(){
    try {
      const [r,h,t,a]=await Promise.all([request("/reports"),request("/handlers"),request("/routing"),request("/analytics")]);
      setReports(r);setHandlers(h);setRouting(t);setAnalytics(a);setError("");
    } catch(e){setError(e.message);}
  }
  useEffect(()=>{load();const id=setInterval(load,8000);return()=>clearInterval(id);},[]);
  function update(k,v){setForm(f=>({...f,[k]:v}));}
  async function submit(e){
    e.preventDefault();setBusy(true);setNotice("");setError("");
    try{
      const result=await request("/reports",{method:"POST",body:JSON.stringify(form)});
      setNotice(`Report ${result.report.reportId} submitted. ${result.dispatch.reason}. ${result.dispatch.handler ? "Assigned to "+result.dispatch.handler : "Added to queue"}.`);
      setForm(empty);await load();setPage("Reports");
    }catch(e){setError(e.message);}
    finally{setBusy(false);}
  }
  async function status(id,value){
    try{await request(`/reports/${id}/status`,{method:"PATCH",body:JSON.stringify({status:value})});setNotice(`${id} updated to ${value}`);await load();}
    catch(e){setError(e.message);}
  }
  async function handlerUpdate(id,patch){
    try{await request(`/handlers/${id}`,{method:"PATCH",body:JSON.stringify(patch)});await load();}
    catch(e){setError(e.message);}
  }
  const counts=analytics?.byStatus||{};
  return <div className="app">
    <aside className="sidebar">
      <div className="brand"><div className="brandIcon"><ShieldAlert/></div><div><b>ReliefCoord</b><small>Flood response portal</small></div></div>
      <div className="navLabel">WORKSPACE</div>
      {nav.map(([name,Icon])=><button key={name} className={`navItem ${page===name?"active":""}`} onClick={()=>{setPage(name);setNotice("");}}><Icon size={18}/>{name}</button>)}
      <div className="sideFoot"><span className="pulse"/> System workspace<br/><small>Academic demonstration</small></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><div className="eyebrow">FLOOD RELIEF OPERATIONS</div><h1>{page}</h1></div><button className="refresh" onClick={load}><RefreshCw size={16}/> Refresh</button></header>
      <section className="content">
        {error&&<div className="alert error">{error}</div>}
        {notice&&<div className="alert success">{notice}<button onClick={()=>setNotice("")}>×</button></div>}
        <div className="stats">
          <Stat label="Total reports" value={analytics?.total??"—"} icon={<ClipboardList/>}/>
          <Stat label="Pending" value={counts.Pending??0} icon={<LayoutDashboard/>}/>
          <Stat label="In progress" value={counts["In Progress"]??0} icon={<RefreshCw/>}/>
          <Stat label="Resolved" value={counts.Resolved??0} icon={<ShieldAlert/>}/>
        </div>
        {page==="Submit Report"&&<section className="panel"><div className="panelHead"><div><h2>New relief request</h2><p>Enter the details to validate, classify and route a request.</p></div><span className="tag">DFA + REGEX</span></div>
          <form onSubmit={submit} className="formGrid">
            <Field label="Requester name"><input required value={form.name} onChange={e=>update("name",e.target.value)} placeholder="Enter full name"/></Field>
            <Field label="Contact number"><input required value={form.contact} onChange={e=>update("contact",e.target.value)} placeholder="Phone number"/></Field>
            <Field label="District"><select value={form.district} onChange={e=>update("district",e.target.value)}>{["Chikkamagaluru","Shivamogga","Koppa","Tirthahalli","Balehonnur"].map(x=><option>{x}</option>)}</select></Field>
            <Field label="Zone code"><input required value={form.zoneCode} onChange={e=>update("zoneCode",e.target.value.toUpperCase())}/><small>Format: ZN + 3 letters + 3 digits</small></Field>
            <Field label="Resource type"><select value={form.resource} onChange={e=>{update("resource",e.target.value);update("resourceCode",({Food:"RESF01",Medical:"RESM01",Shelter:"RESS01",Rescue:"RESR01",Water:"RESW01"})[e.target.value]);}}>{["Food","Medical","Shelter","Rescue","Water"].map(x=><option>{x}</option>)}</select></Field>
            <Field label="Resource code"><input required value={form.resourceCode} onChange={e=>update("resourceCode",e.target.value.toUpperCase())}/><small>RES + F/M/S/R/W + 2 digits</small></Field>
            <Field label="Urgency"><select value={form.urgency} onChange={e=>update("urgency",e.target.value)}>{["Immediate","Urgent","Moderate","Stable"].map(x=><option>{x}</option>)}</select></Field>
            <Field label="Description" wide><textarea required rows="4" value={form.description} onChange={e=>update("description",e.target.value)} placeholder="Describe the situation and assistance required"/></Field>
            <div className="formActions"><button className="primary" disabled={busy}>{busy?"Submitting…":"Validate and submit request"}</button></div>
          </form>
        </section>}
        {page==="Reports"&&<section className="panel"><div className="panelHead"><div><h2>Submitted reports</h2><p>Validated requests, classification and dispatch decisions.</p></div></div><div className="tableWrap"><table><thead><tr><th>Report ID</th><th>Requester</th><th>District</th><th>Resource</th><th>Category</th><th>Handler</th><th>Status</th><th>Update</th></tr></thead><tbody>{reports.map(r=><tr key={r.reportId}><td className="mono">{r.reportId}</td><td>{r.name}</td><td>{r.district}</td><td>{r.resource}</td><td><Pill value={r.category}/></td><td>{r.handler||"—"}</td><td><Pill value={r.status}/></td><td><select className="smallSelect" value={r.status==="Queued"?"Pending":r.status} onChange={e=>status(r.reportId,e.target.value)}><option>Pending</option><option>Assigned</option><option>In Progress</option><option>Resolved</option></select></td></tr>)}</tbody></table>{!reports.length&&<Empty/>}</div></section>}
        {page==="Handlers"&&<section className="panel"><div className="panelHead"><div><h2>Handler dashboard</h2><p>Availability and capacity of response teams.</p></div></div><div className="cards">{handlers.map(h=><div className="handlerCard" key={h._id}><div className="handlerTop"><div className="avatar">{h.name.split(" ").map(x=>x[0]).slice(0,2).join("")}</div><Pill value={h.available?"Available":"Unavailable"}/></div><h3>{h.name}</h3><p>{h.district} · {h.resource}</p><div className="capacity"><span>Capacity</span><b>{h.activeLoad}/{h.capacity}</b></div><div className="bar"><i style={{width:`${Math.min(100,h.activeLoad/Math.max(1,h.capacity)*100)}%`}}/></div><label className="toggle"><input type="checkbox" checked={h.available} onChange={e=>handlerUpdate(h._id,{available:e.target.checked})}/> Available for dispatch</label>{h.backup&&<small className="backup">BACKUP TEAM</small>}</div>)}</div></section>}
        {page==="Routing"&&<section className="panel"><div className="panelHead"><div><h2>Routing management</h2><p>Explicit district and resource routing table.</p></div><span className="tag">PRIMARY + BACKUP</span></div><div className="tableWrap"><table><thead><tr><th>District</th><th>Resource</th><th>Primary handler</th><th>Backup handler</th></tr></thead><tbody>{routing.map((r,i)=><tr key={i}><td>{r.district}</td><td>{r.resource}</td><td>{r.primary}</td><td>{r.backup}</td></tr>)}</tbody></table></div><div className="infoBox">Dispatch checks the primary handler first, then the backup. If no matching handler is available or capacity is full, the report is queued. Immediate requests receive the highest queue priority in the application workflow.</div></section>}
        {page==="Analytics"&&<section className="panel"><div className="panelHead"><div><h2>Operations analytics</h2><p>Live counts calculated from stored reports.</p></div></div><div className="analyticsGrid"><Chart title="Reports by category" data={analytics?.byCategory}/><Chart title="Reports by status" data={analytics?.byStatus}/><Chart title="Reports by district" data={analytics?.byDistrict}/></div></section>}
      </section>
      <footer>Flood Relief Coordination Portal <span>·</span> BCS503 + BCS502 academic prototype</footer>
    </main>
  </div>;
}
function Stat({label,value,icon}){return <div className="stat"><div className="statIcon">{icon}</div><div><small>{label}</small><strong>{value}</strong></div></div>}
function Field({label,children,wide}){return <label className={`field ${wide?"wide":""}`}><span>{label}</span>{children}</label>}
function Pill({value}){const cls=String(value).toLowerCase().replaceAll(" ","-");return <span className={`pill ${cls}`}>{value}</span>}
function Empty(){return <div className="empty">No reports yet. Submit a sample report to see it here.</div>}
function Chart({title,data}){return <div className="chart"><h3>{title}</h3>{Object.entries(data||{}).map(([k,v])=><div className="chartRow" key={k}><span>{k}</span><div className="chartTrack"><i style={{width:`${Math.max(v?3:0,Math.min(100,v/Math.max(1,...Object.values(data||{}))*100))}%`}}/></div><b>{v}</b></div>)}</div>}
