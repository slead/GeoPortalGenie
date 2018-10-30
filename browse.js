/*!
  GeoPortal Genie by Stephen Lead
  GeoPortalGenie.com
*/

//Initialization script. The user may choose to use a local copy of this file in order to control behaviors

var geoPortalGenie = {};

$(function() {

	/*********************************************************************/
	//Backbone MVC:

	geoPortalGenie.mapModel = null;

    //Create a new REST API model, to interact with the GeoPortal REST API
    geoPortalGenie.restModel = new gpGenie.RestModel({
    	mapModel: geoPortalGenie.mapModel,
    	gpServer: configOptions.geoPortalServer,
    	infoMessageContainer: '#infoMessage' //ID of the DIV holding the information message
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
        resultSetTemplate: 'results-set-template', //ID of the HTML template for the results set
        resultItemTemplate: "#result-item-template" //ID of the HTML template for each individual result
    });

	//Populate the categories
	geoPortalGenie.restModel.buildCategories();

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
//		var queryBase = configOptions.proxy + "?url=" + configOptions.geoportalServer; //proxy and server
		var id = this.getAttribute("data-uuid");

		//This method returns a different result depending on the metadata schemas that are configured in the Geoportal.
		//They vary from Dublin Core, FGDC, and various ISO profiles/flavors.
//		var query = encodeURIComponent("rest/document/" + id);

		//The alternative CSW method doesn't return as many details, but does use a standardized syntax
		var query = "csw/discovery?request=GetRecordById&service=CSW&version=2.0.2&elementsetname=full";
		query += "&id=" + id;

		var request = $.ajax({
		    url: configOptions.proxy,
		    data: {requrl: configOptions.geoportalServer + query},
		    context: this,
		    success: function(response) {
				//Send the results to the collection
				var jsonResult = $.xml2json(response);

				//Handle the details when using the CSW method
				handleDetails(jsonResult.Record);

				//Work out how to handle the details - they vary depending on the metadata schema used
//				handleDetails(jsonContents.Record);
			},
			error: function(error) {
				var message = "error with Details query"
				alert(message);
			}
		});

	});

	function handleDetails(details) {


		//Insert the Title into the modal popup
		var title = "<h4>" + details.title + "</h4>";
		$("#modalTitle").html(title);

		//Insert the details into the modal popup
		var contents;
		if(details["abstract"] !== null) {
			contents = "<p class='details abstract'><strong>Abstract:</strong> " + details["abstract"] + "</p>";
		}

		//Show the modal dialog
		$("#modalContent").html(contents);
		$("#modalResults").modal("show");
		$(".btnDetailsLink").button('reset');

	}

});
