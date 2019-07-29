/**
 * Custom UI5 Server middleware example
 *
 * @param {Object} parameters Parameters
 * @param {Object} parameters.resources Resource collections
 * @param {module:@ui5/fs.AbstractReader} parameters.resources.all Reader or Collection to read resources of the
 *                                        root project and its dependencies
 * @param {module:@ui5/fs.AbstractReader} parameters.resources.rootProject Reader or Collection to read resources of
 *                                        the project the server is started in
 * @param {module:@ui5/fs.AbstractReader} parameters.resources.dependencies Reader or Collection to read resources of
 *                                        the projects dependencies
 * @param {Object} parameters.options Options
 * @param {string} [parameters.options.configuration] Custom server middleware configuration if given in ui5.yaml
 * @returns {function} Middleware function to use
 */
module.exports = function ({ resources, options }) {

	// one time setup
	var config = options.configuration || {};
	var pOdataUri = Promise.resolve(config.odata);
	var proxy = process.env.REMOTE_LOCATION || process.env.remote_location;
	if (proxy && config.odata) {
		console.log(`Server redirects requests to path ${config.odata} to host ${proxy}`);
	}
	if (!config.odata) {
		pOdataUri = resources.rootProject.byGlob("**/manifest.json")
			.then(async ([oManifestResource]) => {
				var sManifest = await oManifestResource.getString();
				var oManifest = JSON.parse(sManifest);
				if (oManifest["sap.app"] &&
					oManifest["sap.app"].dataSources &&
					oManifest["sap.app"].dataSources.mainService) {
					var sUri = oManifest["sap.app"].dataSources.mainService.uri;
					if (proxy) {
						console.log(`Server redirects requests to path ${sUri} to host ${proxy}`);
					}
					return sUri;
				}
			})
	}
	// request handler
	return async function (req, res, next) {

		var sUri = await pOdataUri;
		if (sUri && req.url.startsWith(sUri) && proxy) {
			// matches our odata services so we reirect to our proxy
			req.url = "/proxy" + req.url;
		}
		next();
	}
};
