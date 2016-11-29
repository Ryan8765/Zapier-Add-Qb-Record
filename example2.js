/*

  Harrison's overview:

  [11/15/2016 8:23:18 AM] Harrison Hersch: this is our custom webhooks
[11/15/2016 8:23:34 AM] Harrison Hersch: if you recall, i explained this one. only differences 1) allows authentication 2) captures custom XML responses

*/


'use strict';

/*
baseurl: 

{"response_code":"9999","response_msg":[{"id":"128","name":"ABC University","address1":"321 Main St","address2":"","city":"Chelsea","state":"MI","zip":"48118","country":"US","contactname":"","contacttitle":"","contactemail":"","phone":"1234567890","phone_ext":null,"fax":null,"fax_ext":null,"is_active":"1","last_change":"2016-04-28 16:04:47.705761"},{"id":"118","name":"Test Campus 3","address1":"123 Straits Hwy","address2":"","city":"Indian River","state":"MI","zip":"49749","country":"US","contactname":"","contacttitle":"","contactemail":"","phone":"1234567890","phone_ext":null,"fax":null,"fax_ext":null,"is_active":"1","last_change":"2016-04-13 17:04:51.031617"},{"id":"92","name":"Odyssey ACH Test College","address1":"1 College Ave","address2":"Card Office","city":"Cleveland","state":"MS","zip":"33296","country":"US","contactname":"Teresa Houston","contacttitle":"","contactemail":"","phone":"3017700333","phone_ext":null,"fax":null,"fax_ext":null,"is_active":"1","last_change":"2016-04-13 17:15:32.314267"}]}
*/

/*{ "response_code": "9999", "response_msg": [ { "id": "313", "campusid": "128", "name": "ABC Store1", "address1": "321 Main St", "address2": null, "city": "Chelsea", "state": "MI", "zip": "48118", "phone": "1234567890", "acquiringid": 300, "is_active": "1", "vending_flag": "0", "last_change": "2016-04-28 16:09:53.937357" }, { "id": "313", "campusid": "128", "name": "ABC Store1", "address1": "321 Main St", "address2": null, "city": "Chelsea", "state": "MI", "zip": "48118", "phone": "1234567890", "acquiringid": 500, "is_active": "1", "vending_flag": "0", "last_change": "2016-04-28 16:09:53.937357" } ] }

https://nm.ugryd.com/services.php

 {transaction_type:request_method, 
                   username:bundle.auth_fields.username,
                   password:bundle.auth_fields.password,
                   since:since}
updated_university_info
updated_merchant_info

{"transaction_type":"updated_merchant_info","username":"","password":"","since":"2016-06-10 00:00:00 "}

*/

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


