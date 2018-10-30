/*!
  GeoPortal Genie by Stephen Lead
  GeoPortalGenie.com
*/

//It shouldn't be necessary to modify any of these scripts, as doing so will complicate the upgrade path.

//Namespace
if (!this.gpGenie || typeof this.gpGenie !== 'object') {
    this.gpGenie = {};
}

/* Map Model */
gpGenie.MapModel = Backbone.Model.extend({
    initialize: function (args) {
        _.bindAll(this, 'updateMapExtent', 'updateGeocoder', 'clearGeocoder', 'startGeocoder', 'buildExtentLayers');

		//Instantiate the map object, using the options specified in the arguments
		this.map = new esri.Map(args.mapDiv,args.mapOptions);

		//If this map uses the Bing Maps basemap
		if(args.bingMapsOptions) {
			var mapStyle = esri.virtualearth.VETiledLayer.MAP_STYLE_AERIAL_WITH_LABELS;
			switch(configOptions.bingMapsStyle){
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

			var veTileLayer = new esri.virtualearth.VETiledLayer({
				bingMapsKey: configOptions.bingMapsOptions.bingMapsKey,
				mapStyle: mapStyle
			});
			this.map.addLayer(veTileLayer);
		}

		//Start the geocoder
		this.startGeocoder(args);

//		Create a graphics layer, which shows the extents on the map
//		dojo.connect(this.map, "onLoad",this.buildExtentLayers);

	},
    startGeocoder: function(args) {
    	//Instantiate the geocoder
    	this.geocoder = new esri.dijit.Geocoder({
    		map: this.map,
    		arcgisGeocoder: args.geocoderOptions
    	},args.geocoderDiv);
    	this.geocoder.startup();

    	//Display a marker showing the location found. Remove it when the X is clicked.
    	this.geocoder.geocodeLayer = new esri.layers.GraphicsLayer();
    	this.map.addLayer(this.geocoder.geocodeLayer);
    	if(args.geocoderOptions.markerType === "picture") {
    		this.geocoder.geocodeSymbol = new esri.symbol.PictureMarkerSymbol(
    			args.geocoderOptions.markerImage,
    			args.geocoderOptions.markerWidth,
    			args.geocoderOptions.markerHeight
    		);
    	} else if (args.geocoderOptions.markerType === "simple") {
    		//TODO: hook up the ability to specify a simple marker symbole

    	}
    	dojo.connect(this.geocoder, "select", this.updateGeocoder);
    	dojo.connect(this.geocoder, "onClear", this.clearGeocoder);
    },
    clearGeocoder: function() {
    	//Clear the geocode layer - remove the graphic
    	this.geocoder.geocodeLayer.clear();
    },
    updateGeocoder: function(result) {
    	//Display a symbol on the map showing the geocode location
    	if(result) {
    		var geometry = result.feature.geometry;
    		var attributes = result.feature.attributes;
    		this.geocoder.geocodeLayer.clear();
    		var graphic = new esri.Graphic(geometry, this.geocoder.geocodeSymbol);
    		this.geocoder.geocodeLayer.add(graphic);
    	}
    },
    buildExtentLayers: function() {

    	//Build a graphics layer to hold the search records
    	this.extentLayer = new esri.layers.GraphicsLayer();
    	this.map.addLayer(this.extentLayer);

		//TODO: replace this hard-coded symbol with the ability to specify it in the config file
		this.mapSymbol = new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_NULL,
		  new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_DASHDOT,
		  new dojo.Color([255,0,0]), 2),new dojo.Color([255,255,0,0.25]));

		this.highlightSymbol = new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_SOLID,
		  new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID,
		  new dojo.Color([255,0,0]), 2),new dojo.Color([255,255,0,0.75]));

		//Listen for changes to the map extent, and set the initial bounding box
		dojo.connect(this.map, "onExtentChange", this.updateMapExtent);
		var extentDD = esri.geometry.webMercatorToGeographic(this.map.extent);
		this.bbox = extentDD.xmin + "," + extentDD.ymin + "," + extentDD.xmax + "," + extentDD.ymax;

    },
    updateMapExtent: function (extent) {
    	//Store the bounding box coordinates, and trigger an event so we know to re-run the search
    	var extentDD = esri.geometry.webMercatorToGeographic(extent);
    	this.bbox = extentDD.xmin + "," + extentDD.ymin + "," + extentDD.xmax + "," + extentDD.ymax;

        this.trigger('mapExtentUpdated');
    }
});

