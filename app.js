const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const uid=()=>Math.random().toString(36).slice(2,9);
const defaultProject=()=>({name:"Новый отчёт",zoom:.85,grid:false,pages:[{id:uid(),elements:[]}],activePage:0});
let project=JSON.parse(localStorage.getItem("osintProject")||"null")||defaultProject();
let selected=null, history=[], future=[], drag=null;

function save(){localStorage.setItem("osintProject",JSON.stringify(project));$("#saveStatus").textContent="Сохранено"}
function changed(){history.push(JSON.stringify(project));if(history.length>40)history.shift();future=[];$("#saveStatus").textContent="Сохранение…";clearTimeout(changed.t);changed.t=setTimeout(save,300)}
function page(){return project.pages[project.activePage]}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function renderPages(){
 const list=$("#pageList");list.innerHTML="";
 project.pages.forEach((p,i)=>{let d=document.createElement("div");d.className="page-thumb "+(i===project.activePage?"active":"");d.innerHTML=`<div class="thumb-sheet"><span>Страница ${i+1}</span></div><div class="page-meta"><span>${i+1}</span><span>⋮</span></div>`;d.onclick=()=>{project.activePage=i;selected=null;render();};list.appendChild(d)})
}
function render(){
 $("#projectName").value=project.name;
 if(innerWidth<=700){const a=Math.max(240,$("#canvasScroll").clientWidth-20);project.zoom=Math.min(project.zoom,a/794);if(project.zoom<.25)project.zoom=a/794;}
 $("#zoomLabel").textContent=Math.round(project.zoom*100)+"%";
 $("#pageCanvas").style.transform=`scale(${project.zoom})`;
 $("#pageCanvas").classList.toggle("grid",project.grid);
 renderPages();renderCanvas();renderProperties()
}
function renderCanvas(){
 const c=$("#pageCanvas");c.innerHTML="";
 page().elements.forEach(o=>{
  const el=document.createElement("div");el.className="canvas-object "+o.type+"-object"+(selected===o.id?" selected":"");
  el.dataset.id=o.id;Object.assign(el.style,{left:o.x+"px",top:o.y+"px",width:o.w+"px",height:o.h+"px",transform:`rotate(${o.rotate||0}deg)`,opacity:o.opacity??1});
  if(o.type==="text"||o.type==="heading"||o.type==="quote"){
   el.textContent=o.text;el.style.fontFamily=o.font||"Arial";el.style.fontSize=(o.size||16)+"px";el.style.fontWeight=o.type==="heading"?"700":(o.bold?"700":"400");el.style.fontStyle=o.italic?"italic":"normal";el.style.color=o.color||"#20242a";el.style.textAlign=o.align||"left";el.contentEditable=o.editing||false;
   el.ondblclick=()=>{o.editing=true;el.contentEditable=true;el.focus()};
   el.onblur=()=>{if(o.editing){o.text=el.innerText;o.editing=false;changed();render()}};
  } else if(o.type==="image"){el.innerHTML=`<img src="${o.src}"><div class="caption">${esc(o.caption||"")}</div>`}
  else if(o.type==="table"){el.innerHTML=`<table><tbody>${o.cells.map(r=>`<tr>${r.map(v=>`<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table>`}
  else if(o.type==="source"){el.innerHTML=`<b>${esc(o.title)}</b><div>${esc(o.url)}</div><small>Дата доступа: ${esc(o.date)}</small>`}
  else if(o.type==="timeline"){el.innerHTML=`<b>Timeline</b><div>${esc(o.text)}</div>`}
  else if(o.type==="osint"){el.innerHTML=`<b>${esc(o.title)}</b><div>${esc(o.text)}</div>`}
  else if(o.type==="qr"){el.textContent="QR • "+(o.text||"URL")}
  else if(o.type==="line"){}
  el.onclick=e=>{e.stopPropagation();selected=o.id;renderProperties();renderCanvas()};
  el.onpointerdown=e=>{if(e.button!==0||o.editing)return;selected=o.id;drag={o,sx:e.clientX,sy:e.clientY,ox:o.x,oy:o.y};el.setPointerCapture(e.pointerId)};
  el.onpointermove=e=>{if(!drag||drag.o!==o)return;o.x=drag.ox+(e.clientX-drag.sx)/project.zoom;o.y=drag.oy+(e.clientY-drag.sy)/project.zoom;renderCanvas();renderProperties()};
  el.onpointerup=()=>{if(drag){drag=null;changed()}};
  if(selected===o.id){const h=document.createElement("div");h.className="resize-handle";el.appendChild(h)}
  c.appendChild(el);
 });
 c.onclick=()=>{selected=null;renderProperties();renderCanvas()}
}
function renderProperties(){
 const box=$("#properties"),o=page().elements.find(x=>x.id===selected);
 if(!o){box.innerHTML='<div class="empty">Выберите объект на странице</div>';return}
 box.innerHTML=`<div class="prop-section"><b>${o.type}</b></div>
 <div class="prop-section"><div class="prop-grid">
 ${["x","y","w","h","rotate","opacity"].map(k=>`<div class="prop"><label>${k}</label><input data-k="${k}" type="number" step="1" value="${o[k]??(k==="opacity"?1:0)}"></div>`).join("")}
 ${o.type==="text"||o.type==="heading"||o.type==="quote"?`<div class="prop full"><label>Текст</label><textarea data-k="text">${esc(o.text)}</textarea></div><div class="prop"><label>Размер</label><input data-k="size" type="number" value="${o.size||16}"></div><div class="prop"><label>Шрифт</label><select data-k="font"><option>Arial</option><option>Georgia</option><option>Inter</option><option>Times New Roman</option></select></div>`:""}
 ${o.type==="image"?`<div class="prop full"><label>Подпись</label><input data-k="caption" value="${esc(o.caption||"")}"></div>`:""}
 ${o.type==="source"||o.type==="osint"||o.type==="timeline"?`<div class="prop full"><label>Содержимое</label><textarea data-k="text">${esc(o.text||"")}</textarea></div>`:""}
 </div></div>
 <div class="prop-section"><button class="danger" data-delete>Удалить объект</button></div>`;
 box.querySelectorAll("[data-k]").forEach(inp=>inp.oninput=()=>{let k=inp.dataset.k; o[k]=inp.type==="number"?Number(inp.value):inp.value;changed();renderCanvas()});
 box.querySelector("[data-delete]").onclick=()=>{page().elements=page().elements.filter(x=>x.id!==o.id);selected=null;changed();render()}
}
function add(type){
 let o={id:uid(),type,x:80,y:80,w:300,h:70,rotate:0,opacity:1};
 if(type==="text")Object.assign(o,{text:"Новый текст",size:16});
 if(type==="heading")Object.assign(o,{text:"Заголовок раздела",size:28,w:500,h:55});
 if(type==="quote")Object.assign(o,{text:"Цитата или важное наблюдение",size:17,h:90});
 if(type==="line")Object.assign(o,{w:500,h:2});
 if(type==="table")Object.assign(o,{w:500,h:160,cells:[["Поле","Значение"],["Объект","Пример"],["Источник","example.org"]]});
 if(type==="source")Object.assign(o,{title:"Источник",url:"https://example.org",date:new Date().toLocaleDateString("ru-RU"),text:"Описание источника"});
 if(type==="timeline")Object.assign(o,{text:"27.10.2026 — событие / наблюдение",h:110});
 if(type==="osint")Object.assign(o,{title:"Объект исследования",text:"Добавьте сведения, источник и вывод.",h:120});
 if(type==="qr")Object.assign(o,{text:"https://example.org",w:120,h:120});
 if(type==="image"){ $("#imageInput").click(); return; }
 page().elements.push(o);selected=o.id;changed();render()
}
$$("[data-add]").forEach(b=>b.onclick=()=>add(b.dataset.add));
$$("[data-action]").forEach(b=>b.onclick=()=>action(b.dataset.action));
$$(".tab").forEach(b=>b.onclick=()=>{$$(".tab").forEach(x=>x.classList.remove("active"));$$(".panel").forEach(x=>x.classList.remove("active"));b.classList.add("active");$("#"+b.dataset.panel+"Panel").classList.add("active")});
$("#projectName").oninput=e=>{project.name=e.target.value;changed()};

function action(a){
 if(a==="addPage"){project.pages.push({id:uid(),elements:[]});project.activePage=project.pages.length-1;selected=null;changed();render()}
 if(a==="zoomIn"){project.zoom=Math.min(1.5,project.zoom+.1);render()}
 if(a==="zoomOut"){project.zoom=Math.max(.35,project.zoom-.1);render()}
 if(a==="fit"){const a=Math.max(240,$("#canvasScroll").clientWidth-20);project.zoom=Math.min(1,a/794);render()}
 if(a==="grid"){project.grid=!project.grid;render()}
 if(a==="undo"&&history.length){future.push(JSON.stringify(project));project=JSON.parse(history.pop());render();save()}
 if(a==="redo"&&future.length){history.push(JSON.stringify(project));project=JSON.parse(future.pop());render();save()}
 if(a==="preview"){openPreview()}
 if(a==="export"){window.print()}
 if(a==="fullscreen")document.body.classList.toggle("fullscreen")
}
function openPreview(){
 const modal=$("#previewModal"),out=$("#previewContent");out.innerHTML="";
 const clone=$("#pageCanvas").cloneNode(true);clone.classList.remove("grid","page-canvas");clone.classList.add("preview-page");clone.style.transform="none";out.appendChild(clone);modal.classList.remove("hidden")
}
$(".modal-close").onclick=()=>$("#previewModal").classList.add("hidden");
$("#imageInput").onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{let o={id:uid(),type:"image",x:80,y:80,w:420,h:280,rotate:0,opacity:1,src:r.result,caption:""};page().elements.push(o);selected=o.id;changed();render()};r.readAsDataURL(f);e.target.value=""};
$$("[data-template]").forEach(b=>b.onclick=()=>{const t=b.dataset.template;page().elements=[];if(t==="minimal"){add("heading");page().elements.at(-1).text="OSINT REPORT";add("text");page().elements.at(-1).text="Название расследования\\nАвтор • дата"}if(t==="analytic"){add("heading");page().elements.at(-1).text="АНАЛИТИЧЕСКИЙ ОТЧЁТ";add("osint");add("source")}if(t==="geoint"){add("heading");page().elements.at(-1).text="GEOINT";add("image");return}if(t==="dark"){page().elements.push({id:uid(),type:"text",x:80,y:80,w:600,h:100,text:"DARK OSINT REPORT",size:30,color:"#111"});};changed();render()});
$("#telegramPopup .popup-close").onclick=()=>{$("#telegramPopup").remove();localStorage.setItem("telegramPopupClosed","1")};
if(localStorage.getItem("telegramPopupClosed"))$("#telegramPopup").remove();
document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"){e.preventDefault();action("undo")}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="y"){e.preventDefault();action("redo")}if(e.key==="Delete"&&selected){page().elements=page().elements.filter(x=>x.id!==selected);selected=null;changed();render()}});
render();

$$("[data-mobile]").forEach(b=>b.onclick=()=>{const a=b.dataset.mobile;$(".left").classList.remove("mobile-open");$(".right").classList.remove("mobile-open");if(a==="pages"){$(".left").classList.add("mobile-open");$$(".tab").forEach(x=>x.classList.remove("active"));$$(".panel").forEach(x=>x.classList.remove("active"));$('[data-panel="pages"]').classList.add("active");$("#pagesPanel").classList.add("active")}if(a==="insert"){$(".left").classList.add("mobile-open");$$(".tab").forEach(x=>x.classList.remove("active"));$$(".panel").forEach(x=>x.classList.remove("active"));$('[data-panel="insert"]').classList.add("active");$("#insertPanel").classList.add("active")}if(a==="properties"){$(".right").classList.add("mobile-open");renderProperties()}});
document.addEventListener("click",e=>{if(innerWidth<=700&&!e.target.closest(".sidebar")&&!e.target.closest(".mobile-nav")){$(".left").classList.remove("mobile-open");$(".right").classList.remove("mobile-open")}});window.addEventListener("resize",()=>render());
