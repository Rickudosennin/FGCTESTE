(function(){
  if("serviceWorker" in navigator) addEventListener("load",function(){navigator.serviceWorker.register("sw.js").catch(function(){});});
  // index.html?jogo=SF6[&tipo=online|offline][&local=south-america|worldwide] -> pré-seleciona e pesquisa
  function aplicar(){
    try{
      var p=new URLSearchParams(location.search),j=p.get("jogo"),s=document.getElementById("campo_jogo");
      if(!j||!s||typeof pesquisar!=="function")return;
      if(![].some.call(s.options,function(o){return o.value===j;}))return;
      s.value=j;
      var t=p.get("tipo"),l=p.get("local");
      if(t&&document.getElementById("campo_tipo"))document.getElementById("campo_tipo").value=t;
      if(l&&document.getElementById("campo_local"))document.getElementById("campo_local").value=l;
      pesquisar();
    }catch(e){}
  }
  if(document.readyState==="complete")aplicar();else addEventListener("load",aplicar);
})();