/* REST Model */
gpGenie.RestModel = Backbone.Model.extend({
    initialize: function (args) {
        _.bindAll(this, 'buildSearchQuery', 'runSearchQuery');

        //Bind to the map model
        this.mapModel = args.mapModel;
        if(this.mapModel !== null) {
	        this.mapModel.on('mapExtentUpdated', this.onSearchTermsUpdated, this);
	    }
        this.on('searchTermsUpdated', this.onSearchTermsUpdated, this);

        //Set the default query parameters, using a proxy if required.
        //TODO: verify that the URL and proxy are valid
        this.gpServer = args.gpServer;
        this.proxy = args.proxy || null;
        this.queryBase = configOptions.proxy + "?mode=JSONP&url=" + configOptions.geoportalServer; //proxy and server

        //Container to hold info/error messages
        this.infoMessageContainer = args.infoMessageContainer;

    },
    buildSearchQuery: function () {

    	//Reset the startIndex variable
    	this.startIndex = 1;

    	//Build up the query string, based on the proxy, server, and parameters. We use a combination of
    	//encodeURIComponent and hard-coding the parameters, due to quirks in the GeoPortal REST API
    	var advancedMode = $("#advancedToggle").hasClass("advancedOn");
    	var spatialRel = $("#filterMap").val();
    	var searchString = $('#txtSearch').val();

    	//Start building the query. The format depends on the GeoPortal Server type.
    	var query = "rest/find/document?";
//    	query += encodeURIComponent("rid=local");
		  query += "rid=local";

       	//Specify the maximum number of records per page
       	if(configOptions.pagination && configOptions.pagination.itemsPerPage) {
//       		query += encodeURIComponent("&max=" + configOptions.pagination.itemsPerPage);
       		query += "&max=" + configOptions.pagination.itemsPerPage;
       	}

       	//add date and theme filters
       	if(geoPortalGenie.useAdvanced) {

          //Add the appropriate map contraint
          if(spatialRel !== "anywhere") {
            query += "&spatialRel=" + spatialRel;
            query += "&bbox=" + this.mapModel.bbox;
          }

          //To/From date ranges. TODO: validate the dates
          var fromDate = $("#txtFromDate").val();
          if(fromDate !== "") {
            query += "&after=" + fromDate;
          }
          var toDate = $("#txtToDate").val();
          if(toDate !== "") {
            query += "&before=" + toDate;
          }
       	}

       	//Handle the text input. We need to manually encode the components due to particular requirements around
       	//spaces, +, double-escaping, etc.
       	var searchText = $("#txtSearch").val();
       	searchText = searchText.replace(/ /g, '+'); //replace spaces with +
       	searchText = searchText.replace(/\+and\+/g, '+AND+'); //replace and with AND
       	searchText = searchText.replace(/\+or\+/g,"+").replace(/\+OR\+/g,"+"); //replace or with +

       	//Next, depending on whether the user has also specified a data theme.....
       	var dataTheme = $("#filterThemes").val();
       	if(geoPortalGenie.useAdvanced && dataTheme != null && dataTheme != 'all') {
       		dataTheme = dataTheme.replace(" ","+");
	    	query += "&searchText=dataTheme:"
       		var themeQuery = dataTheme;
       		if(searchText !== "") {
       			themeQuery += "+AND+" + searchText;
       		}
       		query += themeQuery;
       	} else {
       		query += "&searchText=" + searchText;
       	}

    	//Store the query so it may be run again from the pagination buttons
    	this.query = query;

    	//Run the query:
      this.runSearchQuery(query);
    },
    runSearchQuery: function(query) {
    	//Submit the query to the GeoPortal Server's REST API

    	//Remove the warning colour, and add the spinner
    	$("#btnRunSearch").addClass("btn-warning");
    	$("#btnRunSearch i").addClass("icon-spinner");
    	$("#btnRunSearch i").addClass("icon-spin");

    	//Remove the error/warning messages
    	$(this.infoMessageContainer).fadeOut(100);

    	var request = $.ajax({
    	    url: configOptions.proxy,
    	    data: {requrl: configOptions.geoportalServer + query + "&f=json"},
    	    dataType: 'json',
    	    context: this,
    	    success: function(response) {

    	    	//Check for errors
    	    	if(response === null && response === undefined) {
    	    		this.trigger("clearCollections", configOptions.errorMessage);

    	    	} else {
    	    		//Send the results to the collection
    	    		this.parseResults(response);
    	    	}
    	    },
    	    error: function(error) {
    	    	this.trigger("clearCollections", configOptions.errorMessage);
    	    }

    	});
     },
    buildCategories: function() {

		//Build the Categories and SubCategories, based on the config file options
		var numCats = configOptions.categories.length;
		var categoriesHTML = '';
		for (var t = 0; t < numCats; t++) {
			var category = configOptions.categories[t];
			var name = category.heading;
			categoriesHTML += '<div class="accordion-group"><div class="accordion-heading">';
			categoriesHTML += '<a class="accordion-toggle" data-toggle="collapse" data-parent="#browseThemesDiv" href="#collapse_' + name + '">' + name + '</a>';
			categoriesHTML += '</div><div id="collapse_' + name + '" class="accordion-body collapse in"><div class="accordion-inner"><ul id="inner_' + name + '"></ul></div></div></div>';
		}

		//Add an "other" Theme
		categoriesHTML += '<div class="accordion-group"><div class="accordion-heading">';
		categoriesHTML += '<a class="accordion-toggle" data-toggle="collapse" data-parent="#browseThemesDiv" href="#collapse_Other">Other</a>';
		categoriesHTML += '</div><div id="collapse_Other" class="accordion-body collapse in"><div class="accordion-inner"><ul id="inner_Other"></ul></div></div></div>';

		//Populate the panel
		jQuery("#categoriesDiv").html(categoriesHTML);

		//Run the query to extract the themes from the server
		var maxBrowseRecords = configOptions.maxBrowseCategories || 50;
		var browseQuery = "rest/index/stats/fields?f=json&field=" + configOptions.categoryIdentifier + "&max=" + maxBrowseRecords;

    	var request = $.ajax({
		    url: configOptions.proxy,
		    data: {requrl: configOptions.geoportalServer + browseQuery},
		    dataType: "json",
		    success: function(response) {

				//build the Browse table from the response. Scroll through each subtheme - if it's found
				//within a Theme in the config, add it to that theme's collapsible panel, otherwise add it to an Other category
				var numCats = configOptions.categories.length; //read the Themes from the configuration file
				var subThemeResponses = response.terms; //read the subCategories from the GeoPortal response
				if(subThemeResponses.length > 0) {

					//Iterate throug each subTheme response and place it under the correct Theme
					for (var i = 0; i < subThemeResponses.length; i++) {
						var thisSubcategory = subThemeResponses[i];
						var thisValue = thisSubcategory.name.replace(/ /g,"+"); //replace any spaces with +
						var thisCount = thisSubcategory.documents;
						var categorized = false;

						//Check if this sub-theme should be placed underneath a Theme
						for (var j = 0; j < numCats; j++) {
							var category	 = configOptions.categories[j];
							var subCategories = category.subcategories
							for (var k = 0; k < subCategories.length; k++) {

								//If this subTheme falls within the Theme's list of subCategories...
								if(thisSubcategory.name === subCategories[k].name) {
									categorized = true;
									if(subCategories[k].alias) {
										var html = "<li class = 'liBrowseTheme' data-value = '" + thisValue + "'>" + subCategories[k].alias + " (" + thisCount + ")</li>";
									} else {
										var html = "<li class = 'liBrowseTheme' data-value = '" + thisValue + "'>" + thisValue + " (" + thisCount + ")</li>";
									}
									jQuery("#inner_" + category.heading).append(html);
									break;
								}
							}
						}

						//If this subTheme doesnt have a Theme, use the Other category
						if(!categorized) {
							var html = "<li class = 'liBrowseTheme' data-value = '" + thisValue + "'>" + thisSubcategory.name + " (" + thisCount + ")</li>";
							jQuery("#inner_Other").append(html);
						}
					}

					//When the user clicks on a sub-Theme, retrieve its records from the server
					jQuery('.liBrowseTheme').unbind();
					jQuery('.liBrowseTheme').click(function () {
						$(".liBrowseTheme").removeClass("active");
						$(this).addClass("active");
						var value = this.dataset.value;
						geoPortalGenie.restModel.buildBrowseQuery(value);
					});


				} else {

					//there were no records found
					updateState("empty");
				}
			},
			error: function(error) {
				updateState("error");
			}
		});
    },
    buildBrowseQuery: function(category) {

    	//reset the startIndex
    	this.startIndex = 1;

    	//Add the text search term to the query
    	var query = "rest/find/document?searchText=dataTheme:" + category;

       	//Specify the maximum number of records per page
       	if(configOptions.pagination && configOptions.pagination.itemsPerPage) {
       		query += "&max=" + configOptions.pagination.itemsPerPage;
       	}
    	this.runSearchQuery(query);

    	//Store the query so it may be run again from the pagination buttons
    	this.query = query;

    },
    onSearchTermsUpdated: function () {
    	//The search terms have been updated, so highlight the Search button
    	$("#btnRunSearch").addClass("btn-warning");

    	//Remove the warning message
    	$(this.infoMessageContainer).fadeOut(100);
	},
    parseResults: function(results) {

		//Hold a record of the results on the REST model
		this.results = results;

		//Send them to the ResultsCollection
		if(results === null || results === undefined || results.records === undefined || results.records.length === 0) {
			this.trigger("clearCollections", configOptions.noResultsMessage);
		} else if(!results.totalResults) {
			//The geoserver doesn't support returning the total number of records as a JSON object.
			//Run a second query with output = GEORSS, to get the number of results (we don't just use
			//this output by default since it's not as nicely formatted as the JSON response)

			var request = $.ajax({
			    url: configOptions.proxy,
			    data: {requrl: configOptions.geoportalServer + this.query + "&f=georss"},
			    context: this,
			    success: function(response) {

			    	var jsonResults = $.xml2json(response).channel;
			    	this.results.totalResults = parseInt(jsonResults.totalResults);
			    	this.results.itemsPerPage = parseInt(jsonResults.itemsPerPage);

			    	//Send the results to the collection
			    	this.trigger('resultsReturned', this.results, this);
			    					},
			    error: function(error) {
			    	//this.trigger("clearCollections", configOptions.errorMessage);
			    	alert("error with retrieving the georss results");
			    }

			});

		} else {
			this.trigger('resultsReturned', results, this);
		}
    },
    addCommas: function(nStr) {
        nStr += '';
        var x = nStr.split('.');
        var x1 = x[0];
        var x2 = x.length > 1 ? '.' + x[1] : '';
        var rgx = /(\d+)(\d{3})/;
        while (rgx.test(x1)) {
            x1 = x1.replace(rgx, '$1' + ',' + '$2');
        }
        return x1 + x2;
    }
});

