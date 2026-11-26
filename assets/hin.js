// Sherwood — free HIN (boat hull number) decode. 100% on-device logic, no network, nothing stored.
// Faithful port of the HIN It app's decoder (same mappings, verified MIC table, official free sources).
(function(){
  'use strict';
  var $=function(s){return document.querySelector(s);};

  var MONTH_LETTERS='ABCDEFGHIJKL';           // A = January … L = December
  var MONTH_NAMES=['January','February','March','April','May','June','July','August','September','October','November','December'];

  // VERIFIED only. A wrong builder name is worse than none — never guess. USCG registry is the full source.
  var MIC={
    SER:'Sea Ray', CCB:'Chris-Craft', BWC:'Boston Whaler',
    BUJ:'White River Marine Group (Tracker, Tahoe, Nitro, …)'
  };

  var SOURCES=[
    {t:'USCG builder (MIC) registry',d:'The authoritative, complete source for who a builder code belongs to.',u:'https://uscgboating.org/content/manufacturers-identification.php'},
    {t:'USCG documented-vessel search',d:'Larger boats (about 5 net tons and up) may be federally documented and searchable here.',u:'https://cgmix.uscg.mil/PSIX/'},
    {t:'Boat recalls & safety defects',d:'Check whether the builder or model has an open USCG safety recall.',u:'https://www.uscg.mil/boating-safety/manufacturers/recalls/'},
    {t:"Your state's boating agency",d:'Boats are registered and titled state by state — this is where owner, title and lien records live.',u:'https://www.nasbla.org/about-nasbla/boating-contacts'}
  ];
  var LIMITS="There is no free national boat-history database (no boat equivalent of a car’s title history). Ownership, title and lien records are held by your state agency. Accident, storm and repair history aren’t in public data — a marine survey is how you find those.";
  var THEFT="No free self-service stolen-boat lookup exists. To check a boat for theft, ask local law enforcement to run the HIN through NCIC, or ask the seller’s insurer. An altered or mismatched HIN is itself a warning sign.";

  var MSG={
    length:"A current HIN is exactly 12 characters. This isn’t — it may be mistyped, or an older pre-1984 number.",
    illegalSerialChar:"The serial section contains I, O or Q, which the standard leaves out to avoid confusion with 1 and 0. Double-check for a misread — or an altered number, which can be a stolen-boat red flag.",
    nonLetterMIC:"The first three characters (the builder code) aren’t all letters as expected.",
    preStandard:"This looks like a pre-August-1984 hull number. Older formats vary, so confirm the exact date with the builder or your state agency.",
    yearMismatch:"The build year and model year are more than a year apart. That can be normal, but it’s worth double-checking."
  };
  var FMT={current:'Current format (Aug 1984–present)',preStraightYear:'Pre-1984 straight-year format',preModelYear:'Pre-1984 model-year format',unknown:'Unrecognized format'};

  function normalize(raw){
    var s=(raw||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
    if(s.indexOf('US')===0 && s.length===14) s=s.slice(2);
    return s;
  }
  function fullModelYear(yy,now){ var cutoff=(now%100)+1; return yy<=cutoff?2000+yy:1900+yy; }
  function productionYear(d,my){ var y=Math.floor(my/10)*10+d; if(y>my+1)y-=10; if(y<my-1)y+=10; return y; }

  function decode(raw){
    var now=new Date().getFullYear();
    var norm=normalize(raw), w=[];
    if(!norm) return {empty:true};
    var c=norm.split(''), format='unknown', mic=null, serial=null, month=null, prodYear=null, modelYear=null;
    if(c.length!==12) w.push('length');
    if(c.length>=3){ mic=norm.slice(0,3); if(!/^[A-Z]{3}$/.test(mic)) w.push('nonLetterMIC'); }
    if(c.length>=8){ serial=norm.slice(3,8); if(/[IOQ]/.test(serial)) w.push('illegalSerialChar'); }
    if(c.length===12){
      var c9=c[8];
      if(MONTH_LETTERS.indexOf(c9)>=0){
        format='current'; month=MONTH_LETTERS.indexOf(c9)+1;
        var yy=parseInt(norm.slice(10,12),10);
        if(!isNaN(yy)) modelYear=fullModelYear(yy,now);
        var d=parseInt(c[9],10);
        if(!isNaN(d)&&modelYear!=null){ prodYear=productionYear(d,modelYear); if(Math.abs(prodYear-modelYear)>1) w.push('yearMismatch'); }
      } else if(c9==='M'){ format='preModelYear'; w.push('preStandard'); }
      else if(/[0-9]/.test(c9)){
        format='preStraightYear'; w.push('preStandard');
        var mm=parseInt(norm.slice(8,10),10); if(mm>=1&&mm<=12) month=mm;
        var y2=parseInt(norm.slice(10,12),10); if(!isNaN(y2)){ prodYear=1900+y2; modelYear=prodYear; }
      }
    }
    var valid=(c.length===12)&&(format!=='unknown');
    return {normalized:norm,format:format,mic:mic,builder:MIC[mic]||null,serial:serial,
      month:month,prodYear:prodYear,modelYear:modelYear,warnings:w,valid:valid};
  }

  function builtText(r){
    var name=(r.month? MONTH_NAMES[r.month-1]:null);
    if(name&&r.prodYear) return name+' '+r.prodYear;
    if(r.prodYear) return String(r.prodYear);
    return null;
  }

  window.decodeHIN=function(raw){
    var out=$('#result');
    var r=decode(raw);
    if(r.empty){ out.innerHTML='<div class="note warn"><strong>Enter a hull number to decode.</strong></div>'; return; }
    history.replaceState(null,'',location.pathname+'?hin='+encodeURIComponent(r.normalized));

    var sev = r.warnings.indexOf('illegalSerialChar')>=0 ? 'danger' : (r.valid? 'good':'warn');
    var statusBadge = r.valid
      ? '<span class="badge good">✓ Valid 12-char HIN</span>'
      : (r.warnings.indexOf('length')>=0 ? '<span class="badge warn">Not 12 characters</span>' : '<span class="badge warn">Check this number</span>');

    var h='<div class="result card">';
    h+='<div class="hdr"><h2>'+esc(r.builder||r.mic||'Hull number')+'</h2>'+statusBadge+'</div>';
    h+='<p class="muted" style="font-family:ui-monospace,monospace;letter-spacing:.1em">'+esc(r.normalized)+'</p>';

    var rows=[
      ['Builder code (MIC)', r.mic + (r.builder?'':'  — look up below')],
      ['Builder', r.builder || 'Not in our verified table — use the USCG registry below'],
      ['Serial', r.serial],
      ['Built', builtText(r)],
      ['Model year', r.modelYear],
      ['Format', FMT[r.format]]
    ];
    h+='<div style="margin-top:14px">';
    rows.forEach(function(x){ if(x[1]!=null&&x[1]!=='') h+='<div class="rowline"><span class="k">'+esc(x[0])+'</span><span class="v">'+esc(String(x[1]))+'</span></div>'; });
    h+='</div>';

    // warnings
    if(r.warnings.length){
      r.warnings.forEach(function(code){
        if(!MSG[code]) return;
        var cls = code==='illegalSerialChar' ? 'danger' : 'warn';
        h+='<div class="note '+cls+'">'+esc(MSG[code])+'</div>';
      });
    } else if(r.valid){
      h+='<div class="note honest" style="border-left-color:var(--good)"><strong>Reads clean.</strong> The structure checks out. A valid structure isn’t proof the boat is clean — an altered HIN can still be well-formed — but there are no red flags in the number itself.</div>';
    }

    // what free data can't show
    h+='<div class="sec-head">Verify &amp; go deeper — free official sources</div>';
    h+='<div class="sources">';
    SOURCES.forEach(function(s){
      h+='<a class="src" target="_blank" rel="noopener" href="'+s.u+'"><span class="arw">↗</span><span><span class="t">'+esc(s.t)+'</span><br><span class="d">'+esc(s.d)+'</span></span></a>';
    });
    h+='</div>';

    h+='<div class="note honest"><strong>What a free check can’t show</strong><p>'+esc(LIMITS)+'</p></div>';
    h+='<div class="note warn"><strong>Theft &amp; stolen-boat checks</strong><p>'+esc(THEFT)+'</p></div>';

    h+='<p class="muted" style="margin-top:16px">Want this on your phone, offline? <a href="https://apps.apple.com/us/app/hin-it-free-boat-vin-check/id6839038339" target="_blank" rel="noopener">HIN It</a> is the free Sherwood app for boats.</p>';
    h+='</div>';
    out.innerHTML=h;

    setJsonLd({"@context":"https://schema.org","@type":"Product","category":"Boat",
      "name":(r.builder||r.mic||'Boat')+(r.modelYear?' '+r.modelYear:''),
      "productID":"HIN:"+r.normalized,
      "manufacturer":r.builder||undefined,
      "releaseDate":r.prodYear?String(r.prodYear):undefined,
      "description":"Free hull identification number (HIN) decode via Sherwood — builder, build date and format, with links to the free USCG sources.",
      "url":location.href});
  };

  document.addEventListener('DOMContentLoaded',function(){
    var pre=qp('hin'); var inp=$('#hin');
    if(inp&&pre){ inp.value=pre; window.decodeHIN(pre); }
  });
})();
