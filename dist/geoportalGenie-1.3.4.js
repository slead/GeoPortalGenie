/*!
  GeoPortal Genie by Stephen Lead
  GeoPortalGenie.com
*/
;if(!this.gpGenie||typeof this.gpGenie!=="object"){this.gpGenie={}}gpGenie.MapModel=Backbone.Model.extend({initialize:function(c){_.bindAll(this,"updateMapExtent","updateGeocoder","clearGeocoder","startGeocoder","buildExtentLayers");this.map=new esri.Map(c.mapDiv,c.mapOptions);if(c.bingMapsOptions){var b=esri.virtualearth.VETiledLayer.MAP_STYLE_AERIAL_WITH_LABELS;switch(configOptions.bingMapsStyle){case"ROAD":b=esri.virtualearth.VETiledLayer.MAP_STYLE_ROAD;break;case"AERIAL":b=esri.virtualearth.VETiledLayer.MAP_STYLE_AERIAL;break;case"AERIAL_WITH_LABELS":b=esri.virtualearth.VETiledLayer.MAP_STYLE_AERIAL_WITH_LABELS;break}var a=new esri.virtualearth.VETiledLayer({bingMapsKey:configOptions.bingMapsOptions.bingMapsKey,mapStyle:b});this.map.addLayer(a)}this.startGeocoder(c)},startGeocoder:function(a){this.geocoder=new esri.dijit.Geocoder({map:this.map,arcgisGeocoder:a.geocoderOptions},a.geocoderDiv);this.geocoder.startup();this.geocoder.geocodeLayer=new esri.layers.GraphicsLayer();this.map.addLayer(this.geocoder.geocodeLayer);if(a.geocoderOptions.markerType==="picture"){this.geocoder.geocodeSymbol=new esri.symbol.PictureMarkerSymbol(a.geocoderOptions.markerImage,a.geocoderOptions.markerWidth,a.geocoderOptions.markerHeight)}else{if(a.geocoderOptions.markerType==="simple"){}}dojo.connect(this.geocoder,"select",this.updateGeocoder);dojo.connect(this.geocoder,"onClear",this.clearGeocoder)},clearGeocoder:function(){this.geocoder.geocodeLayer.clear()},updateGeocoder:function(a){if(a){var c=a.feature.geometry;var b=a.feature.attributes;this.geocoder.geocodeLayer.clear();var d=new esri.Graphic(c,this.geocoder.geocodeSymbol);this.geocoder.geocodeLayer.add(d)}},buildExtentLayers:function(){this.extentLayer=new esri.layers.GraphicsLayer();this.map.addLayer(this.extentLayer);this.mapSymbol=new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_NULL,new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_DASHDOT,new dojo.Color([255,0,0]),2),new dojo.Color([255,255,0,0.25]));this.highlightSymbol=new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_SOLID,new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID,new dojo.Color([255,0,0]),2),new dojo.Color([255,255,0,0.75]));dojo.connect(this.map,"onExtentChange",this.updateMapExtent);var a=esri.geometry.webMercatorToGeographic(this.map.extent);this.bbox=a.xmin+","+a.ymin+","+a.xmax+","+a.ymax},updateMapExtent:function(b){var a=esri.geometry.webMercatorToGeographic(b);this.bbox=a.xmin+","+a.ymin+","+a.xmax+","+a.ymax;this.trigger("mapExtentUpdated")}});gpGenie.RestModel=Backbone.Model.extend({initialize:function(a){_.bindAll(this,"buildSearchQuery","runSearchQuery");this.mapModel=a.mapModel;if(this.mapModel!==null){this.mapModel.on("mapExtentUpdated",this.onSearchTermsUpdated,this)}this.on("searchTermsUpdated",this.onSearchTermsUpdated,this);this.gpServer=a.gpServer;this.proxy=a.proxy||null;this.queryBase=configOptions.proxy+"?mode=JSONP&url="+configOptions.geoportalServer;this.infoMessageContainer=a.infoMessageContainer},buildSearchQuery:function(){this.startIndex=1;var b=$("#advancedToggle").hasClass("advancedOn");var g=$("#filterMap").val();var i=$("#txtSearch").val();var e="rest/find/document?";e+="rid=local";if(configOptions.pagination&&configOptions.pagination.itemsPerPage){e+="&max="+configOptions.pagination.itemsPerPage}if(geoPortalGenie.useAdvanced){if(g!=="anywhere"){e+="&spatialRel="+g;e+="&bbox="+this.mapModel.bbox}var f=$("#txtFromDate").val();if(f!==""){e+="&after="+f}var c=$("#txtToDate").val();if(c!==""){e+="&before="+c}}var h=$("#txtSearch").val();h=h.replace(/ /g,"+");h=h.replace(/\+and\+/g,"+AND+");h=h.replace(/\+or\+/g,"+").replace(/\+OR\+/g,"+");var d=$("#filterThemes").val();if(geoPortalGenie.useAdvanced&&d!=null&&d!="all"){d=d.replace(" ","+");e+="&searchText=dataTheme:";var a=d;if(h!==""){a+="+AND+"+h}e+=a}else{e+="&searchText="+h}this.query=e;this.runSearchQuery(e)},runSearchQuery:function(b){$("#btnRunSearch").addClass("btn-warning");$("#btnRunSearch i").addClass("icon-spinner");$("#btnRunSearch i").addClass("icon-spin");$(this.infoMessageContainer).fadeOut(100);var a=$.ajax({url:configOptions.proxy,data:{requrl:configOptions.geoportalServer+b+"&f=json"},dataType:"json",context:this,success:function(c){if(c===null&&c===undefined){this.trigger("clearCollections",configOptions.errorMessage)}else{this.parseResults(c)}},error:function(c){this.trigger("clearCollections",configOptions.errorMessage)}})},buildCategories:function(){var d=configOptions.categories.length;var e="";for(var c=0;c<d;c++){var g=configOptions.categories[c];var a=g.heading;e+='<div class="accordion-group"><div class="accordion-heading">';e+='<a class="accordion-toggle" data-toggle="collapse" data-parent="#browseThemesDiv" href="#collapse_'+a+'">'+a+"</a>";e+='</div><div id="collapse_'+a+'" class="accordion-body collapse in"><div class="accordion-inner"><ul id="inner_'+a+'"></ul></div></div></div>'}e+='<div class="accordion-group"><div class="accordion-heading">';e+='<a class="accordion-toggle" data-toggle="collapse" data-parent="#browseThemesDiv" href="#collapse_Other">Other</a>';e+='</div><div id="collapse_Other" class="accordion-body collapse in"><div class="accordion-inner"><ul id="inner_Other"></ul></div></div></div>';jQuery("#categoriesDiv").html(e);var b=configOptions.maxBrowseCategories||50;var h="rest/index/stats/fields?f=json&field="+configOptions.categoryIdentifier+"&max="+b;var f=$.ajax({url:configOptions.proxy,data:{requrl:configOptions.geoportalServer+h},dataType:"json",success:function(q){var v=configOptions.categories.length;var x=q.terms;if(x.length>0){for(var t=0;t<x.length;t++){var r=x[t];var o=r.name.replace(/ /g,"+");var l=r.documents;var w=false;for(var s=0;s<v;s++){var n=configOptions.categories[s];var m=n.subcategories;for(var p=0;p<m.length;p++){if(r.name===m[p].name){w=true;if(m[p].alias){var u="<li class = 'liBrowseTheme' data-value = '"+o+"'>"+m[p].alias+" ("+l+")</li>"}else{var u="<li class = 'liBrowseTheme' data-value = '"+o+"'>"+o+" ("+l+")</li>"}jQuery("#inner_"+n.heading).append(u);break}}}if(!w){var u="<li class = 'liBrowseTheme' data-value = '"+o+"'>"+r.name+" ("+l+")</li>";jQuery("#inner_Other").append(u)}}jQuery(".liBrowseTheme").unbind();jQuery(".liBrowseTheme").click(function(){$(".liBrowseTheme").removeClass("active");$(this).addClass("active");var i=this.dataset.value;geoPortalGenie.restModel.buildBrowseQuery(i)})}else{updateState("empty")}},error:function(i){updateState("error")}})},buildBrowseQuery:function(a){this.startIndex=1;var b="rest/find/document?searchText=dataTheme:"+a;if(configOptions.pagination&&configOptions.pagination.itemsPerPage){b+="&max="+configOptions.pagination.itemsPerPage}this.runSearchQuery(b);this.query=b},onSearchTermsUpdated:function(){$("#btnRunSearch").addClass("btn-warning");$(this.infoMessageContainer).fadeOut(100)},parseResults:function(a){this.results=a;if(a===null||a===undefined||a.records===undefined||a.records.length===0){this.trigger("clearCollections",configOptions.noResultsMessage)}else{if(!a.totalResults){var b=$.ajax({url:configOptions.proxy,data:{requrl:configOptions.geoportalServer+this.query+"&f=georss"},context:this,success:function(d){var c=$.xml2json(d).channel;this.results.totalResults=parseInt(c.totalResults);this.results.itemsPerPage=parseInt(c.itemsPerPage);this.trigger("resultsReturned",this.results,this)},error:function(c){alert("error with retrieving the georss results")}})}else{this.trigger("resultsReturned",a,this)}}},addCommas:function(e){e+="";var a=e.split(".");var d=a[0];var b=a.length>1?"."+a[1]:"";var c=/(\d+)(\d{3})/;while(c.test(d)){d=d.replace(c,"$1,$2")}return d+b}});gpGenie.ResultItem=Backbone.Model.extend({});gpGenie.ResultItemView=Backbone.View.extend({initialize:function(a){this.collection=a.collection},tagName:"tr",events:{mouseenter:"onMouseEnter",mouseleave:"onMouseLeave"},onMouseEnter:function(a){if(this.collection.mapModel!==null){var b=this.model.get("bbox");this.collection.highlightFeature(b)}this.$el.addClass("active")},onMouseLeave:function(){if(this.collection.mapModel!==null){var a=this.model.get("id");this.collection.unHighlightFeature(a)}this.$el.removeClass("active")},render:function(){var a=_.template($("#result-item-template").html(),this.model.toJSON());this.$el.html(a);return this}});gpGenie.ResultsCollection=Backbone.Collection.extend({initialize:function(a){this.mapModel=a.mapModel;this.restModel=a.restModel;this.restModel.on("resultsReturned",this.onResultsReturned,this)},model:gpGenie.ResultItem,onResultsReturned:function(a){this.totalResults=a.totalResults;this.itemsPerPage=a.itemsPerPage;if(this.totalResults===0){console.log("no results returned. This should have been trapped elsewhere");return null}else{if(this.totalResults===undefined){console.log("no totalresults detected");return null}}this.reset(a.records)},highlightFeature:function(b){var a=new esri.geometry.Polygon(new esri.SpatialReference({wkid:4326}));a.addRing([[b[0],b[1]],[b[0],b[3]],[b[2],b[3]],[b[2],b[1]],[b[0],b[1]]]);var c=new esri.Graphic(a,this.mapModel.highlightSymbol);this.mapModel.map.graphics.clear();this.mapModel.map.graphics.add(c);this.mapModel.extentLayer.setOpacity(0.25)},unHighlightFeature:function(){this.mapModel.map.graphics.clear();this.mapModel.extentLayer.setOpacity(1)}});gpGenie.ResultsView=Backbone.View.extend({initialize:function(a){_.bindAll(this,"update","showMessage");this.mapModel=a.mapModel;this.restModel=a.restModel;this.resultSetTemplate=ich[a.resultSetTemplate];this.collection.on("reset",this.update,this);this.restModel.on("clearCollections",this.showMessage,this);$(this.options.resultsContainer).append(this.el)},className:"results-set",update:function(){this.$el.html(this.resultSetTemplate({title:this.options.title||null},true));var f=this.$(".results-table tbody").children().remove().unbind().end();if(this.collection.mapModel!==null){this.mapModel.extentLayer.clear()}if(configOptions.pagination){var j=configOptions.pagination;j.restModel=this.restModel;var i=this.restModel.startIndex||1;var h=Math.round((i/configOptions.pagination.itemsPerPage)+0.5);if(h<1){h=1}j.currentPage=h;j.onPageClicked=function(p,k,l,o,m){m.startIndex=(o*configOptions.pagination.itemsPerPage-configOptions.pagination.itemsPerPage+1);var n=m.query;n+="&start="+m.startIndex;m.runSearchQuery(n)};var c=Math.round((this.collection.totalResults/this.collection.itemsPerPage)+0.5);j.totalPages=c,$(".pagination").bootstrapPaginator(j);var a=this.restModel.startIndex||1;var d=a+this.collection.length-1;var g=this.collection.totalResults;$(".pagination").prepend("<span class='count'>"+this.restModel.addCommas(a)+" to "+this.restModel.addCommas(d)+" of "+this.restModel.addCommas(g)+" records</span>");if(c>1){$(".pagination ul").show()}else{$(".pagination ul").hide()}}var e=[];this.fullExtent=null;var b=this.options.resultSetTemplate;this.collection.each(function(o){var m=o.attributes.links;var l=m.length;for(var C=0;C<l;C++){var q=m[C];var x=q.type;q.ignore=false;q.override=false;q.label=x;q.target="_blank";if(configOptions.customLinkBehavior){if(configOptions.customLinkBehavior[q.type]!==undefined){q.override=true;var n=configOptions.customLinkBehavior[q.type];if(n.label){q.label=n.label}}}if(!q.override){if(x==="open"||x==="website"){if(q.href.indexOf(".zip")>0){q.label="Download"}else{q.label="Open"}}else{if(x==="agslyr"){q.label="ArcGIS (.lyr)";q.target="_self"}else{if(x==="agskml"){q.label="Globe (.kml)";q.target="_self"}else{if(x==="agsnmf"){q.label="ArcGIS Explorer";q.target="_self"}else{if(x==="preview"){q.label="Preview";var w=q.href.indexOf("&url=");var B=q.href.indexOf("%26",w+1);var A=q.href.indexOf("&",w+1);var z=Math.min(B,A);var p=q.href.substr(w+5,z-w-5);p=decodeURIComponent(p);if(q.href.indexOf("&resourceType=")>-1){var w=q.href.indexOf("&resourceType=");var B=q.href.indexOf("%26",w+1);var A=q.href.indexOf("&",w+1);var z=Math.min(B,A);var v=q.href.substr(w+14,z-w-14)}if(v==="ags"||v==="wms"){var k=o.attributes.bbox;p+="&bbox="+k}q.url=p;q.previewType=v||"unknown"}else{if(x==="details"){q.label="Details";q.uuid=o.attributes.id}else{if(x==="metadata"){q.label="Metadata"}else{if(x==="thumbnail"){q.label="Thumbnail"}else{q.ignore=true}}}}}}}}}}var t=new gpGenie.ResultItemView({model:o,resultSetTemplate:b,collection:this.collection});if(this.collection.mapModel!==null){var k=o.attributes.bbox;var s=new esri.geometry.Polygon(new esri.SpatialReference({wkid:4326}));s.addRing([[k[0],k[1]],[k[0],k[3]],[k[2],k[3]],[k[2],k[1]],[k[0],k[1]]]);var y=o.attributes.id;var r=[{id:y}];var u=new esri.Graphic(s,this.mapModel.mapSymbol,r);this.mapModel.extentLayer.add(u);if(this.fullExtent===null){this.fullExtent=s.getExtent()}else{this.fullExtent=this.fullExtent.union(s.getExtent())}var D={type:"bbox",label:"Zoom To",bbox:k};o.attributes.links.push(D)}e.push(t.render().el);$("#btnRunSearch i").removeClass("icon-spinner");$("#btnRunSearch i").removeClass("icon-spin");$("#btnRunSearch").removeClass("btn-warning")},this);f.append(e);this.$el.show();if(configOptions.zoomAfterSearch&&this.fullExtent!==null){this.mapModel.map.setExtent(this.fullExtent,true)}},showMessage:function(a){this.$el.hide();if(a){$(this.restModel.infoMessageContainer).html(a);$(this.restModel.infoMessageContainer).show()}if(this.mapModel!==null){this.mapModel.extentLayer.clear()}$("#btnRunSearch i").removeClass("icon-spinner");$("#btnRunSearch i").removeClass("icon-spin");$("#btnRunSearch").removeClass("btn-warning")},render:function(){this.$el.html(this.resultSetTemplate({title:this.options.title||null},true));return this}});