/* ResultItem Model */
gpGenie.ResultItem = Backbone.Model.extend({

});

/* ResultItem View - for drawing the results in the table*/
gpGenie.ResultItemView = Backbone.View.extend({
    initialize: function (args) {
        this.collection = args.collection;
    },
    tagName: 'tr',
    events: {
        'mouseenter': 'onMouseEnter',
        'mouseleave': 'onMouseLeave'
    },
    onMouseEnter: function (evt) {
        //Highlight the polygon on the map
        if(this.collection.mapModel !== null) {
	        var bbox = this.model.get('bbox');
	        this.collection.highlightFeature(bbox);
	    }

        //highlight the record on the page
        this.$el.addClass('active');
    },
    onMouseLeave: function () {
    	if(this.collection.mapModel !== null) {
	        var id = this.model.get('id');
	        this.collection.unHighlightFeature(id);
	    }
        this.$el.removeClass('active');
    },
    render: function () {

        // Compile the template using underscore
        var template = _.template( $("#result-item-template").html(), this.model.toJSON() );
        // Load the compiled HTML into the Backbone "el"
        this.$el.html( template );
        return this;

    }
});

/* The Collection of ResultItem Models */
gpGenie.ResultsCollection = Backbone.Collection.extend({
    initialize: function (args) {

        this.mapModel = args.mapModel;
        this.restModel = args.restModel;
        this.restModel.on('resultsReturned', this.onResultsReturned, this);

    },
    model: gpGenie.ResultItem,
    onResultsReturned: function(results) {

    	//Send the results to the ResultsView's update function
    	this.totalResults = results.totalResults;
    	this.itemsPerPage = results.itemsPerPage;

    	if(this.totalResults === 0) {
    		console.log("no results returned. This should have been trapped elsewhere");
    		return null;
    	} else if(this.totalResults === undefined) {
    		console.log("no totalresults detected");
    		return null;
    	}
	    this.reset(results.records);
    },
    highlightFeature: function (bbox) {

        //Highlight the feature's bounding box on the map. Triggered by hovering on a table record
        var polygon = new esri.geometry.Polygon(new esri.SpatialReference({wkid:4326}));
        polygon.addRing([[bbox[0],bbox[1]],[bbox[0],bbox[3]],[bbox[2],bbox[3]],[bbox[2],bbox[1]],[bbox[0],bbox[1]]]);

        var graphic = new esri.Graphic(polygon, this.mapModel.highlightSymbol);
        this.mapModel.map.graphics.clear();
        this.mapModel.map.graphics.add(graphic);
        this.mapModel.extentLayer.setOpacity(0.25);
    },
    unHighlightFeature: function () {

    	//Remove the highlight on the map, and restore the layer's opacity
    	this.mapModel.map.graphics.clear();
    	this.mapModel.extentLayer.setOpacity(1);
    }
});

