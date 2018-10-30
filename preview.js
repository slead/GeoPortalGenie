/*!
  GeoPortal Genie by Stephen Lead
  GeoPortalGenie.com
*/

var previewMap, identifyLayers, wmsLayer, wmsLayerName, identifyPoint, wmsVersion, cleanURL;

require([
    "esri/map",
    "esri/geometry/Extent",
    "esri/layers/FeatureLayer",
    "esri/layers/WMSLayer",
    "esri/layers/WMSLayerInfo",
    "esri/arcgis/utils",
    "esri/IdentityManager",
    "esri/tasks/GeometryService",
    "esri/tasks/ProjectParameters",
    "esri/dijit/PopupMobile",
    "dojo/dom-construct",
    "esri/virtualearth/VETiledLayer",
    "dojo/domReady!"
  ], function(
      Map, Extent, FeatureLayer, WMSLayer, Utils, IdentityManager, GeometryService, ProjectParameters, PopupMobile, domConstruct, VETiledLayer, domReady
    ) {

	//Create the preview map

	//Using an alternative basemap?
	if(configOptions.bingMapsOptions) {
		previewMap = new Map("previewMap");
		if(configOptions.bingMapsOptions.bingMapsStyle) {
			var mapStyle = esri.virtualearth.VETiledLayer.MAP_STYLE_AERIAL_WITH_LABELS;
			switch(configOptions.bingMapsOptions.bingMapsStyle){
				case "ROAD":
					mapStyle = esri.virtualearth.VETiledLayer.MAP_STYLE_ROAD
					break;
				case "AERIAL":
					mapStyle = esri.virtualearth.VETiledLayer.MAP_STYLE_AERIAL;
					break;
				case "AERIAL_WITH_LABELS":
					mapStyle = esri.virtualearth.VETiledLayer.MAP_STYLE_AERIAL_WITH_LABELS;
					break;
			}
		}

		var veTileLayer = new esri.virtualearth.VETiledLayer({
			bingMapsKey: configOptions.bingMapsOptions.bingMapsKey,
			mapStyle: mapStyle
		});
		previewMap.addLayer(veTileLayer);
	} else {
		previewMap = new Map("previewMap", configOptions.mapOptions);
	}

	//TODO: add the option to specify another basemap type

	//Create a popup to display information
	var popup = new esri.dijit.Popup({
		fillSymbol: new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_SOLID, new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([255,0,0]), 2), new dojo.Color([255,255,0,0.25])),
		lineSymbol: new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_DASH,
		  new dojo.Color([255,0,0]), 3),
		markerSymbol: new esri.symbol.SimpleMarkerSymbol('circle', 32, null, new dojo.Color([0, 0, 0, 0.25]))
	}, dojo.create("div"));
	previewMap.infoWindow = popup;

	// Manage the "loading" indicator
	previewMap.on("update-start",function(){$("#status").show();});
	previewMap.on("update-end",function(){$("#status").hide();});

	//Find the URL from the address
	var url = URLLookup("url");

	//Set the href of the Preview page's link to this URL
	$("#goToSite").attr('href', url);

	//Find the preview type
	var previewType = URLLookup("previewType") || "unknown";

	//Find the bounding box
	var bbox = URLLookup("bbox");

	//Set up the proxy
	esri.config.defaults.io.proxyUrl = configOptions.mapProxy || "map_proxy.php";

	//Work out how to handle this preview, depending on the preview type attribute
	if(previewType === 'ags') {

		//This is an ArcGIS Server layer. Make a call to the Esri server to determine the layer type
		esri.request({
		     url: url,
		     content: {
		       f:  "json"
		     },
		     handleAs: "json",
		     callbackParamName: "callback",
		     load: function(response) {

		     	//Work out how to add the data
		     	var newLayer;
		     	if(response.singleFusedMapCache) {
		     		//This is a tiled layer
		     		newLayer = new esri.layers.ArcGISTiledMapServiceLayer(url);

		     	} else if (response.fields && response.fields.length > 0) {
		     		//This is a feature layer
		     		var infoTemplate = new esri.InfoTemplate("", "${*}");
		     		newLayer = new esri.layers.FeatureLayer(url,{
		     		    mode: esri.layers.FeatureLayer.MODE_ONDEMAND,
		     		    infoTemplate: infoTemplate,
		     		    outFields: ["*"]
					});

		     	} else if (response.layers) {
		     		//This is a dynamic layer
					newLayer = new esri.layers.ArcGISDynamicMapServiceLayer(url);

					//Run the Identify command on any layers when the user clicks on the map
					identifyLayers = response.layers;
					previewMap.on("click", function(evt){
						//Display the loading indicator
						$("#status").show();
						runIdentify(evt);
					});

		     	} else {
		     		//If we don't know how to handle this layer, just display it in the iFrame;
		     		setIFrame(url);
		     	}

		     	if(newLayer !== undefined) {
		     		//Add the layer to the map
		     		newLayer.setVisibility(true);
		     		newLayer.setOpacity(0.75);
		     		previewMap.addLayer(newLayer);

		     		//Zoom to the layer's extent
		     		if(bbox !== undefined && bbox !== null) {
		     			zoomToBbox(bbox);
			     	}
		     	} else {
		     		setIFrame(url);
		     	}

		     	//Enable the ArcGIS Online button, and set the url
		     	$("#arcgisonline").attr("href", "http://www.arcgis.com/home/webmap/viewer.html?url=" + url);
		     	$(".agol").show();
			 },
		     error: function (error) {
		        alert("Sorry, there was a problem adding this data to the preview map: " + error.message);
		     }
		});

	} else if(previewType === 'wms') {

		//Report when the layer is outside its scale range
//		wmsLayer.on("load", function(){
//			wmsLayer.visibleAtMapScale ? $("#message").hide() : $("#message").show();
//		});
//		previewMap.on("zoom-end", function() {
//			wmsLayer.isVisibleAtScale(previewMap.getScale()) ? $("#message").hide() : $("#message").show();
//		});

		//Set up the Identify functionality for WMS layers.
		var data = {
			REQUEST: 'GetCapabilities',
//			VERSION: "1.1.1",
			SERVICE: 'WMS'
		};
		var mapProxy = configOptions.mapProxy || "map_proxy.php";

		//Clean up the URL. It should look like http://domain.com/ArcGIS/services/wms/xxx/MapServer/WMSServer?
		cleanURL = url.replace("request=GetCapabilities","");
		if(cleanURL.substr(cleanURL.length - 1) !== "?") {
			cleanURL += "?";
		}

		var urlGet = mapProxy + "?" + cleanURL;
		$.ajax({
			type: 'GET',
			url: urlGet,
			data: data,
			dataType: "xml",
			success: function (xml) {
				var jsonResponse = $.xml2json(xml);

				var errorText = "Sorry, there was a problem retrieving this service";
				if(jsonResponse.ServiceException !== undefined) {
					errorText = errorText + ": " + jsonResponse.ServiceException;
					alert(errorText);
				} else if (jsonResponse.Exception !== undefined) {
					if(jsonResponse.Exception.ExceptionText !== undefined) {
						errorText = errorText + ": " + jsonResponse.Exception.ExceptionText;
					}
					alert(errorText);
				} else if (jsonResponse.Capability.Layer.Layer.queryable == '1') {

					//If the layer supports query, record its layer name, extent, spatial reference and version
					wmsLayerName = jsonResponse.Capability.Layer.Layer.Name;
					wmsVersion = jsonResponse.version || "1.1.1";
					var resourceInfo = {
						layerInfos: [new esri.layers.WMSLayerInfo({name: wmsLayerName, title: wmsLayerName})]
					};

					//Iterate through the Bounding Box array, to determine whether a supported SpatRef is included
					var spatRef;
					var prefix = "SRS";
					if(wmsVersion === "1.3.0") {prefix = "CRS"};
					for (var i = 0; i < jsonResponse.Capability.Layer.BoundingBox.length; i++) {
						var bbox = jsonResponse.Capability.Layer.BoundingBox[i];
						if(bbox[prefix] === "EPSG:102113") {
							spatRef = new esri.SpatialReference(102113);
							break;
						} else if(bbox[prefix] === "EPSG:102100") {
							spatRef = new esri.SpatialReference(102100);
							break;
						} else if (bbox[prefix] === "EPSG:4326" ) {
							spatRef = new esri.SpatialReference(4326);
							break;
						}
					}

					if(spatRef !== undefined) {
						resourceInfo.extent = new esri.geometry.Extent(bbox.xmin,bbox.ymin,bbox.xmax,bbox.ymax, spatRef);
					}

					//Create a WMS layer using the appropriate spatial reference
					wmsLayer = new esri.layers.WMSLayer(url.replace("request=GetCapabilities",""), {resourceInfo: resourceInfo});
					wmsLayer.setVisibleLayers([0]);
					wmsLayer.setImageFormat("png");
					wmsLayer.setOpacity(0.75);
					previewMap.addLayer(wmsLayer);

					//Set a listener to run a query on click
					previewMap.on("click", function(evt) {

						//Display the "loading" indicator
						$("#status").show();
						previewMap.setMapCursor("wait");
						previewMap.infoWindow.hide();

						//Record the location clicked in a global, so we can retrieve it again later
						identifyPoint = evt;

						//Calculate the layer extent in its native SRS
						var extent = previewMap.extent;
						var points = new Array();
						points.push(new esri.geometry.Point(extent.xmin, extent.ymin, extent.spatialReference));
						points.push(new esri.geometry.Point(extent.xmax, extent.ymax, extent.spatialReference));

						//Project these coordinates into the SR of the WMS layer
						var geometryService = new esri.tasks.GeometryService("http://sampleserver3.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer");
						geometryService.evt = evt;
						geometryService.project(points, wmsLayer.spatialReference, function(projPoints){

							//We now have coordinates in the SR of the WMS layer, so use them to generate the GetFeatureInfo query
							//(We are forcing the use of version 1.1.1 in order to make the stupid thing work.....)
							var extent = new esri.geometry.Extent(projPoints[0].x, projPoints[0].y, projPoints[1].x, projPoints[1].y, projPoints[0].spatialReference);
							var data = {
							   REQUEST: 'GetFeatureInfo',
							   SERVICE: 'WMS',
//							   VERSION: wmsVersion,
							   VERSION: "1.1.1",
							   SRS: 'EPSG:' + extent.spatialReference.wkid.toString(),
							   LAYERS: wmsLayerName,
							   FORMAT: 'image/png',
							   BBOX: extent.xmin.toString() + "," + extent.ymin.toString() + "," + extent.xmax.toString() + "," + extent.ymax.toString(),
							   WIDTH: previewMap.width.toString(),
							   HEIGHT: previewMap.height.toString(),
							   QUERY_LAYERS: wmsLayerName,
							   X: identifyPoint.screenPoint.x.toString(),
							   Y: identifyPoint.screenPoint.y.toString()
							};

							//Insert the appropriate syntax for this version (not currently in use)
//							if(wmsVersion === "1.3.0") {
//								data.CRS = 'EPSG:' + extent.spatialReference.wkid.toString();
//							} else {
//								data.SRS = 'EPSG:' + extent.spatialReference.wkid.toString();
//							}

							var mapProxy = configOptions.mapProxy || "map_proxy.php";
							$.ajax({
								type: 'GET',
								url: mapProxy + "?" + cleanURL,
								data: data,
								dataType: "xml",
								success: function (xml) {
									var jsonContents = $.xml2json(xml);

									//If the response has a FIELDS object, a valid value was returned. Show it in the infoWindow
									if(jsonContents.FIELDS !== undefined) {
										previewMap.infoWindow.clearFeatures();
										var content = "<table id='wmsIdentify'>";
										for(key in jsonContents.FIELDS) {
										  content += "<tr><td>" + key + "</td><td>" + jsonContents.FIELDS[key] + "</td></tr>";
										}
										content += "</table>";
										previewMap.infoWindow.setContent(content);

										//Set the infoWindow's size
										if(configOptions.infoWindow) {
											previewMap.infoWindow.resize(configOptions.infoWindow.width, configOptions.infoWindow.height);
										}

										//Display the infoWindow
										previewMap.infoWindow.show(identifyPoint.mapPoint);
									}

									//Hide the "loading" indicator
									$("#status").hide();
									previewMap.setMapCursor("default");

								},
								error: function (jqXHR, textStatus, errorThrown) {
									console.log("There was problem with the Identify functionality");
									previewMap.setMapCursor("default");
									$("#status").hide();
								}
							});

						}, function(err) {
							console.log("There was a problem calculating the extent of the WMS layer");
							previewMap.setMapCursor("default");
							$("#status").hide();
						});
					});
				}

			},
			error: function (err) {
				alert("error with WMS layer: " + err.message);
			}
		});

		//Zoom to the layer's extent
		if(bbox !== undefined && bbox !== null) {
			zoomToBbox(bbox);
		}

	} else { // if (previewType !== 'undefined')
		//Other preview types are displayed in an iFrame. Set the source for the iFrame to this URL
		setIFrame(url);
	}

	//Find the specified section from the URL. This is prefaced with & or ?
	function URLLookup( value ){
	    var results = (new RegExp("[\\?&]"+value+"=([^&#]*)")).exec(window.location.href);
	    if ( results == null ) {return null}
	    else {return results[1]}
	}

	//A non-spatial URL has been used, so set the IFrame's contents to this URL
	function setIFrame(url) {
		$("#previewIFrame").attr('src', url);
		$("#previewIFrame").css('background', "none");
		$("#previewMap").hide();
		$("#previewIFrame").show();
	}

	function zoomToBbox(bbox) {
		bbox = bbox.split(",");
		var extent = new esri.geometry.Extent(parseFloat(bbox[0]),parseFloat(bbox[1]),parseFloat(bbox[2]),parseFloat(bbox[3]),{"wkid":4326});
		var extentWM = esri.geometry.geographicToWebMercator(extent);
		previewMap.setExtent(extentWM, true);
	}

	function runIdentify(evt) {

		//don't run this function if the user has clicked on a graphic
		if(evt.graphic) {return null;}
		identifyPoint = evt.mapPoint;

		//Hide the infoWindow if it's already op[en
		previewMap.infoWindow.hide();

		//Set a waiting cursor to let the user know there's a process running. Revert to the
		//standard cursor when the Identify tasks returns a result
		previewMap.setMapCursor("wait");

		//Report the number of selected features in the popup
		dojo.connect(previewMap.infoWindow,"onSelectionChange",function(){
			var idx = previewMap.infoWindow.selectedIndex + 1;
			previewMap.infoWindow.setTitle("(" + idx + " of " + previewMap.infoWindow.count + ")");
		});

	    //map each identify layer to a new identify task, using the layer url
	    var tasks = dojo.map(identifyLayers, function(layer) {
	        return new esri.tasks.IdentifyTask(url);
	    });

	    //map each identify task to a new dojo.Deferred
	    var defTasks = dojo.map(tasks, function (task) {
	        return new dojo.Deferred();
	    });

	    //Use all of these Deferreds in a DeferredList
	    var dlTasks = new dojo.DeferredList(defTasks);
	    dlTasks.then(showIDResults); //chain showIDResults onto the DeferredList

	    //Use 'for' instead of 'for...in' to sync tasks with defTasks
	    for (var i=0;i<tasks.length;i++) {
	        try {

	        	//Configure the identify parameters
	        	var idParams = new esri.tasks.IdentifyParameters();
	        	idParams.tolerance = configOptions.identifyTolerance || 10;
	        	idParams.returnGeometry = true;
	        	idParams.layerOption = esri.tasks.IdentifyParameters.LAYER_OPTION_VISIBLE;
	        	idParams.width = previewMap.width;
	        	idParams.height = previewMap.height;
	        	idParams.geometry = evt.mapPoint;
	        	idParams.mapExtent = previewMap.extent;
	        	idParams.layerIds = [i];

				//Execute the task
	            tasks[i].execute(idParams, defTasks[i].callback, defTasks[i].errback); //Execute each task
	        } catch (e) {
	            console.log("Error caught");
	            console.log(e);
	            defTasks[i].errback(e); //If you get an error for any task, execute the errback
	        }
	    }
	}

	//Identify results have been found. Display them in an infoWindow
	function showIDResults(r) {
		var results = [];
		r = dojo.filter(r, function (result) {
		    return r[0];
		}); //filter out any failed tasks
		for (var i=0;i<r.length;i++) {
		    results = results.concat(r[i][1]);
		}

		//Build up an array of features to be returned to the infoWindow
		var features = [];

		//Set an infoWindow for each feature
		for (var j = 0; j < results.length; j++) {
			var feature = results[j].feature;
			var attributes = feature.attributes;
			var infoTemplate = new esri.InfoTemplate;
			infoTemplate.setTitle="";
			feature.setInfoTemplate(infoTemplate);
			features.push(feature);
		}

		//Display the infoWindow if there are any features
		if(features.length > 0) {
			previewMap.infoWindow.setFeatures(features);
			if(features.length > 1) {
				previewMap.infoWindow.setTitle("(" + (previewMap.infoWindow.selectedIndex + 1) + " of " + previewMap.infoWindow.count + ")");
			} else {
				previewMap.infoWindow.setTitle();
			}
			previewMap.infoWindow.show(identifyPoint);

		} else {
			previewMap.infoWindow.clearFeatures();
		}

		//Revert the mouse cursor to normal and hide the loading indicator
		previewMap.setMapCursor("default");
		$("#status").hide();

		return features;

	}

	function inArray(a) { //tests whether a value is found in an array
	  var o = {};
	  var len = a.length
	  for(var i=0; i < len; i++)
	  {
	    o[a[i]]='';
	  }
	  return o;
	}

});
