/*!
  GeoPortal Genie by Stephen Lead
  GeoPortalGenie.com
*/
;var geoPortalGenie={};require(["esri/map","dojo/domReady!","esri/dijit/Geocoder","esri/layers/graphics","esri/virtualearth/VETiledLayer"],function(){if(!configOptions.mapOptions||!configOptions.arcgisGeocoder){alert("please check your configuration file for errors");return null}if(document.getElementById("mapDiv")!==null){geoPortalGenie.mapModel=new gpGenie.MapModel({mapDiv:"mapDiv",mapOptions:configOptions.mapOptions,geocoderOptions:configOptions.arcgisGeocoder,geocoderDiv:"geocoderDiv",bingMapsOptions:configOptions.bingMapsOptions||null});dojo.connect(geoPortalGenie.mapModel.map,"onLoad",geoPortalGenie.mapModel.buildExtentLayers)}else{geoPortalGenie.mapModel=null}geoPortalGenie.restModel=new gpGenie.RestModel({mapModel:geoPortalGenie.mapModel,gpServer:configOptions.geoPortalServer,infoMessageContainer:"#infoMessage"});geoPortalGenie.detailsModel=new gpGenie.DetailsModel({mapModel:geoPortalGenie.mapModel,restModel:geoPortalGenie.restModel});geoPortalGenie.detailsView=new gpGenie.DetailsView({detailsModel:geoPortalGenie.detailsModel,detailsContainer:"#modalResults",detailsTemplate:"#details-template"});geoPortalGenie.resultsCollection=new gpGenie.ResultsCollection({mapModel:geoPortalGenie.mapModel,restModel:geoPortalGenie.restModel});geoPortalGenie.resultsView=new gpGenie.ResultsView({mapModel:geoPortalGenie.mapModel,restModel:geoPortalGenie.restModel,collection:geoPortalGenie.resultsCollection,resultsContainer:"#searchResults",resultSetTemplate:"results-set-template"});$("#advancedToggle").click(function(){c()});function c(){if($("#advancedToggle").hasClass("advancedOn")){$("#advancedSearchParameters").fadeOut(100);$("#advancedStatus").addClass("icon-caret-down");$("#advancedStatus").removeClass("icon-caret-up");$("#advancedToggle").removeClass("advancedOn");geoPortalGenie.useAdvanced=false}else{$("#advancedStatus").addClass("icon-caret-up");$("#advancedStatus").removeClass("icon-caret-down");$("#advancedSearchParameters").fadeIn(300);$("#advancedToggle").addClass("advancedOn");geoPortalGenie.useAdvanced=true}}geoPortalGenie.useAdvanced=$("#advancedToggle").hasClass("advancedOn");$(".hasTooltip").tooltip({delay:{show:1000,hide:100}});$("input, textarea").placeholder();$(".datepicker").datepicker({format:"yyyy-mm-dd"});$("#txtFromDate").click(function(){$("#txtToDate").datepicker("hide")});$("#txtToDate").click(function(){$("#txtFromDate").datepicker("hide")});a();$(".datepicker").on("changeDate",function(){$(this).removeClass("error")});$(".datepicker").change(function(){var d=new RegExp(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/);if(d.test(this.value)){$(this).removeClass("error")}else{$(this).addClass("error")}});$("#btnRunSearch").click(function(){b()});$("#txtSearch").keydown(function(d){if(d.keyCode==13){d.preventDefault();b()}});$(".advancedSearch").on("change",function(){geoPortalGenie.restModel.trigger("searchTermsUpdated")});$(document).on("click",".btnZoomTo",function(f){var h=this.getAttribute("data-bbox");if(h!==null&&h!==undefined){h=h.split(",");var d=new esri.geometry.Extent(parseFloat(h[0]),parseFloat(h[1]),parseFloat(h[2]),parseFloat(h[3]),{wkid:4326});var g=esri.geometry.geographicToWebMercator(d);var e=configOptions.zoomFactor||1.5;geoPortalGenie.mapModel.map.setExtent(g.expand(e),true)}});$(document).on("click",".btnQuickPreview",function(e){var d=this.getAttribute("data-url");if(d!==null&&d!==undefined){alert(d)}});$("#modalResults").modal({show:false,keyboard:true,remote:true});$(document).on("click",".btnThumbnailLink",function(){$(this).button("loading");var d=this.getAttribute("data-img");var f="";var e="<a class='thumb' target='_blank' alt='thumbnail image' title='Click the image to open in a new window' href='"+d+"'><img class='thumb' alt='thumbnail image' src='"+d+"'/></a>";$("#modalTitle").html(f);$("#modalContent").html(e);$("#modalResults").modal("show");$(this).button("reset")});$(document).on("click",".btnDetailsLink",function(){$(this).button("loading");var d=this.getAttribute("data-uuid");geoPortalGenie.detailsModel.fetchDetails(d)});function b(){geoPortalGenie.restModel.buildSearchQuery()}function a(){var h=configOptions.allCategoriesText||"All themes";var g='<option class="allCategories" value="all">'+h+"</option>";for(var f=0;f<configOptions.categories.length;f++){var j=configOptions.categories[f];g+='<optgroup label="'+j.heading+'">';for(var e=0;e<j.subcategories.length;e++){var k=j.subcategories[e];var d=k.name;if(k.alias){d=k.alias}g+='<option value="'+k.name+'">'+d+"</option>"}g+="</optgroup>"}jQuery("#filterThemes").html(g)}});