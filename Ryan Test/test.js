/*
 Ryan's test Zapier integratino
*/
'use strict';



var Zap = {

	/*
	*	Function to display console output. 
	*/
	
	display_data: function( name, item ) {
		console.log("Name:" + name);
		console.log("Item:");
		console.log(item);
	},


	/*
	*	Function to create XML output.  Must pass it key value pairs for each field to be added to QB.
	*	Must pass it an object containing key value pairs example =  {"fid":"value", "fid":"value"} 
	*	an app ticket and a user token.
	*/

	create_qb_query_xml: function( fieldValues, appToken, userToken ) {
		//xml to return for data query to QB
		var xml = '';
		var fieldID;
		var fieldValue;


		xml = xml + '<qdbapi>';
		xml = xml + '<usertoken>' + userToken + '</usertoken>';
		xml = xml + '<apptoken>' + appToken + '</apptoken>';

		
		//loop through field values and create xml out of it
		for (var key in fieldValues) {
			if ( fieldValues.hasOwnProperty(key) ) {
				fieldID = key;
				fieldValue = fieldValues[key];
				xml = xml + '<field fid="' + fieldID + '">' + fieldValue + '</field>';
			}
		}//end for

		xml = xml + '</qdbapi>';

		return xml;	
	},
	
	user_input_write: function(bundle) {
		/*
		Argument:
		  bundle.response.status_code: <integer>
		  bundle.response.headers: <object>
		  bundle.response.content: <str>

		  bundle.auth_fields: <object>
		  bundle.action_fields: <object> # pruned and replaced users' fields
		  bundle.action_fields_full: <object> # all replaced users' fields
		  bundle.action_fields_raw: <object> # before we replace users' variables

		  bundle.request: <original object from ACTIONKEY_pre_write bundle>

		  bundle.zap: <object> # info about the zap

		The response will be used to give the user more fields to use 
		in the next step of the Zap.  Please return a JSON serializable object.

		return <object>;
		*/

		


		/*
		*	Make query to add record to QuickBase
		*/

		var tableDBID   = bundle.action_fields_full.table_dbid;
		var url         = 'https://mcftech.quickbase.com/db/bmc5aqt7s?';
		var fieldValues = bundle.action_fields_full.fids_values;
		var userToken   = 'b2pcbi_u55_d4gc8c7cdmtxyufqr655dwzfvsc';
		var appToken    = 'chibjr8c32gdsfe4a6gjdm58tid';
		var data        = Zap.create_qb_query_xml(fieldValues, appToken, userToken);

		var request = {
			'method': 'POST',
			'url': url,
			'headers': {
				'Content-Type': 'application/xml',
				'QUICKBASE-ACTION': 'API_AddRecord'
			},
			'data': data
		};	
		console.log("1");
		var response = z.request( request );

		console.log(response);

		return {};


	}
};