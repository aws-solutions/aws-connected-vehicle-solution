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
let fileStream = fs.createReadStream('./obd-trouble-codes.csv');
let parser = csv();
let codes = [];
let codes_info = [];

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
                code: data[0],
                description: data[1]
            });
            codes.push(data[0]);
        }
    })
    .on('end', function() {
        console.log('done');
        fs.writeFile('./dtc-info.js', JSON.stringify(codes_info), function(err) {
            if (err) {
                return console.log(err);
            }

            console.log('The file was saved!');
        });

        fs.writeFile('./diagnostic-trouble-codes.js', JSON.stringify(codes), function(err) {
            if (err) {
                return console.log(err);
            }

            console.log('The file was saved!');
        });
    });
