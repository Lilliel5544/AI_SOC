"use client";

import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Globe2, X } from "lucide-react";

type Log = { source_ip?:string; destination_ip?:string };
type Selection = {field:"source_ip"|"destination_ip";ip:string}|null;
const palette=["#69d5bb","#f1ad73","#7baeea","#c6a0ed","#e481a0","#a7c676","#dbbd75","#80bcc6"];

export default function IpPieChart({alerts,selection,onSelect}:{alerts:Log[];selection:Selection;onSelect:(value:Selection)=>void}) {
  const [field,setField]=useState<"source_ip"|"destination_ip">("source_ip");
  const data=useMemo(()=>{
    const counts=new Map<string,number>();
    for(const log of alerts){const ip=log[field]?.trim()||"Không xác định";counts.set(ip,(counts.get(ip)||0)+1);}
    return Array.from(counts,([ip,count])=>({ip,count,percentage:alerts.length?Math.round(count/alerts.length*100):0})).sort((a,b)=>b.count-a.count||a.ip.localeCompare(b.ip));
  },[alerts,field]);
  function choose(ip:string){onSelect(selection?.field===field&&selection.ip===ip?null:{field,ip});}
  return <section className="ip-section" aria-label="Phân bố log theo địa chỉ IP">
    <div className="ip-heading"><div><div className="traffic-kicker"><Globe2 size={16}/> PHÂN BỐ ĐỊA CHỈ IP</div><h2>Log theo IP</h2><p>Chọn một phần quạt hoặc một IP để lọc danh sách log.</p></div><label className="ip-switch">Phân loại theo<select value={field} onChange={e=>{setField(e.target.value as typeof field);onSelect(null)}}><option value="source_ip">IP nguồn</option><option value="destination_ip">IP đích</option></select></label></div>
    {selection&&<button className="traffic-selection" onClick={()=>onSelect(null)}>Đang lọc {selection.field==="source_ip"?"IP nguồn":"IP đích"}: {selection.ip} <X size={14}/></button>}
    {!data.length?<div className="traffic-empty">Chưa có log để phân loại theo IP.</div>:<div className="ip-chart-layout"><div className="ip-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="count" nameKey="ip" cx="50%" cy="50%" outerRadius={105} paddingAngle={2} stroke="#111b29" strokeWidth={2} onClick={(entry)=>{const ip=(entry as unknown as {payload?:{ip?:string}}).payload?.ip;if(ip)choose(ip)}}>{data.map((entry,index)=><Cell key={entry.ip} fill={palette[index%palette.length]} opacity={!selection||selection.field!==field||selection.ip===entry.ip?1:.3} style={{cursor:"pointer"}}/>)}</Pie><Tooltip content={({active,payload})=>{const item=payload?.[0]?.payload as {ip:string;count:number;percentage:number}|undefined;return active&&item?<div className="traffic-tooltip"><strong>{item.ip}</strong><div>Log <b>{item.count}</b></div><div>Tỷ lệ <b>{item.percentage}%</b></div></div>:null}}/></PieChart></ResponsiveContainer></div><div className="ip-list">{data.map((entry,index)=><button key={entry.ip} onClick={()=>choose(entry.ip)} className={`ip-item ${selection?.field===field&&selection.ip===entry.ip?"selected":""}`}><span className="ip-color" style={{background:palette[index%palette.length]}}/><span className="ip-name">{entry.ip}</span><span className="ip-count">{entry.count} log</span><strong>{entry.percentage}%</strong></button>)}</div></div>}
    <div className="traffic-caption">{data.length} địa chỉ IP · Tính theo các bộ lọc và khoảng thời gian đang chọn</div>
  </section>;
}
