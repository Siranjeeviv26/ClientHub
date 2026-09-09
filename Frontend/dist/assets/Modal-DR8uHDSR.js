import{c as m,r as v,j as e,b,s as k}from"./index-Djc85yli.js";/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p=m("Trash2",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f=m("X",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]);function g({isOpen:t,onClose:a,title:d,description:s,children:n,footer:r,size:i="md",showCloseButton:o=!0,closeOnOverlayClick:x=!0,closeOnEscape:c=!0}){if(v.useEffect(()=>{if(!t)return;const l=u=>{u.key==="Escape"&&c&&a()};return document.addEventListener("keydown",l),document.body.style.overflow="hidden",()=>{document.removeEventListener("keydown",l),document.body.style.overflow="unset"}},[t,c,a]),!t)return null;const y={sm:"max-w-md",md:"max-w-lg",lg:"max-w-2xl",xl:"max-w-4xl",full:"max-w-[90vw]"},h=e.jsx("div",{className:"modal-overlay",onClick:x?a:void 0,role:"dialog","aria-modal":"true","aria-labelledby":d?"modal-title":void 0,"aria-describedby":s?"modal-description":void 0,children:e.jsxs("div",{className:b("modal",y[i]),onClick:l=>l.stopPropagation(),children:[(d||s||o)&&e.jsxs("div",{className:"modal-header",children:[e.jsxs("div",{children:[d&&e.jsx("h2",{id:"modal-title",className:"text-lg font-semibold text-gray-900",children:d}),s&&e.jsx("p",{id:"modal-description",className:"mt-1 text-sm text-gray-500",children:s})]}),o&&e.jsx("button",{onClick:a,className:"btn-ghost p-1 rounded-lg hover:bg-gray-100","aria-label":"Close",children:e.jsx(f,{className:"w-5 h-5"})})]}),e.jsx("div",{className:"modal-body",children:n}),r&&e.jsx("div",{className:"modal-footer",children:r})]})});return k.createPortal(h,document.body)}export{g as M,p as T};
