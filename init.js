/*!
  GeoPortal Genie by Stephen Lead
  GeoPortalGenie.com
*/

//Initialization script. The user may choose to use a local copy of this file in order to control behaviors

var geoPortalGenie = {};

require(["esri/map", "dojo/domReady!", "esri/dijit/Geocoder", "esri/layers/graphics", "esri/virtualearth/VETiledLayer"], function() {

	//Read in the options from the configuration file
	if(!configOptions.mapOptions || !configOptions.arcgisGeocoder) {
		//TODO: replace with a nicer error message
		alert("please check your configuration file for errors");
		return null;
	}

	/*********************************************************************/
	//Backbone MVC:

	//Create the new map model, based on these options
	if(document.getElementById("mapDiv") !== null) {
		geoPortalGenie.mapModel = new gpGenie.MapModel({
	    	mapDiv: "mapDiv", //ID of the DIV holding the Esri map
	    	mapOptions: configOptions.mapOptions,
	    	geocoderOptions: configOptions.arcgisGeocoder,
	    	geocoderDiv: "geocoderDiv", //ID of the DIV for the geocoder widget
	    	bingMapsOptions: configOptions.bingMapsOptions || null
	    });

	    //Create a graphics layer, which shows the extents on the map
	    dojo.connect(geoPortalGenie.mapModel.map, "onLoad",geoPortalGenie.mapModel.buildExtentLayers);

	} else {
		geoPortalGenie.mapModel = null;
	}

    //Create a new REST API model, to interact with the GeoPortal REST API
    geoPortalGenie.restModel = new gpGenie.RestModel({
    	mapModel: geoPortalGenie.mapModel,
    	gpServer: configOptions.geoPortalServer,
    	infoMessageContainer: '#infoMessage' //ID of the DIV holding the information message
    });

    //Create a new Details model, to handle fetching Details for an individual record
    geoPortalGenie.detailsModel = new gpGenie.DetailsModel({
    	mapModel: geoPortalGenie.mapModel,
    	restModel: geoPortalGenie.restModel
    });

    //Create a new Details view, to handle displaying the details for an individual record
    geoPortalGenie.detailsView = new gpGenie.DetailsView({
    	detailsModel: geoPortalGenie.detailsModel,
    	detailsContainer: "#modalResults",
    	detailsTemplate: "#details-template"
    });

    //Results collection
    geoPortalGenie.resultsCollection = new gpGenie.ResultsCollection({
        mapModel: geoPortalGenie.mapModel,
        restModel: geoPortalGenie.restModel
    });

    //Results view
    geoPortalGenie.resultsView = new gpGenie.ResultsView({
    	mapModel: geoPortalGenie.mapModel,
    	restModel: geoPortalGenie.restModel,
        collection: geoPortalGenie.resultsCollection,
        resultsContainer: '#searchResults', //ID of the DIV for the results
        resultSetTemplate: 'results-set-template' //ID of the HTML template for the results set
        //TODO: the following is currently hard-coded in geoportalGenie.js and should instead be a parameter:
//        resultItemTemplate: "#result-item-template" //ID of the HTML template for each individual result
    });

    /*********************************************************************/
    //Add some event listeners. These are separated from the Backbone scripts to enable
    //easy customization by developers, in order to personalize the page.

    //Customise this section as necessary to show/hide the Advanced Search Parameters in your system.
    //Eg, you could use a checkbox or button - or just leave the Advanced Search Parameters on the whole time.
    //The key point is to change the value of geoPortalGenie.useAdvanced to true/false
    $("#advancedToggle").click(function() {toggleAdvancedSearch();});
    function toggleAdvancedSearch() {
		//Show/Hide the advanced search panel depending on the status of the button
		if($("#advancedToggle").hasClass("advancedOn")) {
			$("#advancedSearchParameters").fadeOut(100);
			$("#advancedStatus").addClass("icon-caret-down");
			$("#advancedStatus").removeClass("icon-caret-up");
			$("#advancedToggle").removeClass("advancedOn");
			geoPortalGenie.useAdvanced = false;
		} else {
			$("#advancedStatus").addClass("icon-caret-up");
			$("#advancedStatus").removeClass("icon-caret-down");
			$("#advancedSearchParameters").fadeIn(300);
			$("#advancedToggle").addClass("advancedOn");
			geoPortalGenie.useAdvanced = true;
		}
	}
	//Set the useAdvanced property for the first time. TODO: read this from local storage/cookie
	geoPortalGenie.useAdvanced = $("#advancedToggle").hasClass("advancedOn");

	//Enable tooltips
	$('.hasTooltip').tooltip({delay: { show: 1000, hide: 100 }});

	//Support placeholder text on older browsers
	$('input, textarea').placeholder();

	//Enable the date picker
	$('.datepicker').datepicker({format: 'yyyy-mm-dd'});
	$('#txtFromDate').click(function() {$('#txtToDate').datepicker('hide');});
	$('#txtToDate').click(function() {$('#txtFromDate').datepicker('hide');});

	//Build the Advanced theme search
	buildAdvancedSearchCategories();
//	$("#filterThemes").selectpicker();

	//validate the date on change
	$(".datepicker").on('changeDate', function(){
		$(this).removeClass("error");
	});
	$(".datepicker").change(function() {
	var datePattern = new RegExp(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/);
		if(datePattern.test(this.value)) {
			$(this).removeClass("error");
		} else {
			$(this).addClass("error");
		}
	});

	//Build the query when the user hits Enter, or uses the Search button. You could add other
	//triggers as required
	$('#btnRunSearch').click(function() {buildSearchQuery();});
	$('#txtSearch').keydown(function(event){
		if(event.keyCode == 13) {
		  	event.preventDefault();
			buildSearchQuery();
		}
	});

	//When the user changes any of the Advanced Search parameters, inform the model so that the
	//search may be re-run. You could optionally run the search automatically at this point (although
	//most users find this annoying)
	$(".advancedSearch").on("change", function() {geoPortalGenie.restModel.trigger("searchTermsUpdated");});

	//Set a listener for the Zoom To button
	$(document).on('click','.btnZoomTo',function(event) {
		var bbox = this.getAttribute("data-bbox");
		if(bbox !== null && bbox !== undefined) {
			bbox = bbox.split(",");
			var extent = new esri.geometry.Extent(parseFloat(bbox[0]),parseFloat(bbox[1]),parseFloat(bbox[2]),parseFloat(bbox[3]),{"wkid":4326});
			var extentWM = esri.geometry.geographicToWebMercator(extent);
			var zoomFactor = configOptions.zoomFactor || 1.5;
			geoPortalGenie.mapModel.map.setExtent(extentWM.expand(zoomFactor), true);
		}
	});

	//Set a listener for the Quick Preview button, which sends the preview layer to the main map
	$(document).on('click','.btnQuickPreview',function(event) {
		var url = this.getAttribute("data-url");
		if(url !== null && url !== undefined) {
			alert(url);
		}
	});

	//Configure the modal results dialog
	$("#modalResults").modal({
		show: false,
		keyboard: true,
		remote: true
	});

	//Thumbnails are returned in the modal popup
	$(document).on("click", ".btnThumbnailLink", function() {

		//Display the loading indicator
		$(this).button('loading');

		//Retrieve the image's source
		var img = this.getAttribute("data-img");

		//Insert a link to the original image, plus the embedded image
		var title = "";
		var contents = "<a class='thumb' target='_blank' alt='thumbnail image' title='Click the image to open in a new window' href='" + img + "'><img class='thumb' alt='thumbnail image' src='" + img + "'/></a>";

		//Show the modal dialog
		$("#modalTitle").html(title);
		$("#modalContent").html(contents);
		$("#modalResults").modal("show");
		$(this).button('reset');

	});

	//Details are returned in the modal popup based on the element's UUID
	$(document).on("click", ".btnDetailsLink", function() {

		$(this).button('loading');

		//Retrieve the details from the GeoPortal server
		var id = this.getAttribute("data-uuid");
		geoPortalGenie.detailsModel.fetchDetails(id);

	});

	function buildSearchQuery() {
		//Submit this query to the REST model. Thereafter, the Backbone models, views and collections
		//handle the results
		geoPortalGenie.restModel.buildSearchQuery();
	}

	function buildAdvancedSearchCategories() {

		//Build the Filter By Theme dropdown for the Advanced Search bar, based on the themes and subthemes in the config file
		var allCategoriesText = configOptions.allCategoriesText || "All themes";
		var html = '<option class="allCategories" value="all">' + allCategoriesText + '</option>';
		for (var t = 0; t < configOptions.categories.length; t++) {
			var category = configOptions.categories[t];
			html += '<optgroup label="' + category.heading + '">';
			for (var i = 0; i < category.subcategories.length; i++) {
				var subcategory = category.subcategories[i];
				var label = subcategory.name;
				if(subcategory.alias) {label = subcategory.alias;}
				html += '<option value="' + subcategory.name + '">' + label + '</option>';
			}
			html += '</optgroup>';
		}
		jQuery("#filterThemes").html(html);
	}
});
