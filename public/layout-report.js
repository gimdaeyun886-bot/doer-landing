/* Optional owner diagnostics. Runs in the user's own page, not a screenshot workaround. */
(() => {
  'use strict';
  if(new URLSearchParams(location.search).get('inspect')!=='1')return;
  const panel=document.createElement('details');panel.className='layout-report';panel.id='layout-diagnostics';
  const summary=document.createElement('summary');summary.textContent='실제 레이아웃 좌표 보기';
  const output=document.createElement('pre');
  const actions=document.createElement('div');actions.className='diagnostic-actions';
  const copy=document.createElement('button');copy.type='button';copy.textContent='진단 JSON 복사';
  const status=document.createElement('span');status.className='diagnostic-status';status.setAttribute('role','status');
  actions.append(copy,status);panel.append(summary,actions,output);document.body.append(panel);
  const ids=['hero-title','methods-title','evening-title','experience-title','adjust-title','roadmap-title','faq-title','signup-title'];
  const top=el=>el.getBoundingClientRect().top+scrollY;
  function lineCount(el){
    const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),ys=[];let text;
    while((text=walker.nextNode())){
      if(!text.textContent.trim())continue;
      const range=document.createRange();range.selectNodeContents(text);
      for(const rect of range.getClientRects())if(rect.width>0&&!ys.some(y=>Math.abs(y-rect.top)<4))ys.push(rect.top);
    }
    return ys.length;
  }
  function measure(){
    const h=innerHeight,range=window.DoerOpeningTheme.bounds(top(document.querySelector('#evening-title')),top(document.querySelector('#experience-title')),h);
    const watched=[...document.querySelectorAll('#hero-title,.night-room,.opening-preview,#methods-title,.founder-note,.methods-table,#evening-title,.evening-timeline li,.access-table,#experience-title,.phone-experience')];
    const visibleAt=position=>watched.filter(el=>{const r=el.getBoundingClientRect(),y=r.top+scrollY;return y<position+h&&y+r.height>position;}).map(el=>({element:el.id||el.className||el.querySelector('h3')?.textContent||el.tagName,topInViewport:Math.round(top(el)-position),bottomInViewport:Math.round(top(el)+el.getBoundingClientRect().height-position)}));
    const result={viewport:`${innerWidth}×${h}`,fontStatus:document.fonts.status,mode:document.body.dataset.themeMode,
      transition:{start:Math.round(range.start),end:Math.round(range.end),distance:Math.round(range.distance),minimum:Math.round(range.minimum),adequate:range.adequate,startVisible:visibleAt(range.start),endVisible:visibleAt(range.end)},
      threeCutTop:Math.round(top(document.querySelector('.opening-preview'))),headings:ids.map(id=>({id,lines:lineCount(document.getElementById(id)),top:Math.round(top(document.getElementById(id)))})),
      sections:[...document.querySelectorAll('#main > section,#main > aside')].map(el=>{const r=el.getBoundingClientRect();return {id:el.id,top:Math.round(r.top+scrollY),height:Math.round(r.height),bottom:Math.round(r.bottom+scrollY)};}),
      methodsRows:[...document.querySelectorAll('.methods-table tbody tr')].map((el,i)=>({row:i+1,height:Math.round(el.getBoundingClientRect().height)})),
      chartTransfer:window.DoerChartTransfer?.measure()??{available:false,reason:'Chart geometry not loaded'},
      motion:window.DoerMotion?.status()??null,sceneOverlays:window.DoerSceneMotion?.overlays()??null,
      outsidePhoneBelow13:smallTexts(),horizontalOverflow:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth)};
    output.textContent=JSON.stringify(result,null,2);window.DoerLayoutReport=Object.freeze(result);
  }
  function smallTexts(){
    const found=[],walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;
    while((node=walker.nextNode())){
      if(!node.textContent.trim())continue;
      const el=node.parentElement;
      if(!el||el.closest('.handset,script,style,noscript,#layout-diagnostics,[aria-hidden="true"]'))continue;
      const range=document.createRange();range.selectNodeContents(node);
      if(![...range.getClientRects()].some(r=>r.width>0&&r.height>0))continue;
      const size=parseFloat(getComputedStyle(el).fontSize);
      if(size<13)found.push({element:el.id||el.className||el.tagName,fontSize:size,text:node.textContent.trim().slice(0,80)});
    }
    return found;
  }
  copy.addEventListener('click',async()=>{
    measure();
    try{await navigator.clipboard.writeText(output.textContent);status.textContent='현재 화면의 진단값을 복사했어요.';}
    catch{const selection=getSelection(),range=document.createRange();range.selectNodeContents(output);selection.removeAllRanges();selection.addRange(range);status.textContent='진단값을 선택했어요. Ctrl+C로 복사해 주세요.';}
  });
  let frame=0;const request=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(measure);};
  document.fonts.ready.then(request);window.addEventListener('resize',request);window.addEventListener('load',request);
  if('ResizeObserver' in window){const observer=new ResizeObserver(request);observer.observe(document.querySelector('#main'));window.addEventListener('pagehide',()=>{observer.disconnect();cancelAnimationFrame(frame);});}
  measure();
})();
