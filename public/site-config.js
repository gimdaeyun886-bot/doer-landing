/* Set the endpoint only after the owner deploys their Apps Script web app. */
const SIGNUP_ENDPOINT = '';
window.DoerConfig = Object.freeze({
  endpoint:SIGNUP_ENDPOINT,
  signupVerified:false, // Actual sheet row + readable JSON + duplicate test required.
  operator:'[이름]',
  contact:'[이메일]',
  analyticsId:'',
  consentVersion:'2026-10-03-v1'
});
window.doerSignupReady=()=>{
  const c=window.DoerConfig;
  return Boolean(/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(c.endpoint)&&c.signupVerified&&c.operator&&!c.operator.startsWith('[')&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.contact));
};
window.doerTrack = (event,properties={}) => {
  const allowed=['task','view','adjusted','device','source','duplicate'];
  const safe=Object.fromEntries(Object.entries(properties).filter(([key]) => allowed.includes(key)));
  if(window.DoerConfig.analyticsId) {
    window.dataLayer=window.dataLayer||[]; window.dataLayer.push({event,...safe});
  } else console.debug('[Do-er demo]',event,safe);
};
