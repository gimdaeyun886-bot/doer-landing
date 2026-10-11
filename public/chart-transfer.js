/* Presentation geometry only: one curve between the two static 15-minute pieces. */
(function(root){
  'use strict';
  function curve(start,end){
    const controlY=Math.max(36,Math.min(start.y,end.y)-72);
    return {
      d:`M ${start.x} ${start.y} C ${start.x} ${controlY} ${end.x} ${controlY} ${end.x} ${end.y}`,
      middle:{x:(start.x+end.x)/2,y:(start.y+end.y)/8+controlY*3/4}
    };
  }
  if(typeof module==='object'&&module.exports){module.exports={curve};return;}
  let plot,svg,path,label,observer,frame=0;
  const piece=day=>plot.querySelector(`[data-day="${day}"] .chart-piece`);
  const number=day=>plot.querySelector(`[data-day="${day}"] b`);
  function sync(){
    frame=0;
    if(!plot)return;
    const r=plot.getBoundingClientRect(),from=piece('목'),to=piece('토');
    if(!r.width||!r.height||!from||!to)return;
    const anchor=day=>{
      const bar=piece(day).getBoundingClientRect(),text=number(day).getBoundingClientRect();
      // Above the quantity label so the continuous curve cannot cut through a number.
      return {x:bar.left+bar.width/2-r.left,y:text.top-r.top-8};
    };
    const geometry=curve(anchor('목'),anchor('토'));
    svg.setAttribute('viewBox',`0 0 ${r.width} ${r.height}`);
    path.setAttribute('d',geometry.d);
    label.style.left=`${geometry.middle.x}px`;
    label.style.top=`${geometry.middle.y-28}px`;
  }
  function request(){if(!frame)frame=requestAnimationFrame(sync);}
  function observe(){
    if('ResizeObserver' in root){
      observer??=new ResizeObserver(request);
      [plot,...plot.querySelectorAll('.chart-piece,.is-changed b')].forEach(el=>observer.observe(el));
    }else root.addEventListener('resize',request);
  }
  function init(){
    plot=document.querySelector('.chart-plot');
    if(!plot)return;
    svg=plot.querySelector('svg');path=plot.querySelector('#transfer-curve');label=plot.querySelector('.chart-transfer > span');
    sync();observe();document.fonts.ready.then(request);
    root.addEventListener('pagehide',()=>{observer?.disconnect();root.removeEventListener('resize',request);cancelAnimationFrame(frame);frame=0;});
    root.addEventListener('pageshow',event=>{if(event.persisted){observe();request();}});
  }
  function measure(){
    if(!plot)return {available:false,reason:'Chart not initialized'};
    sync();
    const matrix=path.getScreenCTM();
    if(!matrix||!path.getTotalLength())return {available:false,reason:'SVG geometry unavailable'};
    const round=n=>Math.round(n*100)/100;
    const documentPoint=at=>{
      const point=path.getPointAtLength(at),screen=svg.createSVGPoint();screen.x=point.x;screen.y=point.y;
      const mapped=screen.matrixTransform(matrix);
      return {x:mapped.x+scrollX,y:mapped.y+scrollY};
    };
    const length=path.getTotalLength(),points=[documentPoint(0),documentPoint(length)];
    const endpoints=['목','토'].map((day,i)=>{
      const bar=piece(day).getBoundingClientRect(),center=bar.left+bar.width/2+scrollX;
      return {day,barCenterX:round(center),barTop:round(bar.top+scrollY),arrowX:round(points[i].x),arrowY:round(points[i].y),deltaX:round(points[i].x-center)};
    });
    const p=plot.getBoundingClientRect(),a=piece('목').getBoundingClientRect(),b=piece('토').getBoundingClientRect();
    const middleX=(a.left+a.width/2+b.left+b.width/2)/2+scrollX;
    const text=label.getBoundingClientRect(),labelX=text.left+text.width/2+scrollX;
    return {available:true,coordinateSystem:'document-css-px',plotWidth:round(p.width),start:endpoints[0],end:endpoints[1],
      label:{centerX:round(labelX),curveMiddleX:round(middleX),deltaX:round(labelX-middleX)},
      aligned:endpoints.every(point=>Math.abs(point.deltaX)<=.5)&&Math.abs(labelX-middleX)<=.5,tolerancePx:.5};
  }
  root.DoerChartTransfer=Object.freeze({init,measure});
})(typeof window==='object'?window:globalThis);
