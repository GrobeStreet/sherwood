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
})();
