/*
 Ryan's test Zapier integratino
*/
'use strict';



var Zap = {

	/*
	*	Function to display console output. 
	*/
	
	display_data: function( name, item ) {

		console.log(_____________________________________);
		console.log("Name:" + name);
		console.log("Item:");
		console.log(item);

	},
	user_input_post_write: function(bundle) {
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

		console.log(bundle);

		return {};


	}
}