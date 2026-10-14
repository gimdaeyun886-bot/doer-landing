/* Pure theme math, shared with the non-browser regression tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DoerOpeningTheme = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const stops = [[14,13,18],[42,36,56],[92,78,104],[201,188,194],[247,244,238]];
  const clamp = value => Math.max(0,Math.min(1,value));
  const mix = (a,b,p) => a.map((value,i) => Math.round(value+(b[i]-value)*p));
  const css = rgb => `rgb(${rgb.join(',')})`;
  function luminance(rgb) {
    return rgb.reduce((sum,value,i) => {
      const s = value/255;
      return sum + (s <= .04045 ? s/12.92 : ((s+.055)/1.055)**2.4)*[.2126,.7152,.0722][i];
    },0);
  }
  function contrast(a,b) {
    const x=luminance(a), y=luminance(b);
    return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
  }
  function readable(preferred,bg) {
    if (contrast(preferred,bg)>=4.5) return preferred;
    const fallback=contrast([0,0,0],bg)>contrast([255,255,255],bg)?[0,0,0]:[255,255,255];
    // Keep the hue as far as possible while meeting the text threshold.
    for(let step=1;step<=100;step++) {
      const candidate=mix(preferred,fallback,step/100);
      if(contrast(candidate,bg)>=4.5) return candidate;
    }
    return fallback;
  }
  function palette(progress) {
    const raw=clamp(progress), eased=raw;
    const position=eased*(stops.length-1), index=Math.min(stops.length-2,Math.floor(position));
    const bg=mix(stops[index],stops[index+1],position-index);
    const light=luminance(bg)>.179;
    const ink=readable(light?[22,22,26]:[247,244,238],bg);
    const muted=readable(light?[97,93,102]:[216,207,222],bg);
    const accent=readable(light?[165,49,24]:[255,135,107],bg);
    const answerBg=mix(bg,[255,135,107],.08),answerInk=readable(accent,answerBg);
    return {raw,eased,bg,ink,muted,accent,answerBg,answerInk,line:mix(bg,ink,.24)};
  }
  function bounds(eveningTop,experienceTop,height) {
    const start=eveningTop-height*.6;
    const end=experienceTop-height*.7;
    return {start,end,distance:end-start,minimum:height*.7,adequate:end-start>=height*.7};
  }
  return {clamp,mix,css,luminance,contrast,palette,bounds};
});
