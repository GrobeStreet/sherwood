// Sherwood — shared helpers
(function(){
  // footer year
  document.querySelectorAll('[data-year]').forEach(function(el){
    el.textContent = new Date().getFullYear();
  });
  // read a query param
  window.qp = function(name){
    return new URLSearchParams(location.search).get(name) || '';
  };
  // basic HTML escape
  window.esc = function(s){
    return String(s==null?'':s).replace(/[&<>"']/g,function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  };
  // inject/replace a JSON-LD block so agents + search read the answer
  window.setJsonLd = function(obj){
    var id='sherwood-jsonld';
    var old=document.getElementById(id); if(old) old.remove();
    var s=document.createElement('script');
    s.type='application/ld+json'; s.id=id;
    s.textContent=JSON.stringify(obj);
    document.head.appendChild(s);
  };
  // Privacy-first pageview beacon. Sends ONLY the path (never the ?vin=/?hin= query, so a
  // visitor's VIN/HIN is never transmitted) plus the external referrer host. No cookies,
  // no identifiers, no fingerprint. Counts live on Sherwood's own Netlify, not a third party.
  try {
    var _ref = '';
    if (document.referrer) {
      try { var _h = new URL(document.referrer).hostname; if (_h && _h !== location.hostname) _ref = _h; } catch (e) {}
    }
    fetch('/.netlify/functions/hit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ p: location.pathname, r: _ref }),
      keepalive: true
    }).catch(function () {});
  } catch (e) {}
})();
