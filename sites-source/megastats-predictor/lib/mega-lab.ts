export type Draw = { drawDate: string; white: number[]; mega: number };
export const FORMAT_START = "2025-04-08";
const WHITE_MAX = 70;
const MEGA_MAX = 24;
const STRATEGIES = ["MegaStats Blend", "Hot", "Cold", "Overdue", "Momentum", "Pair / Cluster", "Balanced", "Anti-Crowd", "Pure Random"] as const;
type Strategy = (typeof STRATEGIES)[number];
type Line = { white: number[]; mega: number };
type Metric = { draws: number; whiteHits: number; megaHits: number; hit2: number; hit3: number; hit4: number; hit5: number; avgWhite: number; avgMega: number; avgSignal: number };
const avg = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
function hash(s: string) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
function rng(seed: number) { let x = seed || 1; return () => ((x = (Math.imul(1664525, x) + 1013904223) >>> 0) / 4294967296); }
function cleanDraws(draws: Draw[]) { return draws.filter(d => d.drawDate >= FORMAT_START && d.white.length === 5 && new Set(d.white).size === 5 && d.white.every(n => n >= 1 && n <= WHITE_MAX) && d.mega >= 1 && d.mega <= MEGA_MAX).sort((a,b) => a.drawDate.localeCompare(b.drawDate)); }
function frequency(draws: Draw[], max: number, field: "white" | "mega") {
  const counts = Array(max + 1).fill(0);
  for (const draw of draws) for (const n of field === "white" ? draw.white : [draw.mega]) counts[n]++;
  return counts;
}
function gaps(draws: Draw[]) {
  const intervals: number[][] = Array.from({length: WHITE_MAX + 1}, () => []);
  const positions: number[][] = Array.from({length: WHITE_MAX + 1}, () => []);
  draws.forEach((d, i) => d.white.forEach(n => positions[n].push(i)));
  const current = Array(WHITE_MAX + 1).fill(draws.length);
  const medians = Array(WHITE_MAX + 1).fill(0);
  for (let n = 1; n <= WHITE_MAX; n++) {
    const ps = positions[n];
    if (ps.length) current[n] = draws.length - 1 - ps.at(-1)!;
    const gs = ps.slice(1).map((p, i) => p - ps[i]); intervals[n] = gs;
    const sorted = [...gs].sort((a,b) => a-b); medians[n] = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  }
  return { current, medians, intervals };
}
function stats(draws: Draw[]) {
  const white = frequency(draws, WHITE_MAX, "white"), mega = frequency(draws, MEGA_MAX, "mega"), g = gaps(draws);
  const recent = draws.slice(-10), prior = draws.slice(-50, -10);
  const r = frequency(recent, WHITE_MAX, "white"), p = frequency(prior, WHITE_MAX, "white");
  const momentum = Array.from({length: WHITE_MAX}, (_, i) => i + 1).map(n => ({ number:n, recent:r[n], prior40:p[n], change:+(r[n]/Math.max(1,recent.length) - p[n]/Math.max(1,prior.length)).toFixed(3), currentGap:g.current[n], medianGap:g.medians[n], gapPercentile:g.intervals[n].length?Math.round(g.intervals[n].filter(x=>x<=g.current[n]).length/g.intervals[n].length*100):0 }));
  const pairs = new Map<string, number>(), triples = new Map<string, number>();
  for (const d of draws) {
    for (let i=0;i<5;i++) for(let j=i+1;j<5;j++) { const k=`${d.white[i]}-${d.white[j]}`; pairs.set(k,(pairs.get(k)||0)+1); for(let z=j+1;z<5;z++){const t=`${d.white[i]}-${d.white[j]}-${d.white[z]}`;triples.set(t,(triples.get(t)||0)+1)} }
  }
  const pairExpected = draws.length * 10 / 2415, tripleExpected = draws.length * 10 / 54740;
  const top = (m:Map<string,number>, expected:number) => [...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8).map(([numbers,count])=>({numbers,count,expected:+expected.toFixed(2),lift:expected?+(count/expected).toFixed(2):0}));
  const sums=draws.map(d=>d.white.reduce((a,b)=>a+b,0));
  const odd=draws.map(d=>d.white.filter(n=>n%2===1).length), low=draws.map(d=>d.white.filter(n=>n<=35).length);
  const consecutive=draws.map(d=>d.white.slice(1).filter((n,i)=>n===d.white[i]+1).length);
  const decades=draws.map(d=>new Set(d.white.map(n=>Math.floor((n-1)/10))).size);
  const spacing=draws.flatMap(d=>d.white.slice(1).map((n,i)=>n-d.white[i]));
  const dist=(xs:number[])=>Object.entries(xs.reduce<Record<string,number>>((o,n)=>{const k=String(n);o[k]=(o[k]||0)+1;return o},{})).map(([label,count])=>({label,count,percent:+(count/Math.max(1,xs.length)*100).toFixed(1)})).sort((a,b)=>+a.label-+b.label);
  return {
    counts:{white,mega}, momentum:momentum.sort((a,b)=>b.change-a.change),
    gapLeaders:[...momentum].sort((a,b)=>b.currentGap-a.currentGap).slice(0,10),
    gapSummary:{typical:avg(Object.values(g.medians).filter(Boolean)),currentMax:Math.max(...g.current.slice(1)),descriptive:true},
    pairs:top(pairs,pairExpected), triples:top(triples,tripleExpected),
    shape:{draws:draws.length,meanSum:+avg(sums).toFixed(1),sumRange:[Math.min(...sums),Math.max(...sums)],odd:dist(odd),lowHigh:dist(low),consecutive:dist(consecutive),decades:dist(decades),meanSpacing:+avg(spacing).toFixed(1)},
    rolling:[10,25,50,100].map(size=>({size,draws:Math.min(size,draws.length),white:frequency(draws.slice(-size),WHITE_MAX,"white"),mega:frequency(draws.slice(-size),MEGA_MAX,"mega")})).concat([{size:0,draws:draws.length,white,mega}])
  };
}
function choose(weights:number[], count:number, random:()=>number) {
  const out:number[]=[];
  while(out.length<count){const pool=weights.map((w,n)=>({n,w:!n||out.includes(n)?0:Math.max(.00001,w)}));let x=random()*pool.reduce((s,p)=>s+p.w,0);out.push((pool.find(p=>(x-=p.w)<=0)||pool.at(-1)!).n)}
  return out.sort((a,b)=>a-b);
}
function buildLine(history:Draw[], strategy:Strategy, seed:number, candidates=65):Line {
  const random=rng(seed), h=cleanDraws(history), counts=frequency(h.slice(-50),WHITE_MAX,"white"), all=frequency(h,WHITE_MAX,"white"), megaCounts=frequency(h,MEGA_MAX,"mega"), g=gaps(h), last=frequency(h.slice(-10),WHITE_MAX,"white"), prior=frequency(h.slice(-50,-10),WHITE_MAX,"white");
  const pair=new Map<string,number>(); for(const d of h.slice(-80)) for(let i=0;i<5;i++)for(let j=i+1;j<5;j++){const k=`${d.white[i]}-${d.white[j]}`;pair.set(k,(pair.get(k)||0)+1)}
  const meanSum=avg(h.slice(-50).map(d=>d.white.reduce((a,b)=>a+b,0)))||177;
  const weights=Array.from({length:71},(_,n)=>{if(!n)return 0;const rate=counts[n]/Math.max(1,Math.min(50,h.length)),momentum=last[n]/10-prior[n]/40,gap=g.current[n]/Math.max(1,g.medians[n]||8);switch(strategy){case"MegaStats Blend":return .7+rate*5+Math.max(0,momentum)*1.5+Math.min(2,gap)*.22;case"Hot":return 0.25+rate*12;case"Cold":return 0.5+(1-rate)*1.8;case"Overdue":return 0.5+Math.min(3,gap);case"Momentum":return Math.max(.05,1+momentum*4);case"Pair / Cluster":return .6+all[n]/Math.max(1,h.length)*3;case"Balanced":return 1;case"Anti-Crowd":return n>31?1.7:0.55;case"Pure Random":return 1}});
  const score=(line:number[])=>{
    const total=line.reduce((a,b)=>a+b,0),odd=line.filter(n=>n%2).length,low=line.filter(n=>n<=35).length;
    let pairScore=0;for(let i=0;i<line.length;i++)for(let j=i+1;j<line.length;j++)pairScore+=pair.get(`${line[i]}-${line[j]}`)||0;
    let s=0;
    if(strategy==="Balanced"||strategy==="MegaStats Blend")s-=Math.abs(total-meanSum)/15+Math.abs(odd-2.5)*.7+Math.abs(low-2.5)*.7;
    if(strategy==="Pair / Cluster")s+=pairScore*.35;
    if(strategy==="Anti-Crowd") {s+=line.filter(n=>n>31).length*1.5-Math.max(0,line.filter(n=>n<=31).length-1)*1.2;for(let i=1;i<line.length;i++)if(line[i]===line[i-1]+1)s-=1.8;s-=Math.abs(odd-2.5)*.35;}
    if(strategy==="Hot")s+=line.reduce((a,n)=>a+counts[n],0)*.18;
    if(strategy==="Cold")s-=line.reduce((a,n)=>a+counts[n],0)*.08;
    if(strategy==="Overdue")s+=line.reduce((a,n)=>a+Math.min(g.current[n],30)/30,0)*.12;
    if(strategy==="Momentum")s+=line.reduce((a,n)=>a+(last[n]/10-prior[n]/40),0)*.2;
    if(strategy==="MegaStats Blend")s+=line.reduce((a,n)=>a+counts[n]*.12+(last[n]/10-prior[n]/40)*.25+Math.min(g.current[n],20)/20*.08,0);
    return s;
  };
  let best:number[]=[];let bestScore=-Infinity;
  for(let i=0;i<candidates;i++){const line=choose(weights,5,random),v=score(line)+(random()-.5)*.08;if(v>bestScore){best=line;bestScore=v}}
  return {white:best,mega:choose(megaCounts.map((n,i)=>i?n+1:0),1,random)[0]||1};
}
function randomLine(seed:number):Line {const r=rng(seed);return{white:choose(Array.from({length:71},(_,n)=>n?1:0),5,r),mega:1+Math.floor(r()*24)}}
function grade(line:Line, draw:Draw) {const w=line.white.filter(n=>draw.white.includes(n)).length,m=+(line.mega===draw.mega);return{w,m,signal:w+m*1.5}}
function summarize(records:Array<{w:number;m:number;signal:number}>):Metric {
  const len=records.length;return{draws:len,whiteHits:records.reduce((s,r)=>s+r.w,0),megaHits:records.reduce((s,r)=>s+r.m,0),hit2:records.filter(r=>r.w>=2).length,hit3:records.filter(r=>r.w>=3).length,hit4:records.filter(r=>r.w>=4).length,hit5:records.filter(r=>r.w===5).length,avgWhite:+avg(records.map(r=>r.w)).toFixed(3),avgMega:+avg(records.map(r=>r.m)).toFixed(3),avgSignal:+avg(records.map(r=>r.signal)).toFixed(3)};
}
function backtest(draws:Draw[]) {
  const start=Math.max(25,draws.length-100), tests=draws.slice(start), measures=new Map<string,Array<{w:number;m:number;signal:number}>>(STRATEGIES.map(s=>[s,[]]));
  const randomRuns=new Map<string,number[]>([["avgWhite",[]],["avgMega",[]],["avgSignal",[]],["hit2",[]],["hit3",[]],["hit4",[]],["hit5",[]]]);
  for(let i=start;i<draws.length;i++){
    const draw=draws[i], training=draws.slice(0,i), seed=hash(`walk-${draw.drawDate}-v1`);
    for(const [si,strategy] of STRATEGIES.entries()) { const line=strategy==="Pure Random"?randomLine(seed+si):buildLine(training,strategy,seed+si,45);measures.get(strategy)!.push(grade(line,draw)); }
    const results=Array.from({length:50},(_,j)=>grade(randomLine(seed+5000+j),draw));
    const one=summarize(results);for(const [k,v] of Object.entries({avgWhite:one.avgWhite,avgMega:one.avgMega,avgSignal:one.avgSignal,hit2:one.hit2,hit3:one.hit3,hit4:one.hit4,hit5:one.hit5}))randomRuns.get(k)!.push(v);
  }
  return {testedDraws:tests.length,firstDraw:tests[0]?.drawDate||null,lastDraw:tests.at(-1)?.drawDate||null,random:summarize(tests.flatMap((d,i)=>Array.from({length:50},(_,j)=>grade(randomLine(hash(`walk-${d.drawDate}-v1`)+5000+j),d)))),runsPerDraw:50,leaderboard:STRATEGIES.map(strategy=>({strategy,...summarize(measures.get(strategy)!),versusRandomWhite:+(summarize(measures.get(strategy)!).avgWhite-avg(randomRuns.get("avgWhite")!)).toFixed(3),versusRandom2plus:+(summarize(measures.get(strategy)!).hit2-avg(randomRuns.get("hit2")!)).toFixed(2),label:"Historical sample only"}))};
}
function portfolio(history:Draw[],strategy:Strategy,count:number,seed:number) {
  const selected:Line[]=[],r=rng(seed);for(let i=0;i<count;i++){
    let best:Line|undefined,bestScore=-Infinity;
    for(let j=0;j<120;j++){const candidate=buildLine(history,strategy,Math.floor(r()*0xffffffff),28);const overlap=selected.reduce((s,x)=>s+candidate.white.filter(n=>x.white.includes(n)).length+(candidate.mega===x.mega?1:0),0),score=candidate.white.filter(n=>!selected.some(x=>x.white.includes(n))).length-overlap*1.3+(r()-.5)*.2;if(score>bestScore){best=candidate;bestScore=score}}
    selected.push(best!);
  }
  return selected;
}
export function buildLab(draws:Draw[]) {
  const history=cleanDraws(draws),analytics=stats(history),bt=backtest(history);
  return {formatStart:FORMAT_START,drawCount:history.length,firstDraw:history[0]?.drawDate||null,lastDraw:history.at(-1)?.drawDate||null,analytics,backtest:bt,strategyNames:STRATEGIES};
}
export function generatePortfolio(draws:Draw[], strategy:string, lines:number) {
  const safe=(STRATEGIES as readonly string[]).includes(strategy)?strategy as Strategy:"Balanced";
  return portfolio(cleanDraws(draws),safe,Math.max(1,Math.min(10,lines)),hash(`${safe}-${Date.now()}`));
}
