import { introSwirlPath, introWordmarkPath } from "./intro-logo";

/**
 * First-load intro on the marketing pages: the logo draws itself, a stamp card fills up, then the
 * overlay lifts off. It is a plain inline script (no React, no images) so it is on screen before the
 * app's JS loads, and the real page is in the HTML underneath the whole time.
 *
 * - First visit: full (~2.2s). Returning visitor (localStorage): logo only (~0.8s). Same browser
 *   session (sessionStorage): nothing. Reduced motion: static logo for ~300ms, then a fade.
 * - Lifts once the animation is done and the page has loaded, or after 4s regardless.
 * - Only on the marketing pages below, never on join links, the dashboard or anything else.
 * - `?intro=1` forces the full version (reduced motion still wins).
 */

const pages = ["/", "/demo", "/support", "/privacy", "/terms"];

const ink = "#0f1512";
const lime = "#c6f432"; // the logo's swirl
const cream = "#f4f2ec"; // the logo's wordmark

const check = `<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;
const gift = `<svg viewBox="0 0 24 24"><path d="M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7C10.5 4 7 3.5 7 5.5S10 7 12 7zm0 0c1.5-3 5-3.5 5-1.5S14 7 12 7z"/></svg>`;
const slots = 8;
const firstStamp = 0.7; // seconds
const stampGap = 0.115;
const rewardAt = firstStamp + (slots - 1) * stampGap;

// The swirl's outline is about 13,500 units long (drawn with a dash that long; pathLength doesn't
// carry through <use>), and 26 units is about 1.5px at 76px wide. The overlay is a custom element
// because React skips unknown tags while hydrating <body>; a <div> would be mistaken for Next's own.
const markup = `<bayline-intro id="bli" aria-hidden="true"><div class="lg">
<svg class="sw" viewBox="56 106 1356 1228"><defs><path id="bli-s" d="${introSwirlPath}"/></defs><use href="#bli-s" class="d"/><use href="#bli-s" class="f"/></svg>
<svg class="wm" viewBox="48 70 1686 890"><path fill-rule="evenodd" d="${introWordmarkPath}"/></svg>
</div><div class="cd"><div class="hd"><i></i><i></i></div><div class="st">${Array.from({ length: slots }, (_, i) =>
  i === slots - 1
    ? `<span class="sl rw">${gift}<b style="animation-delay:${rewardAt.toFixed(3)}s">${gift}</b></span>`
    : `<span class="sl"><b style="animation-delay:${(firstStamp + i * stampGap).toFixed(3)}s">${check}</b></span>`,
).join("")}</div></div></bayline-intro>`;

const css = `
#bli{position:fixed;inset:0;z-index:2147483000;display:flex;flex-direction:column;align-items:center;justify-content:center;background:${ink};will-change:transform,opacity}
#bli .lg{display:flex;flex-direction:column;align-items:center}
#bli svg{display:block;overflow:visible}
#bli .sw{width:76px}
#bli .sw .d{fill:none;stroke:${lime};stroke-width:26;stroke-dasharray:13600;stroke-dashoffset:13600;animation:bli-draw .5s cubic-bezier(.65,0,.35,1) forwards}
#bli .sw .f{fill:${lime};fill-rule:evenodd;opacity:0;animation:bli-in .3s .32s ease-out forwards}
#bli .wm{width:112px;margin-top:14px;fill:${cream};opacity:0;transform:translateY(8px);animation:bli-up .35s .3s cubic-bezier(.2,.7,.2,1) forwards}
#bli .cd{margin-top:32px;width:min(264px,76vw);padding:16px;border-radius:18px;background:#18201b;box-shadow:inset 0 0 0 1px rgba(244,242,236,.08),0 24px 48px -24px #000;opacity:0;transform:translateY(28px);animation:bli-up .4s .52s cubic-bezier(.2,.8,.2,1) forwards}
#bli .hd{display:flex;justify-content:space-between;margin-bottom:16px}
#bli .hd i{display:block;width:44%;height:8px;border-radius:4px;background:rgba(244,242,236,.22)}
#bli .hd i+i{width:18%;background:rgba(244,242,236,.12)}
#bli .st{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
#bli .sl{position:relative;z-index:0;aspect-ratio:1;border-radius:50%;background:rgba(244,242,236,.05);box-shadow:inset 0 0 0 1.5px rgba(244,242,236,.14)}
#bli .sl b{position:absolute;inset:0;display:grid;place-items:center;border-radius:50%;background:${lime};transform:scale(0);animation:bli-pop .3s cubic-bezier(.3,.7,.4,1) forwards}
#bli .sl svg{width:48%;fill:none;stroke:${ink};stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}
#bli .rw{background:none;box-shadow:inset 0 0 0 2px ${lime}}
#bli .rw>svg{position:absolute;inset:26%;width:48%;stroke:${lime};stroke-width:2}
#bli .rw b svg{stroke-width:2.2}
#bli .rw:after{content:"";position:absolute;inset:-40%;z-index:-1;border-radius:50%;background:radial-gradient(closest-side,rgba(198,244,50,.6),rgba(198,244,50,0));opacity:0;transform:scale(.5);animation:bli-glow .8s ${(rewardAt + 0.12).toFixed(3)}s ease-out forwards}
#bli.q .cd{display:none}
#bli.q .sw .d{animation-duration:.4s}
#bli.q .sw .f{animation-duration:.2s;animation-delay:.22s}
#bli.q .wm{animation-delay:.15s;animation-duration:.3s}
#bli.r *{animation:none!important}
#bli.r .sw .d,#bli.r .cd{display:none}
#bli.r .sw .f,#bli.r .wm{opacity:1;transform:none}
#bli.out{pointer-events:none;animation:bli-exit .45s cubic-bezier(.7,0,.3,1) forwards}
#bli.q.out{animation-duration:.35s}
#bli.r.out{animation:bli-fade .25s ease-out forwards}
@keyframes bli-draw{to{stroke-dashoffset:0}}
@keyframes bli-in{to{opacity:1}}
@keyframes bli-up{to{opacity:1;transform:none}}
@keyframes bli-pop{60%{transform:scale(1.15)}to{transform:scale(1)}}
@keyframes bli-glow{35%{opacity:1;transform:scale(1.15)}to{opacity:.45;transform:scale(1)}}
@keyframes bli-exit{60%{opacity:.85}to{opacity:0;transform:translateY(-100%)}}
@keyframes bli-fade{to{opacity:0}}
`.replace(/\n/g, "");

// How long each version needs before it may lift (ms), and how long the lift takes.
const script = `(function(){try{
var d=document,l=location,force=/[?&]intro=1(&|$)/.test(l.search);
if(!force&&${JSON.stringify(pages)}.indexOf(l.pathname.replace(/(.)\\/$/,"$1"))<0)return;
var s=window.sessionStorage,ls=window.localStorage,seen;
try{if(!force&&s.getItem("bli"))return;s.setItem("bli","1")}catch(e){}
try{seen=ls.getItem("bli");ls.setItem("bli","1")}catch(e){}
var mode=matchMedia("(prefers-reduced-motion: reduce)").matches?"r":force||!seen?"":"q";
var hold={"":${Math.round((rewardAt + 0.3) * 1000)},q:450,r:300}[mode],lift={"":450,q:350,r:250}[mode];
d.body.insertAdjacentHTML("afterbegin",${JSON.stringify(markup)}.replace("><","><style>"+${JSON.stringify(css)}+"</style><"));
var el=d.getElementById("bli"),played=0,loaded=d.readyState=="complete",gone=0;
if(mode)el.className=mode;
function out(){if(gone)return;gone=1;el.className+=" out";setTimeout(function(){el.parentNode&&el.parentNode.removeChild(el)},lift+50)}
function check(){if(played&&loaded)out()}
setTimeout(function(){played=1;check()},hold);
setTimeout(out,4000);
addEventListener("load",function(){loaded=1;check()});
}catch(e){var x=document.getElementById("bli");x&&x.parentNode.removeChild(x)}})()`;

export function IntroLoader() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
