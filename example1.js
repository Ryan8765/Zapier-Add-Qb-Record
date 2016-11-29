/*
  Harrisons Description:
Dishout ticketing utility

*/

'use strict';

var Zap = {
    MAKE_EXT_REQUEST_write: function(bundle) {
 /*
    Arguments:

      bundle.request.url: <string>
      bundle.request.method: <string> # 'POST'
      bundle.request.auth: <array> # [username, password]
      bundle.request.headers: <object>
      bundle.request.params: <object> # this will be mapped into the querystring
      bundle.request.files: <object> # object of keys/arrays
                                     # * 1st item: filename str or null
                                     # * 2nd item: zapier.com endpoint that will stream the file
                                     # * 3rd item: mimetype str or null
      bundle.request.data: <string> # str or null

      bundle.url_raw: <string>
      bundle.auth_fields: <object>
      bundle.action_fields: <object> # pruned and replaced users' fields
      bundle.action_fields_full: <object> # all replaced users' fields
      bundle.action_fields_raw: <object> # before we replace users' variables

      bundle.zap: <object> # info about the zap

    If you include a callback in the arguments, you can also perform async:
      callback(err, response)

    The response will be used to give the user more fields to use 
    in the next step of the Zap.  Please return a JSON serializable object.

    return <object>;
    */

        var data_to_send = {};
        // this is required for most of the system customer uses - AUTH data is put as a parameter (not HTTP BASIC AUTH, so we use it here)
        data_to_send[bundle.auth_fields.USERNAME_PARAM_NAME] = bundle.auth_fields.username;
        data_to_send[bundle.auth_fields.PASSWORD_PARAM_NAME] = bundle.auth_fields.password;
        // go over parameters that are full (these would not contain empty parameters
        try{            
            console.log("Fetching action_fields_full parameters to get to URL");
            var dictionary = bundle.action_fields_full.PARAMETERS; // if we user action_fields_full then they stripe out parameters (empty parameters are not being passed)
            var keys = [];
            for (var key in dictionary) {
                if (dictionary.hasOwnProperty(key)) {
                    keys.push(key);
                    var value = dictionary[key];
                    data_to_send[key]=value;
                }
            }

            // now go over raw parameters and set values that are empty
            console.log("Fetching action_fields_raw parameters to get to URL - determing empty parameters");
            dictionary = bundle.action_fields_raw.PARAMETERS; // if we user action_fields_full then they stripe out parameters (empty parameters are not being passed)
            var keysRaw = [];
            for (key in dictionary) {
                if (dictionary.hasOwnProperty(key)) {
                    if(data_to_send[key] === undefined){
                        // missing value - so add empty string
                        data_to_send[key] = "";
                    }
                }
            }
        }
        catch(e){
            console.log("ERROR: exception during forming of URL parameters");
        }

       console.log("All parameters that will be passed to a request:");
       for (var key1 in data_to_send) {
           if (data_to_send.hasOwnProperty(key1)) {
               console.log(key1 +":" + data_to_send[key1]);
           }
       }

        //var overrriden_method = bundle.action_fields_full.REQUEST_TYPE;
        var req = {
          url: bundle.action_fields_full.URL_TO_CALL,
          method: bundle.action_fields_full.REQUEST_TYPE,
          auth: bundle.auth,
          headers: bundle.request.headers, 
          params: bundle.request.params,
          data: bundle.request.data 
        }; // or return bundle.request;
        
        switch(bundle.action_fields_full.REQUEST_TYPE){
            case 'PUT':
            case 'GET':
                req.params = data_to_send;
                req.headers = null; // Otherwise this gives an error on some of the customer projects. 
                break;
            case 'POST':
//                var cntType = {"Content-Type":"application/x-www-form-urlencoded; charset=windows-1251"};
                var cntType = {"Content-Type":"application/x-www-form-urlencoded; charset=utf-8"};
                req.headers = cntType;
                if(bundle.action_fields_full.POST_USE_PARAMS) 
                    req.params = data_to_send;
                else{
                    req.data = $.param(data_to_send);
                    req.params = null;
                }
        }
        if (bundle.action_fields_full.FILE_TO_SEND !== undefined){
            req.files = bundle.action_fields_full.FILE_TO_SEND;
        }      

        console.log("Making request:");
        console.log(JSON.stringify(req,null,4));
        var response = z.request(req);
        // FINISHED PRE-WRITE
        var res = {}; // now res - result we would return.
        res.response_code = response.status_code;
        res.result = 'Could not get any response to our request';
        res.raw_response = response.content;
        res.response_type = 'Undefined';
        if(response.content){
        // try to parse response to see if it is JSON
            try{
                var json = JSON.parse(response.content);
                res.result = json;
                res.response_type = 'JSON';
            }
            catch(e){
                // this is not JSON content, so XML
                // res.auto_parse = $.xml2json(bundle.response.content); TODO: attempt to automatically parse - it fails.
                var obj = {};                  
                console.log('Not JSON content, so assuming XML, trying to parse XML');
                
                try{
                    // PARSE response
                    var xmlDoc = $.parseXML(response.content),$xml = $(xmlDoc);
                    console.log('XML parsed, processing...');

                    console.log('Fetching XML keys to parse');
                    var xmlKeys = bundle.action_fields_full.XML_FIELDS;
                    // parse succesfull - so obtain keys we are looking for

                    console.log('Finding XML fields and placing them in the response');
                    for (var indexXML = 0; indexXML < xmlKeys.length; ++indexXML) {
                        var xmlKey = xmlKeys[indexXML];
                        // attempt to find XML using JQuery
                        try{
                            var elem = $xml.find(xmlKey);
                            if (elem !== undefined) {
                                var xmlValue = elem.text();
                                res.response_type = 'XML';
                                obj[xmlKey] = xmlValue;
                                console.log(xmlKey + ' ' + xmlValue);                
                            }
                        }
                        catch(e){
                            res.elem_not_found = 1;
                            //TODO: if needed later then set some error codes
                        }
                    }                   
                }
                catch(e){
                    console.log('Error: parsing XML file');
                    obj.error = 'Got error during XML parse';
                }
                res.result = obj;                                                                                    
            } 
        }            
        
        return res;   
    },

    /* problematic URL: https://boardingstage.itstgate.com/boardingservices/tgateboardingservices.asmx/addmerchant?wusername=mysingletest&wpassword=wwwwww&AgentTpi=&Merchantusername=&MerchantPassword=&TestMerchant=True&locid=&companyname=company&firstname=First&lastname=Last&phone=210-123-4567&fax=&email=first%40last.com&address1=123&address2=&city=Any+Town&zip=45678&state=TX&country=USA&WebsiteURL=&autoclosebatch=True&autoclosebatchhour=0&timezoneoffset=-360&RequirePNRef=True&ForceDuplicate=True&PaymentMethod=&extdata=&EnableSecurelink=True
    */

    TEST_AUTH_pre_poll: function(bundle) {
    /* 
        Argument:
          bundle.request.url: <string>
          bundle.request.method: <string> # 'GET'
          bundle.request.auth: <array> # [username, password]
          bundle.request.headers: <object>
          bundle.request.params: <object> # this will be mapped into the querystring
          bundle.request.data: <string> # str or null

          bundle.url_raw: <string>
          bundle.auth_fields: <object>
          bundle.trigger_fields: <object> # the fields provided by the user during setup

          bundle.zap: <object> # info about the zap
          bundle.meta: <object> # extra runtime information you can use

        The response should be an object of:
          url: <string>
          method: <string> # 'GET', 'POST', 'PATCH', 'PUT', 'DELETE'
          auth: <array> # [username, password]
          headers: <object>
          params: <object> # this will be mapped into the query string
          data: <string> or null # request body: optional if POST, not needed if GET
        */
        console.log(bundle.auth_fields.AUTH_URL);
        // Custom Authorisation
        // Customer doesn't use basic auth, but sending parameters in the URL most of the time.
        var auth = {};
        auth[bundle.auth_fields.USERNAME_PARAM_NAME] = bundle.auth_fields.username;
        auth[bundle.auth_fields.PASSWORD_PARAM_NAME] = bundle.auth_fields.password;
        
        // TODO: check auth params.
        return {
          url: bundle.auth_fields.AUTH_URL,
          method: bundle.request.method,
          auth: auth, //bundle.request.auth,
          headers: bundle.request.headers,
          params: bundle.request.params,
          data: bundle.request.data
        }; // or return bundle.request;        
    }
};