gpGenie.ResultsView = Backbone.View.extend({
    initialize: function (args) {
        _.bindAll(this, 'update', 'showMessage');

        this.mapModel = args.mapModel;
        this.restModel = args.restModel;
        this.resultSetTemplate = ich[args.resultSetTemplate];
//        this.resultItemTemplate = args.resultItemTemplate;
        this.collection.on('reset', this.update, this);
        this.restModel.on('clearCollections', this.showMessage, this);

        //Add the page elements to display the results
        $(this.options.resultsContainer).append(this.el);
    },
    className: 'results-set',
    update: function () {

    	//Update the table response, plus the map polygons
		this.$el.html(this.resultSetTemplate({ title: this.options.title || null }, true));
		var tbody = this.$('.results-table tbody').children().remove().unbind().end();

		//Remove all records from the map
		if(this.collection.mapModel !== null) {
			this.mapModel.extentLayer.clear();
		}

		//Set up pagination
		if(configOptions.pagination) {
			var paginationOptions = configOptions.pagination;

			//Bind the Geoportal Genie Rest Model to the click event, so we can easily access it when the user clicks on a page
			//Note that if the bootstrap paginator script is ever updated, this line within bootstrap paginator will need to be edited:
			//this.$element.trigger("page-clicked", [event, type, page, this.options.restModel]);
			paginationOptions.restModel = this.restModel;

			//figure out which page we're on
			var startIndex = this.restModel.startIndex || 1;
			var pageNumber = Math.round((startIndex / configOptions.pagination.itemsPerPage) + 0.5);
			if(pageNumber < 1) {pageNumber = 1;}
			paginationOptions.currentPage = pageNumber;

			//Re-run the search for this page, when a page number is clicked
			paginationOptions.onPageClicked = function(e,originalEvent,type,page,restModel){
				//Figure out the start index for the search. This is based on the page x number of records per page
				restModel.startIndex = (page * configOptions.pagination.itemsPerPage - configOptions.pagination.itemsPerPage + 1);

				//Retrieve the query from the rest model
				var query = restModel.query;
				query += "&start=" + restModel.startIndex;
				restModel.runSearchQuery(query);
           }

            //Calculate the number of pages required in the paginator
            var numPages = Math.round((this.collection.totalResults / this.collection.itemsPerPage) + 0.5);
            paginationOptions.totalPages = numPages, //how many pages to list?

            //Configure pagination using the bootstrap paginator plugin
	        $('.pagination').bootstrapPaginator(paginationOptions);
	        var start = this.restModel.startIndex || 1;
			var end = start + this.collection.length - 1;
	        var total = this.collection.totalResults;
	        $('.pagination').prepend("<span class='count'>" + this.restModel.addCommas(start) + " to " + this.restModel.addCommas(end) + " of " + this.restModel.addCommas(total) + " records</span>");

        	//Only show the pagination if it's required
        	if(numPages > 1) {
        		$('.pagination ul').show();
        	} else {
        		$('.pagination ul').hide();
        	}
        }

        //Array of els to draw in the table
        var els = [];

        //Reset the full extent variable
        this.fullExtent = null;

        //loop the collection...
        var resultSetTemplate = this.options.resultSetTemplate;
        this.collection.each(function (model) {

        	//Apply some formatting and logic to the links
        	var links = model.attributes.links;
        	var numLinks = links.length;
        	for (var i = 0; i < numLinks; i++) {
        		var link = links[i];
        		var linkType = link.type;
        		link.ignore = false;
        		link.override = false;
        		link.label = linkType;
        		link.target = "_blank";

        		//The user has the option over over-riding the default link behavior,
        		//by specifying a special behavior in the config file
        		if (configOptions.customLinkBehavior) {
        			if(configOptions.customLinkBehavior[link.type] !== undefined) {
        				link.override = true;
        				var thisLink = configOptions.customLinkBehavior[link.type];

        				//work out what to do with this link override
        				if (thisLink.label) {link.label = thisLink.label;}

        				//TODO: add additional link behaviours here

        			}
        		}

        		if(!link.override) {
	        		if (linkType === "open" || linkType === "website") {
	        		  if(link.href.indexOf(".zip") > 0) {
	        		    link.label = "Download";
	        		  } else {
	        			  link.label = "Open";
	        			}
	        		} else if (linkType === "agslyr") {
	        			link.label = "ArcGIS (.lyr)";
	        			link.target = "_self";
	        		} else if (linkType === "agskml") {
	        			link.label = "Globe (.kml)";
	        			link.target = "_self";
	        		} else if (linkType === "agsnmf") {
	        			link.label = "ArcGIS Explorer";
	        			link.target = "_self";
	        		} else if (linkType === "preview") {
	        			link.label = "Preview";

	        			//Determine the preview URL
	        			var idx = link.href.indexOf("&url=");//the starting point of the URL
	        			var idx2 = link.href.indexOf("%26", idx + 1);//the next encoded &
	        			var idx3 = link.href.indexOf("&", idx + 1); //the next unencoded &
	        			var idx4 = Math.min(idx2, idx3);//therefore, the first encoded or unencoded &
	        			var url = link.href.substr(idx + 5,idx4 - idx - 5); //the part of the URL before the first &
	        			url = decodeURIComponent(url);

	        			//Determine whether there is a preview type
	        			if(link.href.indexOf("&resourceType=") > -1) {
	        				var idx = link.href.indexOf("&resourceType=");
	        				var idx2 = link.href.indexOf("%26", idx + 1);//the next encoded &
	        				var idx3 = link.href.indexOf("&", idx + 1); //the next unencoded &
	        				var idx4 = Math.min(idx2, idx3);//therefore, the first encoded or unencoded &
	        				var previewType = link.href.substr(idx + 14,idx4 - idx - 14); //the part of the &resource= before the first &
	        			}

	        			//Store the feature's BBOX for spatial preview types
	        			if(previewType === "ags" || previewType === "wms") {
		        			var bbox = model.attributes.bbox;
		        			url += "&bbox=" + bbox;
		        		}

	        			//Write the properties to the link
	        			link.url = url;
	        			link.previewType = previewType || "unknown";

	        		} else if (linkType === "details") {
	    				link.label = "Details";
	    				link.uuid = model.attributes.id;
	    			} else if (linkType === "metadata") {
	    				link.label = "Metadata";
	        		} else if (linkType === "thumbnail") {
						link.label = "Thumbnail";
	           		//Other link types are not currently supported, so ignore them
	           		} else {
	        			link.ignore = true;
	        		}
	        	}
        	}

        	//rendering a view for each model in the collection
            var view = new gpGenie.ResultItemView({
            	model: model,
            	resultSetTemplate: resultSetTemplate,
            	collection: this.collection,
            });

            //Create a new feature and add it to the extent layer
            if(this.collection.mapModel !== null) {
	            var bbox = model.attributes.bbox;
	            var polygon = new esri.geometry.Polygon(new esri.SpatialReference({wkid:4326}));
	            polygon.addRing([[bbox[0],bbox[1]],[bbox[0],bbox[3]],[bbox[2],bbox[3]],[bbox[2],bbox[1]],[bbox[0],bbox[1]]]);
	            var id = model.attributes.id;
	            var attributes = [{"id": id}];
	            var graphic = new esri.Graphic(polygon, this.mapModel.mapSymbol, attributes);
	            this.mapModel.extentLayer.add(graphic);

	            //Expand the full extent variable
	            if(this.fullExtent === null) {
	            	this.fullExtent = polygon.getExtent();
	            } else {
	            	this.fullExtent = this.fullExtent.union(polygon.getExtent());
	            }

	            //Add a Zoom To link
	            var bboxLink = {
	            	"type": "bbox",
	            	"label": "Zoom To",
	            	"bbox": bbox
	            };
	            model.attributes.links.push(bboxLink);
	        }

	        //add the results to the table array
	        els.push(view.render().el);

	        //Results have been returned from the query. Remove the spinner
	        //TODO: remove this from the backbone??
	        $("#btnRunSearch i").removeClass("icon-spinner");
	        $("#btnRunSearch i").removeClass("icon-spin");
	        $("#btnRunSearch").removeClass("btn-warning");

        }, this);

        //push the table array into this View's "el"
        tbody.append(els);
        this.$el.show();

        //Zoom the map to the full extent of all found features
        if(configOptions.zoomAfterSearch && this.fullExtent !== null) {
	        this.mapModel.map.setExtent(this.fullExtent, true);
	    }

    },
    showMessage: function(message) {
    	//Remove the results and display the info message if configured
    	this.$el.hide();
    	if(message) {
    		$(this.restModel.infoMessageContainer).html(message);
	    	$(this.restModel.infoMessageContainer).show();
		}

    	//Remove all records from the map
    	if(this.mapModel !== null) {this.mapModel.extentLayer.clear();}

    	//Remove the spinner
    	//TODO: remove this from the backbone??
    	$("#btnRunSearch i").removeClass("icon-spinner");
    	$("#btnRunSearch i").removeClass("icon-spin");
    	$("#btnRunSearch").removeClass("btn-warning");
    },
    render: function () {
        this.$el.html(this.resultSetTemplate({ title: this.options.title || null }, true));

        return this;
    }
});
