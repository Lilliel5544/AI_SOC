"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, BarChart3, X } from "lucide-react";

type Log = { event_time:string; processed_at?:string; ai_threat_level?:string };
type Bucket = { start:number; label:string; total:number; high:number; medium:number; other:number; cumulative:number };
const periods = [{label:"1 phút",ms:60_000},{label:"5 phút",ms:300_000},{label:"1 giờ",ms:3_600_000},{label:"1 ngày",ms:86_400_000}];
const vn = (v:number, period:number) => new Intl.DateTimeFormat("vi-VN", {timeZone:"Asia/Ho_Chi_Minh",day:period>=86_400_000?"2-digit":undefined,month:period>=86_400_000?"2-digit":undefined,hour:period<86_400_000?"2-digit":undefined,minute:period<3_600_000?"2-digit":undefined,hour12:false}).format(v);
const fullTime = (v:number) => new Intl.DateTimeFormat("vi-VN", {timeZone:"Asia/Ho_Chi_Minh",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:false}).format(v);
function timestamp(v?:string) { if(!v)return NaN;return new Date(v.replace(/([+-]\d{2})(\d{2})$/, "$1:$2")).getTime(); }
function bucketStart(t:number,step:number) { const offset=step>=86_400_000?7*3_600_000:0;return Math.floor((t+offset)/step)*step-offset; }
function TooltipContent({active,payload,period}:{active?:boolean;payload?:Array<{payload:Bucket}>;period:number}) {
  const item=payload?.[0]?.payload;if(!active||!item)return null;
  return <div className="traffic-tooltip"><strong>{fullTime(item.start)}</strong><div>Tổng log <b>{item.total}</b></div><div>Mức cao <b>{item.high}</b></div><div>Trung bình <b>{item.medium}</b></div><div>Khác <b>{item.other}</b></div><small>Khoảng {periods.find(p=>p.ms===period)?.label||"tùy chỉnh"}</small></div>;
}
export default function TrafficCharts({alerts,selectedBucket,onSelect}:{alerts:Log[];selectedBucket:{start:number;period:number;field:"processed_at"|"event_time"}|null;onSelect:(bucket:{start:number;period:number;field:"processed_at"|"event_time"}|null)=>void}) {
  const [field,setField]=useState<"processed_at"|"event_time">("processed_at");
  const [period,setPeriod]=useState(60_000);
  const {data,effectivePeriod}=useMemo(()=>{
    const events=alerts.map(a=>({t:timestamp(a[field]||a.event_time),level:a.ai_threat_level})).filter(a=>Number.isFinite(a.t));
    if(!events.length)return {data:[] as Bucket[],effectivePeriod:period};
    const min=Math.min(...events.map(a=>a.t)),max=Math.max(...events.map(a=>a.t));
    let step=period;
    // Keep long imports readable while retaining the selected minimum interval.
    while((bucketStart(max,step)-bucketStart(min,step))/step>89)step*=step<3_600_000?5:step<86_400_000?24:7;
    const start=bucketStart(min,step),end=bucketStart(max,step);
    const map=new Map<number,Bucket>();
    for(let t=start;t<=end;t+=step)map.set(t,{start:t,label:vn(t,step),total:0,high:0,medium:0,other:0,cumulative:0});
    for(const a of events){const b=map.get(bucketStart(a.t,step));if(!b)continue;b.total++;if(a.level==="High"||a.level==="Critical")b.high++;else if(a.level==="Medium")b.medium++;else b.other++;}
    let cumulative=0;const data=Array.from(map.values());for(const b of data){cumulative+=b.total;b.cumulative=cumulative;}
    return {data,effectivePeriod:step};
  },[alerts,field,period]);
  const peak=Math.max(0,...data.map(d=>d.total));
  const selected=selectedBucket?.field===field?selectedBucket:null;
  const handleClick=(entry:{payload?:Bucket})=>{const row=entry?.payload;if(row)onSelect({start:row.start,period:effectivePeriod,field});};
  return <section className="traffic-section" aria-label="Biểu đồ lưu lượng log">
    <div className="traffic-header"><div><div className="traffic-kicker"><Activity size={16}/> LƯU LƯỢNG THEO THỜI GIAN</div><h2>Log đến hệ thống</h2><p>Chọn một cột để xem các log trong khoảng thời gian đó.</p></div><div className="traffic-controls"><label>Thời gian <select value={field} onChange={e=>{setField(e.target.value as typeof field);onSelect(null)}}><option value="processed_at">Hệ thống xử lý</option><option value="event_time">Sự kiện xảy ra</option></select></label><label>Gom theo <select value={period} onChange={e=>{setPeriod(Number(e.target.value));onSelect(null)}}>{periods.map(p=><option key={p.ms} value={p.ms}>{p.label}</option>)}</select></label></div></div>
    {selected&&<button className="traffic-selection" onClick={()=>onSelect(null)}>Đang lọc: {fullTime(selected.start)} · {data.find(d=>d.start===selected.start)?.total??0} log <X size={14}/></button>}
    {!data.length?<div className="traffic-empty">Chưa có dữ liệu thời gian để hiển thị.</div>:<div className="traffic-grid">
      <div className="chart-card"><div className="chart-title"><div><BarChart3 size={17}/><strong>Log theo khoảng thời gian</strong></div><span>Đỉnh {peak} log / khoảng</span></div><div className="chart-legend"><span><i className="legend-high"/> Cao / nghiêm trọng</span><span><i className="legend-medium"/> Trung bình</span><span><i className="legend-other"/> Khác</span></div><div className="chart-plot"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} barCategoryGap="22%" margin={{top:10,right:6,bottom:0,left:-22}}><CartesianGrid vertical={false} stroke="#263a4a" strokeDasharray="3 5"/><XAxis dataKey="label" tick={{fill:"#8095a9",fontSize:11}} tickLine={false} axisLine={false} minTickGap={14}/><YAxis allowDecimals={false} tick={{fill:"#8095a9",fontSize:11}} tickLine={false} axisLine={false}/><Tooltip content={<TooltipContent period={effectivePeriod}/>} cursor={{fill:"#ffffff0c"}}/><Bar onClick={handleClick} dataKey="other" stackId="a" fill="#63839d" maxBarSize={42}/><Bar onClick={handleClick} dataKey="medium" stackId="a" fill="#e8b56e" maxBarSize={42}/><Bar onClick={handleClick} dataKey="high" stackId="a" fill="#ed8c76" radius={[3,3,0,0]} maxBarSize={42}/></BarChart></ResponsiveContainer></div></div>
      <div className="chart-card"><div className="chart-title"><div><Activity size={17}/><strong>Log tích lũy</strong></div><span>{alerts.length} log</span></div><p className="chart-explainer">Tổng số log đã nhận đến từng mốc</p><div className="chart-plot"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{top:10,right:7,bottom:0,left:-22}}><defs><linearGradient id="cumulativeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#65d8bd" stopOpacity={.34}/><stop offset="100%" stopColor="#65d8bd" stopOpacity={.02}/></linearGradient></defs><CartesianGrid vertical={false} stroke="#263a4a" strokeDasharray="3 5"/><XAxis dataKey="label" tick={{fill:"#8095a9",fontSize:11}} tickLine={false} axisLine={false} minTickGap={14}/><YAxis allowDecimals={false} tick={{fill:"#8095a9",fontSize:11}} tickLine={false} axisLine={false}/><Tooltip content={({active,payload})=>{const b=payload?.[0]?.payload as Bucket|undefined;return active&&b?<div className="traffic-tooltip"><strong>{fullTime(b.start)}</strong><div>Log tích lũy <b>{b.cumulative}</b></div></div>:null}}/><Area type="monotone" dataKey="cumulative" stroke="#72e2c8" strokeWidth={2.5} fill="url(#cumulativeFill)" dot={false} activeDot={{r:4,fill:"#72e2c8"}}/></AreaChart></ResponsiveContainer></div></div>
    </div>}
    <div className="traffic-caption">Theo bộ lọc của danh sách · Múi giờ Việt Nam (UTC+7) · {field==="processed_at"?"Dựa trên processed_at; nếu thiếu sẽ dùng event_time":"Dựa trên event_time"}{effectivePeriod!==period?" · Khoảng gom được tăng để biểu đồ dễ đọc":""}</div>
  </section>;
}
