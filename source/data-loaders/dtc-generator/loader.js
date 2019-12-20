/********************************************************************************************************************* 
 *  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           * 
 *                                                                                                                    * 
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    * 
 *  with the License. A copy of the License is located at                                                             * 
 *                                                                                                                    * 
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    * 
 *                                                                                                                    * 
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES * 
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    * 
 *  and limitations under the License.                                                                                * 
 *********************************************************************************************************************/

/**
 * @author Solution Builders
 */

'use strict';

const fs = require('fs');
let csv = require('fast-csv');
let parser = csv();
let codes_info = [];
let AWS = require('aws-sdk');

const dynamoConfig = {
    region: 'us-east-1'
};
const ddbTable = process.env.DTC_TABLE;

let fileStream = fs.createReadStream('./obd-trouble-codes.csv');
fileStream
    .on('readable', function() {
        var data;
        while ((data = fileStream.read()) !== null) {
            parser.write(data);
        }
    })
    .on('end', function() {
        parser.end();
    });

parser
    .on('readable', function() {
        var data;
        while ((data = parser.read()) !== null) {
            console.log(data);
            codes_info.push({
                dtc: data[0],
                description: data[1],
                steps: []
            });
        }
    })
    .on('end', function() {
        console.log('done');
        loadCodes(codes_info, 0, function(err, data) {
            if (err) {
                console.log(err);
            } else {
                console.log(data);
            }
        });
    });

var loadCodes = function(items, index, cb) {
    if (index < items.length) {
        let params = {
            TableName: ddbTable,
            Item: items[index]
        };

        let docClient = new AWS.DynamoDB.DocumentClient(dynamoConfig);
        docClient.put(params, function(err, data) {
            if (err) {
                console.log(err);
            } else {
                console.log(['Added DTC', params.Item.dtc].join(': '));
            }

            index++;
            setTimeout(loadCodes, 100, items, index, cb);
        });
    } else {
        return cb(null, 'All codes processed..');
    }

};