var Zap = {
    getStateCode: function(stateShortName){
            var states = {"AL":2,"AK":1,"AZ":4,"AR":3,"CA":5,"CO":6,"CT":7,"DE":8,"DC":51,"FL":9,"GA":10,"HI":11,"ID":13,"IL":14,"IN":15,"IA":12,
                          "KS":16,"KY":17,"LA":18,"ME":21,"MD":20,"MA":19,"MI":22,"MN":23,"MS":25,"MO":24,"MT":26,"NE":29,"NV":33,
                          "NH":30,"NJ":31,"NM":32,"NY":34,"NC":27,"ND":28,"OH":35,"OK":36,"OR":37,"PA":38,"RI":39,"SC":40,"SD":41,
                          "TN":42,"TX":43,"UT":44,"VT":46,"VA":45,"WA":47,"WV":49,"WI":48,"WY":50};
            if(states[stateShortName] !== undefined)
                return states[stateShortName];        
            else 
                return "Could not match state";        
        },
    formatSince:function(dateobj){
        // = "2016-04-13 00:00:00";
        console.log(dateobj);
        var year = dateobj.getFullYear();
        var month = dateobj.getMonth() + 1; 
        var day = dateobj.getDate(); 
        var hours = dateobj.getHours(); 
        var minutes = dateobj.getMinutes(); 
        var seconds = dateobj.getSeconds(); 
        // fixing leading zeroes
        if (month < 10) month = "0" + month;
        if (day < 10) day = "0" + day;
        if (hours < 10) hours = "0" + hours;
        if (minutes < 10) minutes = "0" + minutes;
        if (seconds < 10) seconds = "0" + seconds;
        var res = year + "-" + month + "-" + day + " " + hours + ":" + minutes + ":" + seconds;
        console.log(res);
        return res;
    },
    post_with_fake_id: function(url, obj){
        // fixing id's issue
        var id = obj.id;
        var fake_id = id + Date.now();
        obj.id = fake_id;
        obj.real_id = id;
        //console.log(obj);
        var payload = JSON.stringify(obj);
        var request = {
          'method': 'POST',
          'url': url,
          'headers': {
            'Content-Type': 'application/content',
            'Accept': 'application/json'
          },
          //'auth': ['username', 'password'],
          'data': payload 
        };
        var response = z.request(request);
        //console.log("Posted data, resp. status_code: " + response.status_code + ", record with fake_id: " + fake_id + ", real id: " + id);
    },
    make_request: function(bundle,request_method){
        var response;
        // we will be actually making response, no test response needed
        var date = new Date();
        if (bundle.action_fields_full.last_run !== undefined){
            console.log('Proceeding with last_run');
            date = new Date(bundle.action_fields_full.last_run);
        }else{
            console.log('Subtract 6 hours, add 15 minutes from current datetime');
            //subtract 6 hours, add 15 minutes - this is also to adjust for timezone issue.
            date.setHours(date.getHours() - 6, date.getMinutes() + 15);
        }
        var since = Zap.formatSince(date);
        console.log("Making request " + request_method + " since: " + since);
        var obj = {transaction_type:request_method, 
                   username:bundle.auth_fields.username,
                   password:bundle.auth_fields.password,
                   since:since};                        // {transaction_type:"updated_merchant_info",username:bundle.auth_fields.username,password:bundle.auth_fields.password,since:1462060800};}
        var payload = JSON.stringify(obj);
        var request = {
          'method': 'POST',
          'url': bundle.action_fields_full.base_url,
          'headers': {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          //'auth': ['username', 'password'],
          'data': payload 
        };
        //console.log("Request : ");console.log(request);
        var server_response = z.request(request);
        console.log("Server call status code: " + server_response.status_code);
//            if(server_response.status_code != 200) throw new ErrorException("Server returned error code, please check logs. Error code:" + server_response.status_code); // stop Zap execution
        if(server_response.status_code != 200) {
            var msg =JSON.stringify(server_response);
            throw new ErrorException("Hit error when fetching data: " + msg); // stop Zap execution
        }
        response = JSON.parse(server_response.content);
        console.log("Recieved records:" + response.response_msg.length);
        return {response:response,since:since};
    },
    need_to_act: function(){
        return true;
        var d = new Date();
        var min = d.getMinutes();
        var res = false;
        if((min >= 55) && (min <= 59)){
            res = true;
            console.log("Time is within 55-59 minutes, so we do act");            
        }
        return res;
    },
    fetch_merchants_write: function(bundle) {
        if( !Zap.need_to_act() ) return;
        var response = Zap.make_request(bundle, "updated_merchant_info");
        var last_run = Date.now();
        var arr = response.response.response_msg;
        var pushed_merchants = [];
        var res_pushed_terminals = [];
        var res_fetched_records = [];
        var cnt_pushed_terminals = 0;
        for(var i = 0; i< arr.length;i++){
            // check if we pushed a merchant
            var merchant = arr[i];
            res_fetched_records.push(merchant);
            if (merchant.vending_flag == "0"){
            // we only push merchants / terminals for which vending_file = 0            
                if (merchant.is_active == "0") 
                    merchant.is_inactive = "1"; 
                else 
                    merchant.is_inactive = "0";
                var merchantid = merchant.id;
                var acquiringid = merchant.acquiringid;
                if(pushed_merchants.indexOf(merchantid) == -1){
                   // we did not added this merchant yet
                   delete merchant.acquiringid;
                   pushed_merchants.push(merchantid);
                   merchant.state_qb = Zap.getStateCode(merchant.state);     
                   Zap.post_with_fake_id(bundle.action_fields_full.url_merchant,merchant); 
                }
                var terminal = {id:merchantid,merchant_id:merchantid,acquiringid:acquiringid};
                Zap.post_with_fake_id(bundle.action_fields_full.url_terminal, terminal);
                res_pushed_terminals.push(terminal);
                cnt_pushed_terminals++;  
            }
        }        
        return {total_fetched:arr.length, last_run:last_run, 
                total_pushed_merchant: pushed_merchants.length, total_pushed_terminals:res_pushed_terminals.length,
                since: response.since, 
                pushed_merchants_ids: JSON.stringify(pushed_merchants),
                pushed_terminals: JSON.stringify(res_pushed_terminals),
                fetched_records: JSON.stringify(res_fetched_records)};
    },

    fetch_universities_write: function(bundle) {
        if( !Zap.need_to_act() ) return;
        var response= Zap.make_request(bundle, "updated_university_info");
        var last_run = Date.now();
        var arr = response.response.response_msg;
        for(var i = 0; i < arr.length;i++){
            var univer = arr[i];
            if (univer.is_active == "0") 
                univer.is_inactive = "1"; 
            else 
                univer.is_inactive = "0";
            univer.state_qb = Zap.getStateCode(univer.state);     
            arr[i] = univer;
            Zap.post_with_fake_id(bundle.action_fields_full.url_university,univer);
        }
        return {total_fetched:arr.length,last_run:last_run, total_pushed_universities:arr.length};
    },

    ping_poll: function(bundle) {
        // STUB to always return some ID during auth.
        var res = {id:100};
        return [res];        
    }
};