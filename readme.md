GeoPortal Genie
===============

 - [Demo](#demo)
 - [Installation](#installation)
 - [HTML components](#html)
 - [GeoPortal Genie Engine](#engine)
 - [Proxy pages](#proxy)
 - [Configuration file](#configuration)
 - [Login page](#login)
 - [Search Widget](#search)


### [Demo](#demo)

See http://demo.geoportalgenie.com/ for a demo of GeoPortal Genie.

### [Installation](#installation)

This installation guide explains the steps required to install and configure GeoPortal Genie on your system. This documentation is aimed at technically-literate users who are comfortable working in a web development environment.

The following diagram illustrates the relationship between GeoPortal Genie and Esri Geoportal Server:

![screenshot](https://i.imgur.com/E575IfC.png)

In summary, GeoPortal Genie is a front-end web application written in JavaScript and based on the Backbone.js framework. It interacts with Esri Geoportal Server’s REST API, using a proxy page as an intermediary. By default the index.HTML page uses the Bootstrap framework (although this is not a requirement). The index page uses require.js to simplify loading of all the scripts – only app.js is loaded in the index page, with the other scripts loaded dynamically, as they are required.

We recommend that you start by testing GeoPortal Genie on your local web server, by unzipping git GitHub repo into your web server directory. This document assumes that the demo is installed at http://localhost/GeoPortalGenie.

The demo configuration file uses Esri’s sandbox Geoportal Server at http://gptogc.esri.com and demonstrates the benefits which GeoPortal Genie delivers. (Please test this sample server to ensure it is running, before testing GeoPortal Genie, as this is a dependency on the demo site.)

Perform a simple search (eg “water”) at http://gptogc.esri.com and also at http://localhost/GeoPortalGenie and note that the same results are returned in both cases, but GeoPortal Genie has completely bypassed the Esri Geoportal Server UI.

See the following sections for more information on how GeoPortal Genie is built, and how you can customize it for your site.

### [HTML components](#html)

## HTML files

GeoPortal Genie contains front-end components which are written in HTML, and styled using CSS. You (or your design department) have the flexibility to redesign the default GeoPortal Genie user interface as necessary, using standard web design principles. (This is much harder to achieve without the use of GeoPortal Genie, which decouples the front- and back-end behaviors of Esri Geoportal Server.)

The HTML elements may be served as static HTML pages or may be delivered via your content management system. The pages include:

Index.html is the landing page, and contains the Search box, Advanced Search parameters, Overview Map, and Search Results
Preview.html contains an interactive map, which can be used to explore spatial datasets
The default pages are based on the Bootstrap presentation framework, which allows for quick and easy redesign of the pages in a responsive manner, and an open-source admin template to provide some styling. See the Bootstrap documentation for further information on styling elements within the pages. Alternatively, you may replace Bootstrap with your own presentation templates, or design the pages completely from scratch.

Open the HTML pages in your editor, and note the page elements (the important elements are identified with ID values). Any HTML elements such as div, table, button (etc) may be modified as necessary to meet your particular presentation requirements. Various CSS files are included, and may be edited as required using standard web design approaches.

For example, the map is located within the DIV with the ID “mapDiv”, which is located within the left-hand side of the side-bar. You may easily reposition mapDiv elsewhere within the page, for example on the right-hand side. Similarly, the search results are displayed in the DIV with ID searchResults, which may be repositioned elsewhere on the page, using a combination of HTML and CSS as with any modern, responsive website.

## Templates

Towards the bottom of the HTML files you will find the presentation templates (signified by script type=’text/template’…). These contain the structure of elements which will be inserted into the page at run-time, such as the search results. The templates are exposed here in case you need to over-ride the default behavior.

For example, see result-item-template, which is used to format the results:

![result item template](https://i.imgur.com/GGSoeUi.png)

This template is checking the type of each Link object, and handling each of them slightly differently in the results. You’re free to modify this template to suit your requirements, using the existing template as a guide to the syntax.

See the Genie Engine section for information on modifying the Details script and template.

## Advanced search panels

The panels on the left-hand side of the page allow the user to add filters to the search, including a spatial query, categories, data type and date range. By default, opening a panel closes the other panels. To disable this functionality, rename the div with id “advancedSearch”:

_…class=”panel-group” id=”advancedSearch”…_

## Plugins

The default HTML pages also use a number of open-source plugins to facilitate certain behaviors, such as Backbone.js (the MVC framework on which GeoPortal Genie is based), the date-picker (shown when specifying date ranges in the search) or the icons used throughout the display.

### [GeoPortal Genie Engine](#engine)

At its core, GeoPortal Genie comprises an “engine” which interacts with Esri Geoportal Server on behalf of the user, by interrogating the Esri Geoportal Server’s REST API.

Access to GeoPortal Genie’s source code is provided via an API key, linking to the hosted files on GeoPortalGenie.com. Once you purchase GeoPortal Genie you may also install the files locally within your own environment.

## app.js

The index.html file uses require.js to simplify the loading of the required scripts. Note the script tag in the HEAD section of the index.html page, with the attribute data-main=”js/app”. This tells GeoPortal Genie to look in the file js/app.js to obtain the paths to the required scripts.

Within app.js, the required files and libraries are listed. Where a URL is given the files are loaded from a CDN, with the remaining files sourced from the js directory.

## GeoPortal Genie scripts

The GeoPortal Genie functionality has been compartmentalized into discrete scripts so that you may easily customize certain behaviors, without complicating the upgrade path by changing required files. The scripts are:

 - geoportalGenie.js is the main engine, and handles interaction between the GeoPortal Genie front-end, and your Esri Geoportal Server’s REST API. Note that it should not be necessary to make any changes to this file.
 - gpGenie-init.js contains initialization parameters, which sets up the page for GeoPortal Genie functionality. This script also configures the Advanced Search section, the date-picker functionality on the Advanced Search section, enables Tooltips, etc.
 - gpGenie-details.js is used when the user clicks on the Details link for any metadata record. By default the details are returned in a modal (pop-up) window. Because the Esri Geoportal Server may be configured using a number of XML stylesheets, the site administrator may customize which details are displayed by editing this file – see below for further information.

## Details

Rather than displaying a dataset’s Details in a new window, GeoPortal Genie displays the important details in a popup window (though this can be modified if required). The script gpGenie-details.js interrogates the Details page (such as this example entry) and extracts the Title, Summary, Agency and Contact details from the raw data. These are displayed by the details-template (found within the Front-end components) which is itself shown in a Bootstrap modal window.

![details](https://i.imgur.com/JNoHFAc.png)

Because multiple metadata formats may be used by Esri Geoportal Server, it may be necessary to add new formats to _gpGenie-details.js_ using the comments within the _handleDetails_ function as a guide.

### [Proxy pages](#proxy)

GeoPortal Genie requires a proxy to retrieve information from your Esri Geoportal Server and return it in JSON format. The recommended approach is to download and configure the appropriate proxy (.Net, PHP or Java) from the Esri GitHub Resource Proxy page. (Download the most recent daily build in order to access the ping functionality mentioned below.)

The proxy should be installed on the same domain/subdomain as GeoPortal Genie, in order to avoid any cross-origin issues.

Within the file _/js/gpGenie-config.js_ enter the path to the proxy file, for example:

_proxy: “resource-proxy-1.1/PHP/proxy.php”,_

There are some options which may be configured in the applicable proxy.config file, including:

 - mustMatch – set this to “true” if you know the domains of all servers which will be sent via the proxy
 - serverURL – if mustMatch=”true”, enter the path to your Esri Geoportal Server, plus any WMS or ArcGIS Server paths, eg <serverUrl url=”https://gptogc.esri.com” matchAll=”true”/>
 - loglevel – set the level to 0 (write to the log file), 1 (write to the console) or 3 (no logging)

To test that the proxy is working, append the ping command to the proxy address, eg:

_http://localhost/GeoportalGenie/resource-proxy-1.0/PHP/proxy.php?ping_
_{“Proxy Version”:”1.1 Beta”,”Configuration File”:”OK”,”Log File”:”OK”}_

See the detailed instructions on the Esri GitHub Resource Proxy page for advanced configuration options or trouble-shooting. If your Esri Geoportal Server requires users to log in, note that the proxy (and the GeoPortal Genie code itself) must be located on a different domain (or subdomain) than Esri Geoportal Server. See the Login section for more information.

### [Configuration file](#configuration)

The configuration file is a text file in JSON format, which contains configurable parameters required by the GeoPortal Genie engine. See comments throughout this file for options which you may change. This file is named gpGenie-config.js and is found in the /js directory where you installed GeoPortal Genie (eg C:\inetpub\wwwroot\GeoPortalGenie\js\gpGenie-config.js).

The main option is the URL to your GeoPortal Server, which should end with geoportal/ (without the /catalog/main/home.page section):

_//GeoPortal server’s REST API geoportalServer: “http://gptogc.esri.com/geoportal/”,_

Try changing this to match your GeoPortal, then run a simple search. If this returns an error message, see the Proxy page section. The paths to the proxy files are shown in the configuration file.

Other configurable options include:
 - geometryService – the path to your ArcGIS Server’s geometryService. The default value uses a sample Esri service
 - mapOptions – this section contains the starting location in decimal degrees, the starting zoom level from 1-19, and the basemap options if using the default ArcGIS Server basemaps
 - bingMapsOptions – if using Bing Maps as the background layer, this section contains your Bing Maps API key and the map style. Please see Getting A Bing Maps Key for further information.
 - infoWindowSize – the size of the popup infoWindow in the Preview map
 - arcgisGeoCoder – this controls the address search window in the map (not shown by default, to save space)
 - quickPreview – if true, an entry’s preview will be shown in a modal popup. If false, the preview will open in a new window with a full-screen map.

## Categories

GeoPortal Genie allows you to configure how your datasets are categorized in the Categories panel on the Advanced Search section. There are a few ways to categorize your data:
The first option is the ISO Topic Category, which is hard-coded in the gpt.resources file. To use this option, ensure that the category with the parameters below is included in the categories array. Note that the ISO Topic Category section should not be edited as these are standard values.

![categories](https://i.imgur.com/XUUlMvs.png)

Additional categories may be specified manually, but adding another entry in the categories array. The query parameter defines how your datasets will be categorized.

Head to http://path_to_your_geoportal/geoportal/rest/index/stats to see the list of potential categories, and click on suitable entries such as dataTheme, contentType or apiso.TopicCategory. Your geoportal will return datasets which fall within any of these categories, which you can add to the configuration file, as in this example:

![categories](https://i.imgur.com/ZpIRLwO.png)

The hierarchy is:
 - heading – the category heading which appears in the Advanced Search
 - query – this should be in the format searchText=X where X is the category identified from your /stats paget
 - subcategories – the list which will appear below the category heading
 - name – the actual value returned by your Esri Geoportal Server for this category in step 2 (eg ‘oceans’)
 - alias – an option alias which you may use to override the actual value (eg ‘Oceans and Seas’)

The following screenshot shows how the above categories will appear:

![categories](https://i.imgur.com/JE3aa59.png)

## Searching across multiple sites
You may optionally choose to allow users to perform a federated search across multiple OpenSearch sites, by specifying each site in the Sites section of the configuration file:

![multiple sites](https://i.imgur.com/hWC6OM4.png)

Specify the rid (the value against which to search) and the ridName (the formatted alias displayed in the UI). See https://github.com/Esri/geoportal-server/wiki/Geoportal-server-as-a-broker#Federated_Search for instructions on adding an external site to your Esri Geoportal Server’s configuration files.

“This site” is always added automatically. Since the federated search doesn’t support the advanced queries (such as Category, spatial relationship, etc) these parameters are hidden when searching other sites. To remove the federated search capability, remove the sites code to hide this panel.

### [Login page](#login)

Since the Esri Geortal Server doesn’t expose the login/logout/registration functions to its REST API, it is necessary to use the default page’s login functionality to manage logging in and out of the backend Esri Geoportal Server.

## Simple integration

GeoPortal Genie handles this by using a popup window (triggered by the user icon at the top right of the page), which embeds the Esri Geoportal Server’s login page in an iframe:

![login](https://i.imgur.com/KJPOoPJ.png)


The popup has been designed to show only the important parts of the login page, to avoid confusing the users. Search the custom.css file for login to adjust the CSS parameters which control the size and positioning of the login popup.

## Advanced integration

Alternatively, in order to improve the integration with the backend, and minimize the confusion for end-users, you may wish to remove the components of Esri Geoportal Server which are not directly related to logging in, such that only the Username and Password inputs are shown:

![login](https://i.imgur.com/zKDIpCz.png)

This requires making some changes to the CSS:

 - create a new directory at \webapps\geoportal\catalog\skins\themes\gpGenie
 - download the sample file main.css into this directory
 - edit the file \webapps\geoportal\catalog\skins\lookAndFeel.jsp
 - change the following line to reference the new CSS file:

_link rel=”stylesheet” type=”text/css” href=”<%=request.getContextPath()%>/catalog/skins/themes/gpGenie/main.css”_

This will replace the standard Esri Geoportal Server layout with controls similar to the above screenshot, which is more closely aligned with the GeoPortal Genie styling. Edit this file as necessary to show more of the standard Esri Geoportal Server controls (eg Forgot Password, Register, etc).

You may also customize the text shown before and after the user logs in. Edit the file \webapps\geoportal\WEB-INF\classes\gpt\resources\gpt.properties and search for the # login page section:

 - catalog.identity.login.menuCaption = Login to the Spatial Data Catalog
 - catalog.identity.login.success = (You can close this popup now)
 - catalog.identity.logout.menuCaption = You are logged in. Click here to log out

![login](https://imgur.com/7xXTa5U)

## Show the popup on page load
To have this popup show automatically when the page loads, uncomment the following line in the /js/gpGenie-init.js file:

//$(‘#loginModal’).modal(‘show’);

## Don’t show the login popup

If you don’t require users to log in to your site, remove the section of code containing id=”loginButton”

## Proxy page and the login functionality

There is a quirk in the Esri Resource Proxy, whereby it strips any login cookies if the proxy and Geoportal Server are found on the same machine. Therefore it is necessary to install Esri Geoportal Server on a different domain (or subdomain) from GeoPortal Genie and the proxy, if you wish to make use of the Esri Geoportal Server login functionality.

One solution is to create a subdomain for GeoPortal Genie and the Esri Resource Proxy:

![subdomain](https://i.imgur.com/ufAQlUz.png)

In this case, the code has been stored at _C:\inetpub\wwwroot\geoportalgenie_code_ while a subdomain has been configured to point to this directory. This means that GeoPortal Genie is available at http://geoportalgenie.localhost/ and the proxy is available at http://geoportalgenie.localhost/resource-proxy-1.1/PHP/proxy.php – this avoids the problem with the login cookie being removed by the proxy.

### [Search Widget](#search)

The core Esri Geoportal Server provides a Search Widget, which can be embedded on any page in order to expose your Geoportal Server. The results of the query are shown in a popup.

GeoPortal Genie improves on this [search widget](http://webhelp.esri.com/geoportal_extension/9.3.1/index.htm#custom_srch_widget.htm) with a simple text box and button which may similarly be embedded in any page. The results of the query are sent to GeoPortal Genie’s main page, with the results shown accordingly.

The advantage of this approach is that the text box and search button may be styled as necessary since they’re standard HTML elements, and the results are displayed in your GeoPortal Genie interface. This means that the search widget can be a handy and user-friendly way to introduce users to your GeoPortal’s capabilities.

See the file _searchWidget.html_ within the GeoPortal Genie demo zip file for the relevant syntax for embedding a search query within another page, running the query, and displaying the results in your GeoPortal Genie interface.


