(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))n(i);new MutationObserver(i=>{for(const o of i)if(o.type==="childList")for(const s of o.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&n(s)}).observe(document,{childList:!0,subtree:!0});function r(i){const o={};return i.integrity&&(o.integrity=i.integrity),i.referrerPolicy&&(o.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?o.credentials="include":i.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function n(i){if(i.ep)return;i.ep=!0;const o=r(i);fetch(i.href,o)}})();async function w(e=100){try{return(await(await fetch(`https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/records?limit=${e}`)).json()).results}catch(t){return console.error("Erreur:",t),[]}}function u(){document.querySelectorAll(".tag").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.tag;console.log("Tag cliqué :",t),window.gererTagClick(t)})})}function I(e){return e?new Date(e).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"}):"Date non communiquée"}function g(e){const t=e.qfap_tags?e.qfap_tags.split(";").map(n=>n.trim()):[],r=I(e.date_start);return`
    <div class="card">
      <button class="audienceBtn">${e.audience}</button>      
      <div class="tags">
        ${t.map(n=>`<span class="tag" data-tag="${n}">${n}</span>`).join(" ")} 
      </div>
      <h2>${e.title}</h2>
      <h3>${e.address_name??""}</h3> 
      <img src="${e.cover_url}" alt="Event titled ${e.title}" width="300">
      <p><strong>Date :</strong> ${r}</p>
      
        
      <div class="descriptionHidden hidden"><p><strong>Prix :</strong> ${e.price_type??"Non communiqué"} ${e.price_detail??""}</p>
      <strong>Adresse :</strong> 
        ${e.address_street??""}  
        ${e.address_zipcode??""} 
        ${e.address_city??"Non communiquée"}
      </p>
      <p>
        <p><strong>Description :</strong> ${e.lead_text??"Non communiqué"} <br>${e.description}</p>
        <p><strong>Mail :</strong> ${e.contact_mail??"Non communiqué"}</p>
      </div>
      <button class="toggleDescription">Voir plus</button>
    </div>
  `}let f=!1;function T(){f||(f=!0,document.addEventListener("click",e=>{if(e.target.classList.contains("toggleDescription")){const r=e.target.closest(".card").querySelector(".descriptionHidden");r.classList.toggle("hidden"),e.target.textContent=r.classList.contains("hidden")?"Voir plus":"Voir moins"}}))}document.addEventListener("click",e=>{if(e.target.id==="clear-search"){const t=document.getElementById("search");t&&(t.value="",t.dispatchEvent(new Event("input")))}});let c=[],d=0;const h=3,y=260;let l=null;window.gererTagClick=P;function H(e){return e.sort((t,r)=>{const n=new Date(t.date_start),i=new Date(r.date_start);return t.date_start?r.date_start?n-i:-1:1})}async function q(){c=await w(),c=H(c);const e=new Date;c=c.filter(t=>t.date_start?new Date(t.date_start)>=e:!1),_(),v(),T(),requestAnimationFrame(a)}q();function _(){const e=document.getElementById("events-container"),t=document.getElementById("head");t.innerHTML=`
    <div class="content">
    <img src="/logo.png" alt="Logo Paris" id="LogoParis"> 
      <a href="#top" class="headerTitleLink">
        <h1>Que faire à <em>Paris</em> ?</h1>
      </a>

      <div id="search-wrapper" style="position: relative; display: inline-block;">
        
        <input 
          type="text" 
          id="search"
          placeholder="Rechercher..."
          style="
            width: 100%; 
            padding: 8px 35px 8px 12px;
            font-size: 1rem;
            border-radius: 6px;
            border: none;
            outline: none;
            box-sizing: border-box;
            position: center;
          "
        >

        <button 
          id="clear-search"
          style="
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            background: transparent;
            border: none;
            font-size: 1.1rem;
            cursor: pointer;
            display: none;
          "
        >✕</button>

      </div>

      <button id="reset-filters">Réinitialiser</button>
      <button id="header-toggle" type="button" aria-expanded="true">Réduire l'en-tête</button>
    </div>
  `,e.innerHTML=`
    <div id="cards-list"></div>
    <button id="voirPlus">Voir plus d'événements</button>
    <button id="debutBtn" style="display: none;">↑ Haut de page</button>
  `;const r=document.getElementById("search"),n=document.getElementById("clear-search");r.addEventListener("input",o=>{const s=o.target.value;D(s),n.style.display=s?"block":"none"}),n.addEventListener("click",()=>{r.value="",n.style.display="none",m()}),document.getElementById("voirPlus").addEventListener("click",v),document.getElementById("debutBtn").addEventListener("click",()=>{window.scrollTo({top:0,behavior:"smooth"})}),document.getElementById("reset-filters").addEventListener("click",m),document.getElementById("header-toggle").addEventListener("click",o=>{o.stopPropagation(),document.body.classList.toggle("header-collapsed"),p(),a()}),p()}async function m(){const e=c.slice(0,3);d=3;const t=document.getElementById("cards-list");t.innerHTML="",e.forEach(r=>t.innerHTML+=g(r)),document.getElementById("voirPlus").style.display="block",document.getElementById("search").value="",document.getElementById("clear-search").style.display="none",document.querySelectorAll(".tag.active").forEach(r=>r.classList.remove("active")),l=null,u(),requestAnimationFrame(a)}function v(){const e=document.getElementById("cards-list");c.slice(d,d+h).forEach(r=>{e.innerHTML+=g(r)}),d+=h,d>=c.length&&(document.getElementById("voirPlus").style.display="none"),u(),requestAnimationFrame(a)}function D(e=""){const t=document.getElementById("cards-list");t.innerHTML="";const r=document.getElementById("voirPlus"),n=e.trim().toLowerCase(),i=c.filter(o=>{const s=o.title?.toLowerCase()??"",E=o.description?.toLowerCase()??"",b=o.qfap_tags?.toLowerCase()??"",B=o.audience?.toLowerCase()??"";return s.includes(n)||E.includes(n)||b.includes(n)||B.includes(n)});if(i.length===0){t.innerHTML=`
      <div class="no-results">
        Aucun événement ne correspond à « ${e} ».
      </div>
    `,r.style.display="none",requestAnimationFrame(a);return}i.forEach(o=>{t.innerHTML+=g(o)}),u(),requestAnimationFrame(a)}function P(e){e===l?(l=null,m()):(l=e,L(e))}function L(e){const t=document.getElementById("cards-list");t.innerHTML="",document.getElementById("voirPlus").style.display="none",document.getElementById("search").value="",document.getElementById("clear-search").style.display="none";const r=c.filter(n=>n.qfap_tags?.toLowerCase().includes(e.toLowerCase()));r.length===0?t.innerHTML=`<div class="no-results">Aucun événement trouvé pour le tag « ${e} ».</div>`:r.forEach(n=>{t.innerHTML+=g(n)}),document.querySelectorAll(".tag").forEach(n=>{n.dataset.tag===l?n.classList.add("active"):n.classList.remove("active")}),u(),requestAnimationFrame(a)}function $(){const e=document.querySelector("#cards-list .card");return e?Math.max(y,e.getBoundingClientRect().height*.75):y}function p(){const e=document.getElementById("header-toggle");if(!e)return;const t=document.body.classList.contains("header-collapsed");e.textContent=t?"Afficher l'en-tête":"Réduire l'en-tête",e.setAttribute("aria-expanded",String(!t))}function a(){const e=document.getElementById("head"),t=document.getElementById("cards-list"),r=document.getElementById("header-toggle");if(!e||!t||!r)return;const n=$(),i=e.getBoundingClientRect().height,s=window.innerHeight-i<n;document.body.classList.toggle("force-compact-header",s),s&&!document.body.classList.contains("header-collapsed")&&document.body.classList.add("header-collapsed"),p()}window.filtrerParTag=L;window.addEventListener("scroll",()=>{const e=document.getElementById("debutBtn");e&&(e.style.display=window.scrollY>300?"block":"none")});window.addEventListener("resize",a);document.addEventListener("click",e=>{e.target.classList?.contains("toggleDescription")&&requestAnimationFrame(a)});
