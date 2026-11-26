// Sherwood — free VIN decode (NHTSA vPIC + recalls + safety ratings + complaints)
// All data from free public NHTSA APIs, no key. Nothing stored, nothing sent anywhere but NHTSA.
(function(){
  'use strict';
  var VPIC='https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/';
  var API='https://api.nhtsa.gov';

  var $=function(s){return document.querySelector(s);};
  function fetchJSON(url){
    return fetch(url,{headers:{'accept':'application/json'}})
      .then(function(r){ if(!r.ok) throw new Error(r.status); return r.json(); })
      .catch(function(){ return null; });
  }
  function has(v){ return v && v!=='Not Applicable' && v!=='0' && v!=='' && String(v).toLowerCase()!=='no'; }
  function yes(v){ // equipment: Standard / Optional / a label counts as "present"
    if(!has(v)) return false;
    var s=String(v).toLowerCase();
    if(s==='not applicable') return false;
    return true;
  }
  function label(v){ return String(v).replace(/\s*\([^)]*\)\s*$/,''); }

  // ---- VIN validation (ISO-3779 check digit, soft) ----
  var TRANS={A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,J:1,K:2,L:3,M:4,N:5,P:7,R:9,S:2,T:3,U:4,V:5,W:6,X:7,Y:8,Z:9,
    '0':0,'1':1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9};
  var WEIGHT=[8,7,6,5,4,3,2,10,0,9,8,7,6,5,4,3,2];
  function checkDigitOK(vin){
    if(vin.length!==17) return null;
    var sum=0;
    for(var i=0;i<17;i++){ var t=TRANS[vin[i]]; if(t===undefined) return null; sum+=t*WEIGHT[i]; }
    var r=sum%11; var expect=r===10?'X':String(r);
    return vin[8]===expect;
  }

  function normalize(raw){ return (raw||'').toUpperCase().replace(/[^A-Z0-9]/g,''); }

  // ---------- main ----------
  window.decodeVIN=function(raw){
    var vin=normalize(raw);
    var out=$('#result'); var btn=$('#go');
    if(vin.length<11){ out.innerHTML='<div class="note warn"><strong>That doesn’t look like a full VIN.</strong><p>A VIN is 17 characters. Double-check and try again.</p></div>'; return; }
    history.replaceState(null,'', location.pathname+'?vin='+encodeURIComponent(vin));
    if(btn){ btn.disabled=true; btn.innerHTML='<span class="spin"></span>'; }
    out.innerHTML='<p class="muted"><span class="spin"></span> Decoding '+esc(vin)+' …</p>';

    fetchJSON(VPIC+encodeURIComponent(vin)+'?format=json').then(function(dec){
      if(!dec||!dec.Results||!dec.Results[0]){
        out.innerHTML='<div class="note danger"><strong>Couldn’t reach NHTSA just now.</strong><p>Try again in a moment. (Sherwood reads NHTSA’s free public database live — nothing is cached.)</p></div>';
        resetBtn(btn); return;
      }
      var d=dec.Results[0];
      var yr=d.ModelYear, mk=d.Make, md=d.Model;
      if(!has(mk)&&!has(md)){
        out.innerHTML='<div class="note warn"><strong>NHTSA couldn’t decode that VIN.</strong><p>'+esc(d.ErrorText||'No match. Check for a mistyped character (VINs never use I, O or Q).')+'</p></div>';
        resetBtn(btn); return;
      }
      // fire the model-level lookups in parallel; render decode immediately
      var mkq=encodeURIComponent(mk||''), mdq=encodeURIComponent(label(md||'')), yrq=encodeURIComponent(yr||'');
      var recalls = (has(mk)&&has(md)&&has(yr)) ? fetchJSON(API+'/recalls/recallsByVehicle?make='+mkq+'&model='+mdq+'&modelYear='+yrq) : Promise.resolve(null);
      var complaints = (has(mk)&&has(md)&&has(yr)) ? fetchJSON(API+'/complaints/complaintsByVehicle?make='+mkq+'&model='+mdq+'&modelYear='+yrq) : Promise.resolve(null);
      var ratings = (has(mk)&&has(md)&&has(yr)) ? fetchJSON(API+'/SafetyRatings/modelyear/'+yrq+'/make/'+mkq+'/model/'+mdq) : Promise.resolve(null);

      render(vin,d);
      resetBtn(btn);

      Promise.all([recalls,complaints,ratings]).then(function(a){
        renderRecalls(a[0]);
        renderComplaints(a[1], (yr+' '+mk+' '+label(md)).trim());
        renderRatings(a[2]);
      });
      setJsonLd(buildJsonLd(vin,d));
    });
  };

  function resetBtn(btn){ if(btn){ btn.disabled=false; btn.textContent='Decode'; } }

  function render(vin,d){
    var title=[d.ModelYear,d.Make&&titlecase(d.Make),d.Model,has(d.Trim)?d.Trim:''].filter(has).join(' ');
    var cd=checkDigitOK(vin);
    var h='';
    h+='<div class="result card">';
    h+='<div class="hdr"><h2>'+esc(title||'Decoded vehicle')+'</h2>';
    if(has(d.BodyClass)) h+='<span class="badge good">'+esc(label(d.BodyClass))+'</span>';
    h+='</div>';
    h+='<p class="muted" style="font-family:ui-monospace,monospace;letter-spacing:.08em">'+esc(vin)+
       (cd===false?' &nbsp;<span class="badge warn">check digit doesn’t validate — may be mistyped</span>':'')+'</p>';

    // build sheet
    var rows=[
      ['Year',d.ModelYear],['Make',d.Make&&titlecase(d.Make)],['Model',d.Model],['Trim / series',has(d.Trim)?d.Trim:d.Series],
      ['Body',d.BodyClass],['Doors',d.Doors],['Drive',d.DriveType],
      ['Engine',engineLine(d)],['Fuel',d.FuelTypePrimary+(has(d.FuelTypeSecondary)?' / '+d.FuelTypeSecondary:'')],
      ['Transmission',transLine(d)],['Horsepower',has(d.EngineHP)?d.EngineHP+' hp':null],
      ['Built at',[d.PlantCity,d.PlantState,d.PlantCountry].filter(has).map(titlecase).join(', ')],
      ['Manufacturer',d.Manufacturer&&titlecase(d.Manufacturer)],
      ['GVWR',d.GVWR]
    ];
    h+='<div style="margin-top:14px">';
    rows.forEach(function(r){ if(has(r[1])) h+='<div class="rowline"><span class="k">'+esc(r[0])+'</span><span class="v">'+esc(label(String(r[1])))+'</span></div>'; });
    h+='</div>';

    // safety equipment on this VIN
    var equip=equipment(d);
    if(equip.length){
      h+='<div class="sec-head">✓ Safety equipment on this VIN</div>';
      h+='<div class="grid two" style="gap:2px 24px">';
      equip.forEach(function(e){ h+='<div class="feat"><span class="ck">✓</span><span>'+esc(e)+'</span></div>'; });
      h+='</div>';
      h+='<p class="muted" style="font-size:.9rem;margin-top:8px">From this VIN’s build record (NHTSA vPIC). A blank field means NHTSA has no record of it, not necessarily that it’s absent.</p>';
    }

    h+='<div id="recalls"></div><div id="ratings"></div><div id="complaints"></div>';

    // VIN-specific recall deep link
    h+='<div class="sec-head">Recalls for this exact VIN</div>';
    h+='<p>NHTSA’s model-level recall list is below. For the open/closed status tied to <em>this specific VIN</em>, use NHTSA’s own VIN recall lookup:</p>';
    h+='<a class="btn btn-gold" target="_blank" rel="noopener" href="https://www.nhtsa.gov/recalls?vin='+encodeURIComponent(vin)+'">Open NHTSA’s recall check for this VIN ↗</a>';

    // honest panel
    h+='<div class="note honest" style="margin-top:22px"><strong>What a free check can’t show — and where it actually lives</strong>'+
       '<p>Title brands (salvage, flood, total-loss), odometer history and open liens are in <strong>NMVTIS</strong>, the federal title database — its approved providers charge a few dollars a report. Accident and damage history is <strong>Carfax / AutoCheck</strong> (paid). Full service records live with the dealer or shop. Sherwood won’t sell you a report or send you to one — we just tell you honestly where the record is.</p></div>';

    // spoke
    h+='<p class="muted" style="margin-top:16px">Want this on your phone, offline? <a href="https://apps.apple.com/us/app/vin-it-free-vin-check/id6838772879" target="_blank" rel="noopener">VIN It</a> is the free Sherwood app for vehicles.</p>';
    h+='</div>';
    $('#result').innerHTML=h;
  }

  function engineLine(d){
    var p=[];
    if(has(d.EngineConfiguration)) p.push(d.EngineConfiguration);
    if(has(d.EngineCylinders)) p.push(d.EngineCylinders+'-cyl');
    if(has(d.DisplacementL)) p.push((Math.round(parseFloat(d.DisplacementL)*10)/10)+'L');
    if(yes(d.Turbo)) p.push('turbo');
    if(has(d.ElectrificationLevel)&&String(d.ElectrificationLevel).toLowerCase()!=='not applicable') p.push(label(d.ElectrificationLevel));
    return p.join(' ');
  }
  function transLine(d){
    var p=[];
    if(has(d.TransmissionStyle)) p.push(d.TransmissionStyle);
    if(has(d.TransmissionSpeeds)) p.push(d.TransmissionSpeeds+'-speed');
    return p.join(' ');
  }
  function equipment(d){
    var map=[
      ['AirBagLocFront','Front airbags'],['AirBagLocSide','Side airbags'],['AirBagLocCurtain','Curtain airbags'],
      ['AirBagLocKnee','Knee airbags'],['SeatBeltsAll','Seat belts'],
      ['ABS','Anti-lock brakes (ABS)'],['ESC','Electronic stability control'],['TractionControl','Traction control'],
      ['TPMS','Tire-pressure monitoring'],
      ['RearVisibilitySystem','Backup camera'],['ForwardCollisionWarning','Forward-collision warning'],
      ['CIB','Automatic emergency braking'],['PedestrianAutomaticEmergencyBraking','Pedestrian AEB'],
      ['BlindSpotMon','Blind-spot monitoring'],['RearCrossTrafficAlert','Rear cross-traffic alert'],
      ['LaneDepartureWarning','Lane-departure warning'],['LaneKeepSystem','Lane-keeping assist'],
      ['LaneCenteringAssistance','Lane-centering assist'],['AdaptiveCruiseControl','Adaptive cruise control'],
      ['ParkAssist','Park assist'],['DaytimeRunningLight','Daytime running lights'],
      ['KeylessIgnition','Keyless ignition'],['EDR','Event data recorder']
    ];
    var r=[];
    map.forEach(function(m){ if(yes(d[m[0]])){ var v=String(d[m[0]]).toLowerCase(); r.push(m[1]+(v==='optional'?' (optional)':'')); } });
    return r;
  }

  function renderRecalls(data){
    var el=document.getElementById('recalls'); if(!el) return;
    var list=(data&&data.results)||[];
    var h='<div class="sec-head">Recalls for this model '+(list.length?'<span class="badge danger">'+list.length+'</span>':'<span class="badge good">none on record</span>')+'</div>';
    if(!list.length){ h+='<p class="muted">NHTSA lists no safety recalls for this year/make/model. (Model-level — confirm this exact VIN with the link below.)</p>'; el.innerHTML=h; return; }
    h+='<p class="muted">Reported across this year/make/model — not confirmed against this specific VIN. Newest first.</p>';
    list.slice(0,12).forEach(function(c){
      var park = c.parkIt?'<span class="badge danger">Park outside — fire risk</span>':(c.parkOutSide?'<span class="badge danger">Do not park in garage</span>':'');
      h+='<div class="card" style="margin:10px 0;padding:16px">';
      h+='<div class="hdr"><strong>'+esc(c.Component||'Recall')+'</strong> '+park+'</div>';
      if(c.ReportReceivedDate) h+='<p class="muted" style="margin:.2em 0">'+esc(c.ReportReceivedDate)+' · '+esc(c.NHTSACampaignNumber||'')+'</p>';
      if(c.Summary) h+='<p style="margin:.3em 0">'+esc(c.Summary)+'</p>';
      if(c.Remedy) h+='<p class="muted" style="margin:.2em 0"><strong>Remedy:</strong> '+esc(c.Remedy)+'</p>';
      h+='</div>';
    });
    if(list.length>12) h+='<p class="muted">…and '+(list.length-12)+' more.</p>';
    el.innerHTML=h;
  }

  function renderComplaints(data,name){
    var el=document.getElementById('complaints'); if(!el) return;
    var n=(data&&data.count!=null)?data.count:((data&&data.results)?data.results.length:null);
    if(n==null){ el.innerHTML=''; return; }
    el.innerHTML='<div class="sec-head">Owner complaints</div><p><strong>'+n+'</strong> complaints filed with NHTSA for the '+esc(name)+'. '+
      '<span class="muted">These are reported across the whole model — not this specific VIN.</span></p>';
  }

  function renderRatings(data){
    var el=document.getElementById('ratings'); if(!el) return;
    var res=(data&&data.Results)||[];
    if(!res.length){ el.innerHTML=''; return; }
    var id=res[0].VehicleId;
    fetchJSON(API+'/SafetyRatings/VehicleId/'+id).then(function(r){
      var v=r&&r.Results&&r.Results[0]; if(!v){ el.innerHTML=''; return; }
      var rows=[['Overall',v.OverallRating],['Frontal crash',v.OverallFrontCrashRating],
        ['Side crash',v.OverallSideCrashRating],['Rollover',v.RolloverRating]];
      var h='<div class="sec-head">NHTSA crash-test ratings</div>';
      rows.forEach(function(x){ if(x[1]&&x[1]!=='Not Rated'){ h+='<div class="rowline"><span class="k">'+esc(x[0])+'</span><span class="v">'+esc(x[1])+' ★</span></div>'; }});
      el.innerHTML=h;
    });
  }

  function buildJsonLd(vin,d){
    return {"@context":"https://schema.org","@type":"Vehicle",
      "name":[d.ModelYear,d.Make&&titlecase(d.Make),d.Model].filter(has).join(' '),
      "vehicleIdentificationNumber":vin,
      "manufacturer":has(d.Make)?titlecase(d.Make):undefined,
      "model":has(d.Model)?d.Model:undefined,
      "modelDate":has(d.ModelYear)?d.ModelYear:undefined,
      "bodyType":has(d.BodyClass)?label(d.BodyClass):undefined,
      "fuelType":has(d.FuelTypePrimary)?d.FuelTypePrimary:undefined,
      "vehicleEngine":engineLine(d)||undefined,
      "description":"Free VIN decode from NHTSA’s public vPIC database via Sherwood.",
      "url":location.href};
  }

  function titlecase(s){ return String(s).toLowerCase().replace(/\b[a-z]/g,function(c){return c.toUpperCase();}); }

  // auto-run from ?vin=
  document.addEventListener('DOMContentLoaded',function(){
    var pre=qp('vin'); var inp=$('#vin');
    if(inp&&pre){ inp.value=pre; window.decodeVIN(pre); }
  });
})();
