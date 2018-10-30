/*!
  GeoPortal Genie by Stephen Lead
  GeoPortalGenie.com
*/

//It shouldn't be necessary to modify any of these scripts, as doing so will complicate the upgrade path.

//Namespace
if (!this.gpGenie || typeof this.gpGenie !== 'object') {
    this.gpGenie = {};
}

//A model to handle fetching Details from an individual record
gpGenie.DetailsModel = Backbone.Model.extend({
	initialize: function (args) {
	    _.bindAll(this, 'fetchDetails', 'handleDetails');
	},
	fetchDetails: function(id) {
		//Retrieve the details for an individual entry, based on its UUID value
		var query = "rest/document/" + id;
		var request = $.ajax({
		    url: configOptions.proxy,
		    data: {requrl: configOptions.geoportalServer + query},
		    context: this,
		    success: function(response) {
				//Handle the details
				this.handleDetails(response);
			},
			error: function(error) {
				var message = "error with Details query"
				alert(message);
			}
		});
	},
	handleDetails: function(details) {
		try {

			//Clear the modal from its last values.
			//TODO: replace with something which clears the view
			$("#modalContent").html(null);
			$("#modalTitle").html(null);

			//Create an object which will be returned to the Details view.
			//It will contain the Title, Summary and Agency (perhaps more to come in future)
			this.detailsData = {
				"title": "Unable to retrieve title",
				"summary": "Unable to retrieve summary",
				"agency": "Unable to retrieve agency",
				"contact": "Unable to retrieve contact details"
			};

			//Convert the XML response into JSON, so it's easier to work with
			var jsonDetails = $.xml2json(details);

			//Different XML formats are possible, so it's necessary to try a few options to detect the valid syntax
			if(jsonDetails.identificationInfo !== undefined) {

				//Title
				try {
					this.detailsData.title = jsonDetails.identificationInfo.MD_DataIdentification.citation.CI_Citation.title.CharacterString;
				} catch (error) {
					console.log("unable to retrieve title");
				}


				//Summary
				try {
					this.detailsData.summary = jsonDetails.identificationInfo.MD_DataIdentification["abstract"].CharacterString;
				} catch (error) {
					console.log("unable to retrieve summary");
				}

				//Agency
				try {
					if(jsonDetails.identificationInfo.MD_DataIdentification.pointOfContact !== undefined) {
						var contact = jsonDetails.identificationInfo.MD_DataIdentification.pointOfContact;
						if(contact.CI_ResponsibleParty !== undefined) {
							this.detailsData.agency = contact.CI_ResponsibleParty.organisationName.CharacterString;

						//Sometimes this form of contact may contain multiple entries - append them
						} else if (contact.length > 0) {
							this.detailsData.agency = contact[0].CI_ResponsibleParty.organisationName.CharacterString;
							for (var i = 1; i < contact.length; i++) {
								this.detailsData.agency = this.detailsData.agency + ", " + contact[i].CI_ResponsibleParty.organisationName.CharacterString;
							}
						}
					}
				} catch (error) {
					console.log("unable to retrieve agency");
				}

				//contact
				try {
					if(jsonDetails.contact.CI_ResponsibleParty.contactInfo.CI_Contact.address.CI_Address !== undefined) {
						var shortAddr = jsonDetails.contact.CI_ResponsibleParty.contactInfo.CI_Contact.address.CI_Address;
						if(shortAddr.electronicMailAddress !== undefined) {
							var contact = shortAddr.electronicMailAddress.CharacterString;
							this.detailsData.contact = "<a href='mailto:" + contact + "'>" + contact + "</a>";
						} else {
							if (shortAddr.deliveryPoint !== undefined && shortAddr.deliveryPoint.CharacterString !== undefined) {
								this.detailsData.contact = shortAddr.deliveryPoint.CharacterString;
							}
							if (shortAddr.city !== undefined && shortAddr.city.CharacterString !== undefined) {
								if(this.detailsData.contact.length > 0) {
									this.detailsData.contact = this.detailsData.contact + ", " + shortAddr.city.CharacterString;
								} else {
									this.detailsData.contact = shortAddr.city.CharacterString;
								}
							}
							if (shortAddr.country !== undefined && shortAddr.country.CharacterString !== undefined) {
								if(this.detailsData.contact.length > 0) {
									this.detailsData.contact = this.detailsData.contact + ", " + shortAddr.country.CharacterString;
								} else {
									this.detailsData.contact = shortAddr.country.CharacterString;
								}
							}
							if (shortAddr.postalCode !== undefined && shortAddr.postalCode.CharacterString !== undefined) {
								if(this.detailsData.contact.length > 0) {
									this.detailsData.contact = this.detailsData.contact + ", " + shortAddr.postalCode.CharacterString;
								} else {
									this.detailsData.contact = shortAddr.postalCode.CharacterString;
								}
							}

						}
					}
				} catch (error) {
					console.log("unable to retrieve contact details");
				}

			//Another style
			} else if(jsonDetails.idinfo !== undefined) {

				//Title
				try {
					this.detailsData.title = jsonDetails.idinfo.citation.citeinfo.title;
				} catch (error) {
					console.log("unable to retrieve title");
				}

				//Summary
				try {
					this.detailsData.summary = jsonDetails.idinfo.descript["abstract"];
				} catch (error) {
					console.log("unable to retrieve summary");
				}

				//Agency
				try {
					if(jsonDetails.metainfo !== undefined) {
						if (jsonDetails.metainfo.metc.cntinfo !== undefined) {
							if (jsonDetails.metainfo.metc.cntinfo.cntperp !== undefined) {
								if (jsonDetails.metainfo.metc.cntinfo.cntperp.cntorg !== undefined) {
									this.detailsData.agency = jsonDetails.metainfo.metc.cntinfo.cntperp.cntorg;
								} else if (jsonDetails.metainfo.metc.cntinfo.cntperp.cntper !== undefined) {
									this.detailsData.agency = jsonDetails.metainfo.metc.cntinfo.cntperp.cntper;
								}
							} else if (jsonDetails.metainfo.metc.cntinfo.cntorgp !== undefined) {
								if (jsonDetails.metainfo.metc.cntinfo.cntorgp.cntorg !== undefined) {
									this.detailsData.agency = jsonDetails.metainfo.metc.cntinfo.cntorgp.cntorg;
								}

							}
						}
					}
				} catch (error) {
					console.log("unable to retrieve agency");
				}

				//contact
				try {
					if(jsonDetails.metainfo.metc.cntinfo !== undefined) {
						if (jsonDetails.metainfo.metc.cntinfo.cntaddr !== undefined) {
							if(jsonDetails.metainfo.metc.cntinfo.cntaddr.address !== undefined) {
								this.detailsData.contact = jsonDetails.metainfo.metc.cntinfo.cntaddr.address;
							}
							if(jsonDetails.metainfo.metc.cntinfo.cntaddr.city !== undefined) {
								if(this.detailsData.contact.length > 0) {
									this.detailsData.contact = this.detailsData.contact + ", " + jsonDetails.metainfo.metc.cntinfo.cntaddr.city;
								} else {
									this.detailsData.contact = jsonDetails.metainfo.metc.cntinfo.cntaddr.city;
								}
							}
							if(jsonDetails.metainfo.metc.cntinfo.cntaddr.state !== undefined) {
								if(this.detailsData.contact.length > 0) {
									this.detailsData.contact = this.detailsData.contact + ", " + jsonDetails.metainfo.metc.cntinfo.cntaddr.state;
								} else {
									this.detailsData.contact = jsonDetails.metainfo.metc.cntinfo.cntaddr.state;
								}
							}
						}
					}
				} catch (error) {
					console.log("Unable to retrieve contact details");
				}

			//Another style
			} else if (jsonDetails.Description !== undefined) {
				//Title
				try {
					this.detailsData.title = jsonDetails.Description.title;
				} catch (error) {
					console.log("unable to retrieve title");
				}
				//Summary
				try {
					this.detailsData.summary = jsonDetails.Description.description;
				} catch (error) {
					console.log("unable to retrieve summary");
				}

				//It seems that this format doesn't include contact or agency details(?)

			} else {
				//TODO: replace with Backbone error handling
				$("#modalContent").html("Sorry, there was a problem retrieving the details for this record");
			}

			//Send the results to the Details modal
			this.trigger('detailsReturned', this.detailsData, this);

		} catch (error) {
			//TODO: replace with Backbone error handling
			alert("Sorry, there was an error loading the stylesheet. Please contact your GeoPortal Genie administrator");
		}

		//Reset the loading button
		$(".btnDetailsLink").button('reset');

	}
});

//A View to handle display of the Details for an individual record
gpGenie.DetailsView = Backbone.View.extend({
	initialize: function (args) {
	    _.bindAll(this, 'onDetailsReturned');
	    this.detailsModel = args.detailsModel;
	    this.detailsModel.on('detailsReturned', this.onDetailsReturned);
	    this.detailsTemplate = ich[args.detailsTemplate];

	    //Add the elements to display the results
	    $(this.options.detailsContainer).append(this.el);

	},
	className: 'details',
	onDetailsReturned: function(detailsData) {
		//Fires when the REST API has returned Details about an entry
		if(detailsData !== undefined) {
			//Populate the modal body and title with the relevant content
			var output = this.render();

			//Display the modal
			$(output.options.detailsContainer).modal();

		} //TODO: add an Else with error handling
	},
	render: function () {
		// Compile the template using underscore
		var template = _.template( $(this.options.detailsTemplate).html(), this.options.detailsModel.detailsData);

		// Load the compiled HTML into the Backbone "el"
		this.$el.html( template );
		return this;
	}

});
