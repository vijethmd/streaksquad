import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// Color scales
const BOOL_COLORS  = ['#2a2a35','#1a3a28','#1f6035','#26a641','#39d353']; // empty,l1,l2,l3,l4
const getAmountColor = (val, max) => {
  if(!val||val===0) return '#2a2a35';
  const pct = Math.min(val/max,1);
  if(pct<0.25) return '#0e4429';
  if(pct<0.5)  return '#006d32';
  if(pct<0.75) return '#26a641';
  return '#39d353';
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_LABELS = ['','Mon','','Wed','','Fri',''];

// Build all dates in a range
const buildDateRange = (startStr, endStr) => {
  const dates = [];
  const cur = new Date(startStr);
  const end = new Date(endStr);
  while(cur<=end){
    dates.push(cur.toISOString().slice(0,10));
    cur.setDate(cur.getDate()+1);
  }
  return dates;
};

// Pad start to Sunday
const padToSunday = (dates) => {
  if(!dates.length) return [];
  const first = new Date(dates[0]);
  const dow = first.getDay(); // 0=Sun
  const padded = [];
  for(let i=dow;i>0;i--){
    const d=new Date(first); d.setDate(first.getDate()-i);
    padded.push({ dateKey: d.toISOString().slice(0,10), pad:true });
  }
  dates.forEach(d=>padded.push({dateKey:d,pad:false}));
  return padded;
};

// Group into weeks of 7
const toWeeks = (paddedDates) => {
  const weeks=[];
  for(let i=0;i<paddedDates.length;i+=7) weeks.push(paddedDates.slice(i,i+7));
  return weeks;
};

const StreakCalendar = ({ squadId, userId, goalType, goalTarget, goalUnit }) => {
  const [heatmap,    setHeatmap]    = useState({});
  const [firstDate,  setFirstDate]  = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [tooltip,    setTooltip]    = useState(null);
  const [tooltipPos, setTooltipPos] = useState({x:0,y:0});
  const [year,       setYear]       = useState(new Date().getFullYear());
  const [maxAmount,  setMaxAmount]  = useState(1);
  const containerRef = useRef(null);

  const isAmount = goalType === 'amount';
  const today = new Date().toISOString().slice(0,10);
  const currentYear = new Date().getFullYear();

  // Years available — from first checkin year to current year
  const firstYear = firstDate ? parseInt(firstDate.slice(0,4)) : currentYear;
  const years = [];
  for(let y=currentYear;y>=firstYear;y--) years.push(y);

  useEffect(()=>{
    setLoading(true);
    axios.get(`/api/streaks/heatmap/${squadId}/${userId}?year=${year}`)
      .then(res=>{
        setHeatmap(res.data.heatmap||{});
        if(res.data.firstDate) setFirstDate(res.data.firstDate);
        // Compute max amount for color scaling
        if(isAmount){
          const vals = Object.values(res.data.heatmap||{}).map(v=>v.amountLogged||0);
          setMaxAmount(Math.max(...vals,goalTarget||1,1));
        }
      })
      .catch(console.error)
      .finally(()=>setLoading(false));
  },[squadId,userId,year]);

  // Build date range for selected year
  const startStr = `${year}-01-01`;
  const endStr   = year===currentYear ? today : `${year}-12-31`;
  const allDates = buildDateRange(startStr, endStr);
  const padded   = padToSunday(allDates);
  const weeks    = toWeeks(padded);

  // Stats
  const checkedDays = Object.keys(heatmap).length;
  const maxStreak   = (() => { let m=0,c=0; allDates.forEach(d=>{if(heatmap[d]){c++;m=Math.max(m,c);}else c=0;}); return m; })();
  const totalAmount = isAmount ? Object.values(heatmap).reduce((s,v)=>s+(v.amountLogged||0),0) : 0;

  // Month label positions — find first week index where month changes
  const monthLabels = [];
  weeks.forEach((week,wi)=>{
    const firstReal = week.find(d=>!d.pad);
    if(!firstReal) return;
    const d = new Date(firstReal.dateKey);
    const prevWeek = weeks[wi-1];
    const prevReal = prevWeek?.find(dd=>!dd.pad);
    const prevMonth = prevReal ? new Date(prevReal.dateKey).getMonth() : -1;
    if(d.getMonth()!==prevMonth || wi===0){
      monthLabels.push({ wi, label: MONTHS[d.getMonth()] });
    }
  });

  const getCellColor = (dateKey, data) => {
    if(!data) return '#161b22';
    if(isAmount) return getAmountColor(data.amountLogged, maxAmount);
    return data.completed ? '#39d353' : '#2a2a35';
  };

  const handleMouseEnter = (e, dateKey, data) => {
    const rect = containerRef.current?.getBoundingClientRect();
    const cellRect = e.target.getBoundingClientRect();
    setTooltipPos({
      x: cellRect.left - (rect?.left||0) + cellRect.width/2,
      y: cellRect.top  - (rect?.top||0)  - 8
    });
    setTooltip({ dateKey, data });
  };

  if(loading) return <div className="loading-state">Loading calendar...</div>;

  return (
    <div className="streak-calendar" ref={containerRef}>
      {/* Stats row */}
      <div className="cal-stats-row">
        <div className="cal-stat-item">
          <span className="cal-stat-val">{checkedDays}</span>
          <span className="cal-stat-lbl">days active in {year}</span>
        </div>
        <div className="cal-stat-item">
          <span className="cal-stat-val">{maxStreak}</span>
          <span className="cal-stat-lbl">longest run</span>
        </div>
        {isAmount && (
          <div className="cal-stat-item">
            <span className="cal-stat-val">{totalAmount.toLocaleString()}</span>
            <span className="cal-stat-lbl">total {goalUnit||'units'}</span>
          </div>
        )}
        {/* Year selector */}
        <div className="cal-year-selector">
          {years.map(y=>(
            <button key={y} className={`cal-year-btn ${year===y?'active':''}`} onClick={()=>setYear(y)}>
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="cal-grid-wrap">
        {/* Day labels */}
        <div className="cal-day-labels">
          {DAY_LABELS.map((l,i)=><span key={i} className="cal-day-label">{l}</span>)}
        </div>
        <div className="cal-grid-right">
          {/* Month labels */}
          <div className="cal-month-labels">
            {weeks.map((_,wi)=>{
              const ml = monthLabels.find(m=>m.wi===wi);
              return <div key={wi} className="cal-month-slot">{ml?ml.label:''}</div>;
            })}
          </div>
          {/* Cells */}
          <div className="cal-weeks">
            {weeks.map((week,wi)=>(
              <div key={wi} className="cal-week">
                {week.map((cell,di)=>{
                  if(cell.pad) return <div key={di} className="cal-cell pad" />;
                  const data   = heatmap[cell.dateKey];
                  const isToday = cell.dateKey===today;
                  const isFuture= cell.dateKey>today;
                  return (
                    <div key={di}
                      className={`cal-cell ${isToday?'today':''} ${isFuture?'future':''}`}
                      style={{ background: isFuture ? '#2a2a35' : getCellColor(cell.dateKey,data), opacity: isFuture?0.25:1 }}
                      onMouseEnter={e=>handleMouseEnter(e,cell.dateKey,data)}
                      onMouseLeave={()=>setTooltip(null)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="cal-tooltip-float" style={{left:tooltipPos.x,top:tooltipPos.y}}>
          <strong>{tooltip.dateKey}</strong>
          {tooltip.data
            ? isAmount
              ? ` · ${tooltip.data.amountLogged} ${goalUnit||'units'}`
              : ` · Day ${tooltip.data.streakDay}`
            : ' · No activity'}
        </div>
      )}

      {/* Legend */}
      <div className="cal-legend">
        <span className="cal-legend-lbl">Less</span>
        {BOOL_COLORS.map((c,i)=><span key={i} className="cal-legend-cell" style={{background:c,border:i===0?'1px solid rgba(255,255,255,0.08)':'none'}} />)}
        <span className="cal-legend-lbl">More</span>
      </div>
    </div>
  );
};

export default StreakCalendar;
