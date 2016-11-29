Here is a copy of the current script.
'use strict';
/*
Arguments:
bundle.request.url: <string>
bundle.request.method: <string> # 'POST'
bundle.request.auth: <array> # [username, password]
bundle.request.headers: <object>
bundle.request.params: <object> # this will be mapped into the querystring
bundle.request.data: <string> # str or null
bundle.url_raw: <string>
bundle.auth_fields: <object>
bundle.search_fields: <object> # pruned and replaced users' fields
bundle.zap: <object> # info about the zap
If you include a callback in the arguments, you can also perform async:
callback(err, response)
The response will be used to give the user more fields to use
in the next step of the Zap. Please return a JSON serializable object.
*/
var Zap = {
		utillity_write: function(bundle) {
			// stubs
			var res = {
				'id': new Date(),
				'fr_l RelMerchant': '',
				'fr_l RelReseller': '',
				'pe Parsed Email TO': '',
				'pe Parsed Email CC': '',
				'tn Ticket Nr': '',
				'sep Body Above Separator': ''
			};
			// console.log(bundle.action_fields_full);
			if (bundle.action_fields_full.do_search_data_for_email)
				Zap.do_search_data_for_email(bundle, res);
			if (bundle.action_fields_full.do_email_toccexclude)
				Zap.do_email_toccexclude(bundle, res);
			if (bundle.action_fields_full.do_ticketnr_parse)
				Zap.do_ticketnr_parse(bundle, res);
			if (bundle.action_fields_full.do_body_parse_with_separator)
				Zap.do_body_parse_with_separator(bundle, res);
			if (bundle.action_fields_full.do_ticket_lookup)
				Zap.do_ticket_lookup(bundle, res);
			return res;
		},
		do_ticket_lookup: function(bundle, res) {
			console.log("do_ticket_lookup");
			var clist = bundle.action_fields_full.clist;
			var ticket_nr = bundle.action_fields_full.ticket_nr;
			var url = bundle.action_fields_full.tickets_url;
			var auth = bundle.auth_fields;
			if (ticket_nr === undefined) ticket_nr = res["tn Ticket Nr"];
			var csv = Zap.search_table(url, ticket_nr, auth, [3], clist.split('.'));
			if (csv.length == 2) {
				var headers = csv[0];
				var row = csv[1];
				for (var i = 0; i < row.length; i++) {
					var column = headers[i];
					res["tl " + column] = row[i];
				}
			}
		},
		do_body_parse_with_separator: function(bundle, res) {
				console.log("do_body_parse_with_separator");
				var body = bundle.action_fields_full.email_body;
				var sep = bundle.action_fields_full.separator;
				var exp = '.*(?=' + sep + ')';
				Baylakes Forms Page 10
				do_body_parse_with_separator: function(bundle, res) {
						console.log("do_body_parse_with_separator");
						var body = bundle.action_fields_full.email_body;
						var sep = bundle.action_fields_full.separator;
						var exp = '.*(?=' + sep + ')';
						var match = body.match(new RegExp(exp));
						if (match) {
							// found
							res["sep Body Above Separator"] = match[0];
						}
					},
					do_ticketnr_parse: function(bundle, res) {
						console.log("do_ticketnr_parse");
						var subj = bundle.action_fields_full.subject_for_ticketnr_parse;
						var match = subj.match(/Ticket#(.*)-([a-zA-Z0-9]+)-/);
						if (match) {
							// found
							match = match[0].match(/-([a-zA-Z0-9]+)-/);
							if (match) {
								var nr = match[0].replace(/-/g, '');
								res["tn Ticket Nr"] = nr;
							}
						}
					},
					parseEmails: function(email_str) {
						if (email_str === undefined) return [];
						var r = email_str.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);
						var res = [];
						for (var i = 0; i < r.length; i++) {
							var e = r[i];
							if (res.indexOf(e) == -1) res.push(e);
						}
						return res;
					},
					do_email_toccexclude: function(bundle, res) {
						console.log("do_email_toccexclude");
						var cc = bundle.action_fields_full.email_cc;
						var to = bundle.action_fields_full.email_to;
						var exclude = bundle.action_fields_full.email_exclude;
						console.log(cc);
						console.log(to);
						console.log(exclude);
						var exclude_list = Zap.parseEmails(exclude);
						console.log(exclude_list);
						// # first is to, second is cc
						var emails = [Zap.parseEmails(to), Zap.parseEmails(cc)];
						var results = [
							[],
							[]
						];
						console.log('Parsed_to:' + emails[0].join());
						console.log('Parsed_cc:' + emails[1].join());
						console.log('Parsed_exclude:' + exclude_list.join());
						for (var i = 0; i <= 1; i++) {
							for (var j = 0; j < emails[i].length; j++) {
								var email = emails[i][j];
								if (exclude_list.indexOf(email) == -1) {
									// not in exclude list
									results[i].push(email);
								}
							}
						}
						res['pe Parsed Email TO'] = results[0].join(',');
						res['pe Parsed Email CC'] = results[1].join(',');
					},
					do_search_data_for_email: function(bundle, res) {
						console.log("do_search_data_for_email");
						var auth = {
							'username': bundle.auth_fields.username,
							'password': bundle.auth_fields.password
						};
						if (bundle.auth_fields.app_token !== "")
							auth.apptoken = bundle.auth_fields.app_token; // this is required for production systems //TODO: remove app_token to apptoken?
						var queries = [{
							"name": "Merchants",
							"url": bundle.action_fields_full.merchants_url,
							"search_to": [14, 176, 203],
							"return_fields": [3, 18]
						}, {
							"name": "Contacts",
							"url": bundle.action_fields_full.contacts_url,
							"search_to": [10],
							"return_fields": [40, 65]
						}, {
							"name": "Tickets",
							"url": bundle.action_fields_full.tickets_url,
							"search_to": [36],
							"return_fields": [60, 8]
						}];
						var relMerchant, relReseller; // undefined by default
						for (var i = 0;
							(i < queries.length) && (relMerchant === undefined) && (relReseller === undefined); i++) {
							var query = queries[i];
							//console.log(JSON.stringify(query));
							var resp = Zap.search_table(query.url, bundle.action_fields_full.from,
								auth, query.search_to, query.return_fields);
							var records = resp.length - 1;
							res["fr_l " + query.name + "_records_fetched"] = records.toString();
							if (resp.length == 2) {
								// got exactly 1 match as first line is always a header
								relMerchant = resp[1][0];
								relReseller = resp[1][1];
								res["fr_l fetched_from"] = query.name;
							} else {
								// if we are in tickets query -special processing
								if (query.name == "Tickets") {
									// iterate through all records and see if that is same Merchant/Reseller
									if (resp.length > 1) {
										relMerchant = resp[1][0];
										relReseller = resp[1][1];
										for (var j = 2;
											(j < resp.length) && (relMerchant !== undefined); j++) {
											var currMerchant = resp[j][0];
											Baylakes Forms Page 11
											// iterate through all records and see if that is same Merchant/Reseller
											if (resp.length > 1) {
												relMerchant = resp[1][0];
												relReseller = resp[1][1];
												for (var j = 2;
													(j < resp.length) && (relMerchant !== undefined); j++) {
													var currMerchant = resp[j][0];
													var currReseller = resp[j][1];
													if ((relMerchant != currMerchant) || (relReseller != currReseller)) {
														// found few resellers / merchants by this email
														relMerchant = relReseller = undefined;
													}
												}
											}
											if (relMerchant !== undefined) res["fr_l fetched_from"] = query.name; // found
										}
									}
								}
								if (relMerchant !== undefined)
									res["fr_l RelMerchant"] = relMerchant;
								if (relReseller !== undefined)
									res["fr_l RelReseller"] = relReseller;
							},
							// result [] of {col_name:col_value}
							parse_csv: function(csv_string) {
									if (csv_string === undefined) throw new ErrorException("parse_csv: csv_string is undefined.");
									var arr = csv_string.split('\r\n');
									arr.pop(); // remove last element as CSV from QB is finished with \r\n EOF
									// fetch headers
									var headers = arr[0].split(",");
									var res = [];
									for (var i = 0; i < arr.length; i++) {
										var values = arr[i].split(",");
										var row = [];
										for (var j = 0; j < headers.length; j++) {
											row.push(values[j]);
										}
										res.push(row);
										//console.log(row.join(',')); //debug -kill comment out later
									}
									return res;
								},
								// url -url to do call to
								// email -email to search
								// auth_data -auth_fields
								// fields_to_search_in = []; of integers
								// fields_to_return = []; of integers
								// return: {found: true/false, reseller, merchant}
								search_table: function(url, needle, auth_fields, field_to_search_in, fields_to_return) {
									// sample request: "https://dishout.quickbase.com/db/bkw7zkbct?a=api_genresultstable&options=csv.num-999999&query=%7B%2710%27.EX.%27annabel%40diginn.com%27%7D&username=info%40deliveryweb.ru&password=XXXXXXXX&clist=40.65"
									// build query
									var query = "(";
									for (var i = 0; i < field_to_search_in.length; i++) {
										var elem = "{'" + field_to_search_in[i] + "'.EX.'" + needle + "'}";
										query = query + elem;
										if (i != field_to_search_in.length - 1) query = query + "OR"; // if not last elem, then add OR clause
									}
									// add closing )
									// build XML request
									var auth_xml;
									if (auth_fields.username == 'usertoken') {
										auth_xml = "<usertoken>" + auth_fields.password + "</usertoken>";
										query = query + ")";
										"<password>" + auth_fields.password + "</password>";
										auth_xml = "<username>" + auth_fields.username + "</username>" +
									}
									"<clist>" + fields_to_return.join('.') + "</clist>" +
										"<query>" + query + "</query>" +
										"<options>csv.num-999999</options>" + "</qdbapi>";
									var xml = "<qdbapi>" + auth_xml +
								} else {
									var request = {
										'method': 'POST',
										'url': url,
										'headers': {
											'Accept': 'application/x-comma-separated-values',
											'Content-Type': 'application/xml',
											'QUICKBASE-ACTION': 'API_GenResultsTable'
										},
										//'params': null
										'data': xml
									};
									var server_response = z.request(request);
									console.log(server_response.content);
									var parsed = Zap.parse_csv(server_response.content); // TODO Error Handling not required here.
									return parsed;
								},
								ping_poll: function(bundle) {
									// STUB to always return some ID during auth.
									var res = {
										id: 100
									};
									return [res];
								}
						};