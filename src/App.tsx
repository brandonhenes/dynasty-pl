import React, { useState, useMemo, useRef, useEffect } from "react";
import { BarChart, Bar, AreaChart, Area, ComposedChart, PieChart, Pie, Cell, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// All 2025 leagues with full payout structure for EV calc
const L25=[
{nm:"Farts and Boners",bi:100,p1:700,p2:400,p3:100,px:0,tm:12,ps:6,edge:80,arch:"Competitor",f:1,wc:true,net:600,fmt:"dynasty"},
{nm:"D-Core",bi:100,p1:600,p2:360,p3:240,px:0,tm:12,ps:6,edge:98.2,arch:"Competitor",f:1,wc:true,net:500,fmt:"dynasty"},
{nm:"Even More Dick",bi:100,p1:600,p2:150,p3:0,px:150,tm:12,ps:6,edge:82.3,arch:"Rebuilder",f:1,wc:true,net:500,fmt:"dynasty"},
{nm:"The Gentlemens Club",bi:50,p1:425,p2:125,p3:50,px:50,tm:14,ps:7,edge:78.6,arch:"Competitor",f:1,wc:true,net:425,fmt:"dynasty"},
{nm:"Capital Punishment",bi:100,p1:700,p2:300,p3:100,px:100,tm:12,ps:6,edge:86.9,arch:"Competitor",f:2,wc:false,net:300,fmt:"dynasty"},
{nm:"12 Gs",bi:100,p1:600,p2:350,p3:200,px:50,tm:12,ps:6,edge:88.3,arch:"Competitor",f:2,wc:false,net:250,fmt:"dynasty"},
{nm:"Dirty Laundry",bi:75,p1:550,p2:250,p3:100,px:0,tm:12,ps:6,edge:85.2,arch:"Competitor",f:2,wc:false,net:175,fmt:"dynasty"},
{nm:"DOPE",bi:50,p1:325,p2:200,p3:75,px:0,tm:12,ps:6,edge:94,arch:"Competitor",f:2,wc:false,net:150,fmt:"dynasty"},
{nm:"ManBearPig",bi:60,p1:360,p2:200,p3:60,px:100,tm:12,ps:6,edge:95.7,arch:"Competitor",f:2,wc:false,net:140,fmt:"dynasty"},
{nm:"Joe Buck Yourself",bi:75,p1:405,p2:225,p3:125,px:20,tm:12,ps:6,edge:88.2,arch:"Competitor",f:3,wc:false,net:70,fmt:"dynasty"},
{nm:"This League Fucks",bi:25,p1:200,p2:75,p3:25,px:0,tm:12,ps:6,edge:89.2,arch:"Rebuilder",f:9,wc:false,net:-25,fmt:"dynasty"},
{nm:"Let The Boy Watch",bi:25,p1:550,p2:250,p3:100,px:0,tm:12,ps:6,edge:90.4,arch:"Rebuilder",f:4,wc:false,net:-25,fmt:"dynasty"},
{nm:"SipDhits",bi:40,p1:250,p2:100,p3:50,px:0,tm:10,ps:6,edge:84.6,arch:"Rebuilder",f:9,wc:false,net:-40,fmt:"dynasty"},
{nm:"32 Team Grim Reaper",bi:50,p1:480,p2:240,p3:80,px:0,tm:32,ps:8,edge:49.2,arch:"Competitor",f:4,wc:false,net:-50,fmt:"dynasty"},
{nm:"Cock Gobblers",bi:50,p1:300,p2:150,p3:50,px:100,tm:12,ps:6,edge:88.2,arch:"Competitor",f:5,wc:false,net:-50,fmt:"dynasty"},
{nm:"Hakuna Matata IV",bi:50,p1:600,p2:150,p3:50,px:0,tm:16,ps:8,edge:78.7,arch:"Competitor",f:5,wc:false,net:-50,fmt:"dynasty"},
{nm:"4th and Fantasy",bi:50,p1:400,p2:100,p3:50,px:50,tm:12,ps:6,edge:100.2,arch:"Competitor",f:8,wc:false,net:-50,fmt:"dynasty"},
{nm:"Frantic Football Freaks",bi:50,p1:350,p2:100,p3:50,px:0,tm:10,ps:6,edge:91.8,arch:"Rebuilder",f:9,wc:false,net:-50,fmt:"dynasty"},
{nm:"Baby Daddys",bi:50,p1:400,p2:200,p3:0,px:0,tm:12,ps:6,edge:93.8,arch:"Competitor",f:9,wc:false,net:-50,fmt:"dynasty"},
{nm:"Powder Puff Film Rats",bi:50,p1:675,p2:225,p3:0,px:0,tm:12,ps:6,edge:83.7,arch:"Rebuilder",f:4,wc:false,net:-50,fmt:"dynasty"},
{nm:"Politically Incorrect",bi:75,p1:500,p2:250,p3:150,px:0,tm:12,ps:6,edge:93.5,arch:"Competitor",f:12,wc:false,net:-75,fmt:"dynasty"},
{nm:"Degenerates R Us",bi:75,p1:550,p2:200,p3:100,px:0,tm:12,ps:6,edge:83.8,arch:"Competitor",f:4,wc:false,net:-75,fmt:"dynasty"},
{nm:"Fuck Off Lib",bi:76,p1:600,p2:236,p3:76,px:0,tm:12,ps:6,edge:93,arch:"Competitor",f:7,wc:false,net:-76,fmt:"dynasty"},
{nm:"Spread Eagle",bi:76,p1:550,p2:286,p3:76,px:0,tm:12,ps:6,edge:90.4,arch:"Rebuilder",f:9,wc:false,net:-76,fmt:"dynasty"},
{nm:"Gender Queers",bi:100,p1:800,p2:300,p3:100,px:0,tm:12,ps:6,edge:97.4,arch:"Competitor",f:5,wc:false,net:-100,fmt:"dynasty"},
{nm:"Dirty Blumpkin",bi:100,p1:325,p2:200,p3:75,px:0,tm:12,ps:6,edge:89.3,arch:"Rebuilder",f:10,wc:false,net:-100,fmt:"dynasty"},
{nm:"Rebel Base",bi:100,p1:600,p2:200,p3:100,px:300,tm:12,ps:6,edge:103.1,arch:"Competitor",f:11,wc:false,net:-100,fmt:"dynasty"},
{nm:"Raging Dyno",bi:125,p1:700,p2:500,p3:300,px:0,tm:12,ps:6,edge:94.7,arch:"Rebuilder",f:7,wc:false,net:-125,fmt:"dynasty"},
{nm:"The Trading Post",bi:125,p1:1000,p2:250,p3:125,px:125,tm:12,ps:6,edge:95.4,arch:"Rebuilder",f:4,wc:false,net:-125,fmt:"dynasty"},
{nm:"Blue and Purple",bi:250,p1:1500,p2:900,p3:600,px:45,tm:12,ps:6,edge:85,arch:"Competitor",f:6,wc:false,net:-205,fmt:"redraft"},
{nm:"Toxic Masculinity",bi:300,p1:2000,p2:1000,p3:600,px:0,tm:12,ps:6,edge:96.3,arch:"Competitor",f:4,wc:false,net:-300,fmt:"dynasty"},
{nm:"Reckless Abandon",bi:400,p1:1800,p2:1000,p3:600,px:0,tm:12,ps:6,edge:81.6,arch:"Rebuilder",f:9,wc:false,net:-825,fmt:"dynasty"},
];

// Career history for multi-season leagues
const HIST={
"Farts and Boners":{yr:3,net:1200,ships:1,trend:[300,300,600]},
"D-Core":{yr:2,net:300,ships:1,trend:[-200,500]},
"Even More Dick":{yr:2,net:400,ships:1,trend:[-100,500]},
"Capital Punishment":{yr:2,net:900,ships:1,trend:[600,300]},
"12 Gs":{yr:2,net:550,ships:1,trend:[-200,250]},
"Dirty Laundry":{yr:2,net:25,ships:0,trend:[-150,175]},
"DOPE":{yr:3,net:275,ships:1,trend:[175,-50,150]},
"ManBearPig":{yr:2,net:140,ships:0,trend:[0,140]},
"Joe Buck Yourself":{yr:9,net:-40,ships:0,trend:[-75,275,-75,-75,45,-75,-75,-55,70]},
"This League Fucks":{yr:2,net:35,ships:1,trend:[60,-25]},
"SipDhits":{yr:3,net:-60,ships:0,trend:[-80,60,-40]},
"32 Team Grim Reaper":{yr:2,net:-150,ships:0,trend:[-100,-50]},
"Cock Gobblers":{yr:2,net:-100,ships:0,trend:[-50,-50]},
"Hakuna Matata IV":{yr:3,net:-50,ships:0,trend:[50,-50,-50]},
"Frantic Football Freaks":{yr:4,net:-255,ships:0,trend:[-105,-50,-50,-50]},
"Baby Daddys":{yr:2,net:-100,ships:0,trend:[-50,-50]},
"Politically Incorrect":{yr:2,net:25,ships:0,trend:[100,-75]},
"Fuck Off Lib":{yr:2,net:-151,ships:0,trend:[-75,-76]},
"Spread Eagle":{yr:2,net:-152,ships:0,trend:[-76,-76]},
"Dirty Blumpkin":{yr:2,net:-200,ships:0,trend:[-100,-100]},
"Rebel Base":{yr:2,net:-200,ships:0,trend:[-100,-100]},
"The Trading Post":{yr:2,net:-375,ships:0,trend:[-250,-125]},
"Toxic Masculinity":{yr:3,net:-200,ships:0,trend:[-600,700,-300]},
"Reckless Abandon":{yr:2,net:115,ships:0,trend:[940,-825]},
"Blue and Purple":{yr:7,net:483,ships:1,trend:[638,-200,300,45,125,-220,-205]},
};

const TIERS=["<$50","$50-$99","$100-$199","$200-$299","$300-$499"];
const TC={"<$50":"#6b7280","$50-$99":"#059669","$100-$199":"#2563eb","$200-$299":"#d97706","$300-$499":"#dc2626"};
const SEASONS=[2017,2018,2019,2020,2021,2022,2023,2024,2025];
const fmt=n=>n>=0?"$"+Math.abs(n).toLocaleString():"-$"+Math.abs(n).toLocaleString();

// EV calculation: edge-adjusted probability * payout structure
function calcEV(l){
  const edgeAdj=(l.edge-85)/100;
  const archBoost=l.arch==="Competitor"?0.05:l.arch==="Rebuilder"?-0.05:0;
  const playoffP=Math.min(0.90,Math.max(0.10,l.ps/l.tm+edgeAdj+archBoost));
  // Given playoffs: finish distribution (edge-adjusted)
  const winBoost=Math.max(0,edgeAdj*2);
  const p1=Math.min(0.30,0.12+winBoost);
  const p2=Math.min(0.25,0.15+winBoost*0.5);
  const p3=0.20;
  const evIfPlayoffs=p1*l.p1+p2*l.p2+p3*l.p3;
  const ev=playoffP*evIfPlayoffs+l.px-l.bi;
  const evRoi=l.bi>0?Math.round(ev/l.bi*100):0;
  const be=l.p3>=l.bi?"3rd+":l.p2>=l.bi?"2nd+":"1st only";
  const cashSpots=(l.p1>0?1:0)+(l.p2>0?1:0)+(l.p3>0?1:0);
  const upside=l.bi>0?Math.round(l.p1/l.bi):0;
  return{ev:Math.round(ev),evRoi,playoffP:Math.round(playoffP*100),be,cashSpots,upside,p1:Math.round(p1*100),edgeAdj};
}

function diagnose(l){
  const h=HIST[l.nm];
  const ev=calcEV(l);
  const highEdge=l.edge>=90;
  const comp=l.arch==="Competitor";
  const rebuild=l.arch==="Rebuilder";
  const bigField=l.tm>=16;
  const careerPos=h&&h.net>0;
  const hasShips=h&&h.ships>0;
  const lastUp=h&&h.trend[h.trend.length-1]>0;
  const neverProf=h&&h.trend.every(v=>v<=0);

  // Redraft: only care about payout structure and history
  if(l.fmt==="redraft"){
    if(ev.ev>0)return{v:"GOOD STRUCTURE",c:"#2563eb",bg:"#eff6ff",r:"Redraft league with positive EV ("+fmt(ev.ev)+"). "+ev.cashSpots+" cash spots, "+ev.upside+"x upside on 1st. Payout structure favors entry.",a:"Keep playing. Redraft resets yearly, so roster quality doesn't carry over. Focus on draft prep."};
    return{v:"POOR STRUCTURE",c:"#d97706",bg:"#fffbeb",r:"Redraft with negative EV ("+fmt(ev.ev)+"). Buy-in is high relative to payout probability.",a:"Only play if you enjoy the league. The math doesn't favor it long-term."};
  }

  // Dynasty: career winners are always KEEP
  if(hasShips&&careerPos)return{v:"CORE HOLD",c:"#059669",bg:"#ecfdf5",r:"Career +"+fmt(h.net)+", "+h.ships+" ship"+(h.ships>1?"s":"")+". EV "+fmt(ev.ev)+" ("+ev.evRoi+"%). This league pays you.",a:"Lock it in. "+ev.be+" breakeven makes this forgiving."};

  // Winners mislabeled as Rebuilder
  if(hasShips||l.wc)return{v:"PROVEN",c:"#059669",bg:"#ecfdf5",r:"Won a championship"+(h?" across "+h.yr+" seasons":"")+". EV "+fmt(ev.ev)+". Don't overthink the archetype label.",a:"You've won here before. Keep competing."};

  // High edge + Competitor + positive EV = strong position
  if(highEdge&&comp&&ev.ev>0)return{v:"STRONG",c:"#059669",bg:"#ecfdf5",r:l.edge.toFixed(0)+" edge, Competitor, EV "+fmt(ev.ev)+" ("+ev.evRoi+"%). Roster is built to win and the math favors you.",a:"Core position. One break away from cashing."};

  // High edge + Competitor but negative EV (usually high buy-in)
  if(highEdge&&comp&&ev.ev<=0)return{v:"TURNABLE",c:"#2563eb",bg:"#eff6ff",r:l.edge.toFixed(0)+" edge, Competitor. Roster CAN win but EV is "+fmt(ev.ev)+" because buy-in is steep. "+ev.playoffP+"% playoff probability, "+ev.be+" breakeven.",a:"Stay. Roster justifies the cost. Need a playoff run to cash."};

  // High edge Rebuilder = rebuild working
  if(highEdge&&rebuild)return{v:"PATIENCE",c:"#d97706",bg:"#fffbeb",r:l.edge.toFixed(0)+" edge as Rebuilder means assets are strong. EV "+fmt(ev.ev)+". You're 1-2 moves from contending.",a:"Hold. The rebuild is paying off. Don't sell now."};

  // Structural: big field
  if(bigField)return{v:"STRUCTURAL",c:"#6b7280",bg:"#f8fafc",r:l.tm+"-team field. "+ev.playoffP+"% playoff odds vs 50% in 12-team. EV "+fmt(ev.ev)+".",a:l.bi<=50?"Low cost, keep for fun.":"Consider exiting. The math is brutal."};

  // Never profitable + negative EV + low edge
  if(neverProf&&ev.ev<0&&!highEdge)return{v:"EXIT",c:"#dc2626",bg:"#fef2f2",r:"Never profitable across "+h.yr+" seasons. "+l.edge.toFixed(0)+" edge, EV "+fmt(ev.ev)+". No structural path to winning.",a:"Walk away. Reinvest "+fmt(l.bi)+" in leagues where you compete."};

  // Negative EV + Rebuilder + high buy-in
  if(rebuild&&ev.ev<0&&l.bi>=75)return{v:"SELL OR EXIT",c:"#dc2626",bg:"#fef2f2",r:"Rebuilder at "+fmt(l.bi)+"/yr with "+l.edge.toFixed(0)+" edge. EV "+fmt(ev.ev)+". Roster doesn't justify the cost yet.",a:"Trade aging assets for picks to accelerate, or exit to free up capital."};

  // Competitor trending down
  if(comp&&h&&!lastUp&&h.net<0)return{v:"WATCH",c:"#d97706",bg:"#fffbeb",r:"Competitor but "+h.yr+" seasons, "+h.prof||0+" profitable. EV "+fmt(ev.ev)+". Trending wrong.",a:"One more year. If 2026 is negative, reassess."};

  // Low buy-in rebuild = cheap lottery ticket
  if(rebuild&&l.bi<=50)return{v:"CHEAP HOLD",c:"#6b7280",bg:"#f8fafc",r:"Low-cost Rebuilder ("+fmt(l.bi)+"). EV "+fmt(ev.ev)+". Even if it doesn't hit, the cost is manageable.",a:"Keep as a lottery ticket. The upside ("+ev.upside+"x on 1st) makes it worth the hold."};

  // New league, no history
  if(!h)return{v:"NEW",c:"#6b7280",bg:"#f8fafc",r:"First season. EV "+fmt(ev.ev)+" ("+ev.evRoi+"%). "+ev.be+" breakeven, "+ev.playoffP+"% playoff odds.",a:ev.ev>0?"Structure is favorable. See how year 1 plays out.":"Monitor results. EV is marginal."};

  // Default: mixed signals
  if(ev.ev>0)return{v:"HOLD",c:"#059669",bg:"#ecfdf5",r:"Positive EV ("+fmt(ev.ev)+"). "+l.edge.toFixed(0)+" edge, "+l.arch+". Math says stay.",a:"The numbers favor you even if results haven't shown it yet."};
  return{v:"WATCH",c:"#d97706",bg:"#fffbeb",r:"EV "+fmt(ev.ev)+", "+l.edge.toFixed(0)+" edge. Not clearly worth it, not clearly a lost cause.",a:"Monitor 2026. If still negative after next season, cut."};
}

function AnimNum({value,color,size=22}){const[d,setD]=useState(value);const r=useRef(null);useEffect(()=>{let s=d;const e=value,dur=500,t0=Date.now();const tick=()=>{const p=Math.min(1,(Date.now()-t0)/dur);setD(Math.round(s+(e-s)*(1-Math.pow(1-p,3))));if(p<1)r.current=requestAnimationFrame(tick)};r.current=requestAnimationFrame(tick);return()=>cancelAnimationFrame(r.current)},[value]);return<span style={{fontSize:size,fontWeight:800,color,letterSpacing:"-0.5px"}}>{fmt(d)}</span>}

// Reduced season history data for charts
const SD=[{year:2017,net:125,deployed:175,leagues:2,ships:0},{year:2018,net:625,deployed:225,leagues:3,ships:1},{year:2019,net:2160,deployed:875,leagues:6,ships:3},{year:2020,net:-450,deployed:550,leagues:5,ships:0},{year:2021,net:-265,deployed:985,leagues:8,ships:0},{year:2022,net:-206,deployed:1201,leagues:12,ships:1},{year:2023,net:-484,deployed:2384,leagues:19,ships:2},{year:2024,net:2109,deployed:3511,leagues:33,ships:5},{year:2025,net:488,deployed:3052,leagues:32,ships:4}];

export default function App(){
  const[tab,setTab]=useState("overview");
  const[insightSort,setIS]=useState("ev");
  const[insightFilter,setIF]=useState("all");

  const tBI=L25.reduce((s,l)=>s+l.bi,0),tN=L25.reduce((s,l)=>s+l.net,0),ch=L25.filter(l=>l.wc).length,tot=L25.length;
  const cumD=useMemo(()=>{let r=0;return SD.map(s=>{r+=s.net;return{...s,cum:r}})},[]);
  const tierD=useMemo(()=>TIERS.map(t=>{const tl=L25.filter(l=>l.t===t||TC[t]===TC[l.bi<50?"<$50":l.bi<100?"$50-$99":l.bi<200?"$100-$199":l.bi<300?"$200-$299":"$300-$499"]);return null}).filter(Boolean),[]);

  // Diagnosed leagues
  const allDx=useMemo(()=>{
    return L25.map(l=>{const ev=calcEV(l);const dx=diagnose(l);const h=HIST[l.nm];return{...l,ev,dx,h}}).sort((a,b)=>{
      if(insightSort==="ev")return b.ev.ev-a.ev.ev;
      if(insightSort==="edge")return(b.edge||0)-(a.edge||0);
      if(insightSort==="net")return b.net-a.net;
      if(insightSort==="buyin")return b.bi-a.bi;
      return 0;
    });
  },[insightSort]);

  const filtered=insightFilter==="all"?allDx:allDx.filter(l=>l.dx.v===insightFilter);
  const verdicts=useMemo(()=>{const m={};allDx.forEach(l=>{m[l.dx.v]=(m[l.dx.v]||0)+1});return m},[allDx]);
  const posEV=allDx.filter(l=>l.ev.ev>0);
  const negEV=allDx.filter(l=>l.ev.ev<=0);

  const ttS={background:"#fff",border:"1px solid #e5e7eb",borderRadius:8,fontSize:11,color:"#1e293b",boxShadow:"0 4px 12px rgba(0,0,0,0.08)"};
  const P={background:"#f8fafc",borderRadius:10,padding:"16px 18px",border:"0.5px solid #f1f5f9"};
  const PT={fontSize:10,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.5px",fontWeight:600,marginBottom:10};

  return(
    <div style={{minHeight:"100vh",background:"#fff",color:"#0f172a",fontFamily:"system-ui,-apple-system,sans-serif"}}>
      <div style={{maxWidth:1100,margin:"0 auto",padding:"24px 20px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h1 style={{fontSize:20,fontWeight:800,margin:0}}>League P&L</h1>
          <div style={{display:"flex",gap:2,background:"#f1f5f9",borderRadius:8,padding:2}}>
            {["overview","leagues","insights"].map(t=>(<button key={t} onClick={()=>setTab(t)} style={{padding:"6px 14px",borderRadius:6,fontSize:11,fontWeight:600,border:"none",cursor:"pointer",background:tab===t?"#fff":"transparent",color:tab===t?"#0f172a":"#64748b",boxShadow:tab===t?"0 1px 2px rgba(0,0,0,0.06)":"none",textTransform:"capitalize"}}>{t}</button>))}
          </div>
        </div>

        <div style={{display:"flex",padding:"14px 0",marginBottom:20,borderTop:"1px solid #f1f5f9",borderBottom:"1px solid #f1f5f9"}}>
          {[{l:"Deployed",v:tBI,c:"#0f172a"},{l:"Net (2025)",v:tN,c:tN>=0?"#059669":"#dc2626"},{l:"Ships",c:"#d97706",raw:ch},{l:"ROI",c:"#2563eb",raw:Math.round(tN/tBI*100)+"%"},{l:"Leagues",c:"#0f172a",raw:tot}].map((m,i)=>(
            <div key={i} style={{flex:1,textAlign:"center",borderRight:i<4?"1px solid #f1f5f9":"none"}}>
              {m.raw!==undefined?<span style={{fontSize:22,fontWeight:800,color:m.c}}>{m.raw}</span>:<AnimNum value={m.v} color={m.c}/>}
              <div style={{fontSize:9,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.5px",marginTop:2}}>{m.l}</div>
            </div>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab==="overview"&&(<div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            <div style={P}><div style={PT}>Season P&L (career)</div><ResponsiveContainer width="100%" height={180}><BarChart data={SD}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis dataKey="year" tick={{fill:"#94a3b8",fontSize:9}}/><YAxis tick={{fill:"#94a3b8",fontSize:9}} tickFormatter={v=>v>=0?"$"+(v/1000).toFixed(1)+"k":"-$"+(Math.abs(v)/1000).toFixed(1)+"k"}/><Tooltip contentStyle={ttS} formatter={v=>[fmt(v),"Net"]}/><Bar dataKey="net" radius={[4,4,0,0]}>{SD.map((e,i)=><Cell key={i} fill={e.net>=0?"#059669":"#dc2626"}/>)}</Bar></BarChart></ResponsiveContainer></div>
            <div style={P}><div style={PT}>Cumulative P&L</div><ResponsiveContainer width="100%" height={180}><AreaChart data={cumD}><defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#059669" stopOpacity={0.15}/><stop offset="100%" stopColor="#059669" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis dataKey="year" tick={{fill:"#94a3b8",fontSize:9}}/><YAxis tick={{fill:"#94a3b8",fontSize:9}} tickFormatter={v=>"$"+(v/1000).toFixed(1)+"k"}/><Tooltip contentStyle={ttS} formatter={v=>[fmt(v),"Total"]}/><Area type="monotone" dataKey="cum" stroke="#059669" fill="url(#cg)" strokeWidth={2} dot={{fill:"#059669",r:3}}/></AreaChart></ResponsiveContainer></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <div style={P}><div style={PT}>Scale vs profit</div><ResponsiveContainer width="100%" height={180}><ComposedChart data={SD}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis dataKey="year" tick={{fill:"#94a3b8",fontSize:9}}/><YAxis yAxisId="l" tick={{fill:"#2563eb",fontSize:9}}/><YAxis yAxisId="r" orientation="right" tick={{fill:"#059669",fontSize:9}} tickFormatter={v=>fmt(v)}/><Tooltip contentStyle={ttS}/><Bar yAxisId="l" dataKey="leagues" fill="#2563eb" opacity={0.2} radius={[3,3,0,0]} name="Leagues"/><Line yAxisId="r" type="monotone" dataKey="net" stroke="#059669" strokeWidth={2} dot={{fill:"#059669",r:3}} name="Net"/></ComposedChart></ResponsiveContainer></div>
            <div style={P}>
              <div style={PT}>2025 EV distribution</div>
              <div style={{fontSize:11,color:"#64748b",marginBottom:8}}>{posEV.length} leagues with positive EV, {negEV.length} negative</div>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={allDx.sort((a,b)=>b.ev.ev-a.ev.ev)} margin={{left:0,right:0}}>
                  <XAxis dataKey="nm" tick={false}/><YAxis tick={{fill:"#94a3b8",fontSize:9}} tickFormatter={v=>fmt(v)}/>
                  <Tooltip contentStyle={ttS} formatter={(v,n,p)=>[fmt(v),p.payload.nm]} labelFormatter={()=>""}/>
                  <Bar dataKey="ev.ev" radius={[2,2,0,0]}>{allDx.sort((a,b)=>b.ev.ev-a.ev.ev).map((e,i)=><Cell key={i} fill={e.ev.ev>=0?"#059669":"#dc2626"} opacity={0.7}/>)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>)}

        {/* LEAGUES */}
        {tab==="leagues"&&(<div style={{borderRadius:10,overflow:"hidden",border:"0.5px solid #e5e7eb",overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:750}}><thead><tr style={{background:"#f8fafc"}}>{["#","League","Format","Buy","Edge","Arch","Fin","EV","Verdict","Net"].map((h,i)=>(<th key={i} style={{padding:"7px 8px",textAlign:i<=1?"left":"center",fontSize:9,color:"#94a3b8",textTransform:"uppercase",fontWeight:600}}>{h}</th>))}</tr></thead><tbody>{[...allDx].sort((a,b)=>b.net-a.net).map((l,i)=>(<tr key={i} style={{borderTop:"1px solid #f5f5f5",background:l.wc?"#fffbeb":"#fff"}}><td style={{padding:"7px 8px",color:"#94a3b8",fontSize:9}}>{i+1}</td><td style={{padding:"7px 8px",fontWeight:600,fontSize:12}}>{l.nm}{l.wc?" \u{1F3C6}":""}</td><td style={{padding:"7px 8px",textAlign:"center"}}><span style={{fontSize:8,padding:"1px 6px",borderRadius:8,background:l.fmt==="redraft"?"#dbeafe":"#f0fdf4",color:l.fmt==="redraft"?"#2563eb":"#059669",fontWeight:600}}>{l.fmt}</span></td><td style={{padding:"7px 8px",textAlign:"center",fontWeight:600}}>{fmt(l.bi)}</td><td style={{padding:"7px 8px",textAlign:"center",fontSize:10,fontWeight:700,color:l.edge>=90?"#059669":l.edge>=80?"#d97706":"#dc2626"}}>{l.edge.toFixed(0)}</td><td style={{padding:"7px 8px",textAlign:"center"}}><span style={{fontSize:8,padding:"1px 5px",borderRadius:6,background:l.arch==="Competitor"?"#f0fdf4":"#fef2f2",color:l.arch==="Competitor"?"#059669":"#dc2626",fontWeight:600}}>{l.arch}</span></td><td style={{padding:"7px 8px",textAlign:"center",fontWeight:600,color:l.f===1?"#d97706":"#64748b"}}>{!l.f?"?":l.f<=3?["1st","2nd","3rd"][l.f-1]:l.f+"th"}</td><td style={{padding:"7px 8px",textAlign:"center",fontWeight:700,fontSize:10,color:l.ev.ev>=0?"#059669":"#dc2626"}}>{fmt(l.ev.ev)}</td><td style={{padding:"7px 8px",textAlign:"center"}}><span style={{fontSize:8,padding:"2px 6px",borderRadius:8,background:l.dx.c+"15",color:l.dx.c,fontWeight:700}}>{l.dx.v}</span></td><td style={{padding:"7px 8px",textAlign:"center",fontWeight:700,color:l.net>0?"#059669":l.net===0?"#94a3b8":"#dc2626"}}>{(l.net>0?"+":"")+fmt(l.net)}</td></tr>))}</tbody></table></div>)}

        {/* INSIGHTS */}
        {tab==="insights"&&(<div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:16}}>
            <div style={{padding:"14px 18px",background:"#ecfdf5",borderRadius:10,border:"1px solid #bbf7d0"}}>
              <div style={{fontSize:10,fontWeight:700,color:"#065f46"}}>Positive EV leagues</div>
              <div style={{fontSize:22,fontWeight:800,color:"#059669"}}>{posEV.length}</div>
              <div style={{fontSize:10,color:"#059669"}}>Avg EV: {fmt(Math.round(posEV.reduce((s,l)=>s+l.ev.ev,0)/Math.max(posEV.length,1)))}</div>
            </div>
            <div style={{padding:"14px 18px",background:"#fef2f2",borderRadius:10,border:"1px solid #fecaca"}}>
              <div style={{fontSize:10,fontWeight:700,color:"#991b1b"}}>Negative EV leagues</div>
              <div style={{fontSize:22,fontWeight:800,color:"#dc2626"}}>{negEV.length}</div>
              <div style={{fontSize:10,color:"#dc2626"}}>Bleeding: {fmt(Math.abs(negEV.reduce((s,l)=>s+l.ev.ev,0)))}/yr in expected losses</div>
            </div>
            <div style={{padding:"14px 18px",background:"#eff6ff",borderRadius:10,border:"1px solid #bfdbfe"}}>
              <div style={{fontSize:10,fontWeight:700,color:"#1e40af"}}>Portfolio EV</div>
              <div style={{fontSize:22,fontWeight:800,color:allDx.reduce((s,l)=>s+l.ev.ev,0)>=0?"#059669":"#dc2626"}}>{fmt(allDx.reduce((s,l)=>s+l.ev.ev,0))}</div>
              <div style={{fontSize:10,color:"#2563eb"}}>Expected annual return across all 32 leagues</div>
            </div>
          </div>

          <div style={{display:"flex",gap:4,marginBottom:10,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{fontSize:10,color:"#94a3b8",fontWeight:600}}>Filter:</span>
            {["all","CORE HOLD","PROVEN","STRONG","TURNABLE","HOLD","PATIENCE","CHEAP HOLD","NEW","GOOD STRUCTURE","WATCH","STRUCTURAL","SELL OR EXIT","EXIT","POOR STRUCTURE"].filter(v=>v==="all"||verdicts[v]).map(v=>(
              <button key={v} onClick={()=>setIF(v)} style={{padding:"3px 10px",borderRadius:14,fontSize:9,fontWeight:600,border:insightFilter===v?"1.5px solid #0f172a":"1px solid #e5e7eb",background:insightFilter===v?"#0f172a":"#fff",color:insightFilter===v?"#fff":"#64748b",cursor:"pointer"}}>{v==="all"?"All":v} {verdicts[v]?"("+verdicts[v]+")":""}</button>
            ))}
          </div>
          <div style={{display:"flex",gap:4,marginBottom:14,alignItems:"center"}}>
            <span style={{fontSize:10,color:"#94a3b8",fontWeight:600}}>Sort:</span>
            {[["ev","Expected Value"],["edge","Edge Score"],["net","2025 Result"],["buyin","Buy-In"]].map(([k,l])=>(
              <button key={k} onClick={()=>setIS(k)} style={{padding:"3px 10px",borderRadius:14,fontSize:9,fontWeight:600,border:insightSort===k?"1.5px solid #0f172a":"1px solid #e5e7eb",background:insightSort===k?"#0f172a":"#fff",color:insightSort===k?"#fff":"#64748b",cursor:"pointer"}}>{l}</button>
            ))}
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {filtered.map(l=>{const ev=l.ev;const dx=l.dx;const h=l.h;return(
              <div key={l.nm} style={{padding:"12px 16px",background:dx.bg,borderRadius:8,border:"0.5px solid "+dx.c+"25",borderLeft:"3px solid "+dx.c}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                      <span style={{fontSize:14,fontWeight:800}}>{l.nm}</span>
                      <span style={{fontSize:8,padding:"2px 7px",borderRadius:10,background:dx.c+"20",color:dx.c,fontWeight:700}}>{dx.v}</span>
                      <span style={{fontSize:8,padding:"1px 6px",borderRadius:8,background:l.fmt==="redraft"?"#dbeafe":"#f0fdf4",color:l.fmt==="redraft"?"#2563eb":"#059669",fontWeight:600}}>{l.fmt}</span>
                      {l.arch&&<span style={{fontSize:8,padding:"1px 5px",borderRadius:6,background:"#f1f5f9",color:"#64748b",fontWeight:600}}>{l.arch}</span>}
                    </div>
                    <div style={{fontSize:10,color:"#64748b",marginTop:4}}>
                      {fmt(l.bi)}/yr, {l.edge.toFixed(0)} edge, {ev.playoffP}% playoff odds, {ev.be} breakeven, {ev.upside}x upside{h?", "+h.yr+" seasons":""}
                    </div>
                    <div style={{fontSize:11,color:dx.c,fontWeight:600,marginTop:4}}>{dx.r}</div>
                    <div style={{fontSize:10,color:"#64748b",fontStyle:"italic",marginTop:2}}>{dx.a}</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:16,fontWeight:800,color:l.net>=0?"#059669":"#dc2626"}}>{(l.net>0?"+":"")+fmt(l.net)}</div>
                    <div style={{fontSize:9,color:ev.ev>=0?"#059669":"#dc2626",fontWeight:700,marginTop:2}}>EV: {fmt(ev.ev)}</div>
                    <div style={{fontSize:8,color:"#94a3b8"}}>{fmt(l.bi)}/yr</div>
                    {h&&<div style={{display:"flex",gap:2,marginTop:4,justifyContent:"flex-end"}}>{h.trend.map((v,i)=>(<div key={i} style={{width:14,height:8,borderRadius:2,background:v>0?"#059669":v<0?"#dc2626":"#d1d5db",opacity:i===h.trend.length-1?1:0.5}}/>))}</div>}
                  </div>
                </div>
              </div>
            )})}
          </div>
        </div>)}
      </div>
    </div>
  );
}
