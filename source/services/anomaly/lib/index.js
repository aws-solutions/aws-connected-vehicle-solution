/*********************************************************************************************************************
 *  Copyright 2016 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Amazon Software License (the "License"). You may not use this file except in compliance        *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://aws.amazon.com/asl/                                                                                    *
 *                                                                                                                    *
 *  or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

/**
 * @author Solution Builders
 */

'use strict';

let AWS = require('aws-sdk');
let Anomaly = require('./anomaly.js');

module.exports.respond = function(event, cb) {

    let _anomaly = new Anomaly();
    let _message = {};

    if (typeof event === 'object') {
        _message = event;
    } else {
        _message = JSON.parse(event);
    }

    if (event.action) {

    } else {
        let payload = new Buffer(event.Records[0].kinesis.data, 'base64').toString('ascii');
        console.log('Decoded payload:', payload);
        let _record = JSON.parse(payload);
        // identify message as dtc object to be created from IoT platform
        _anomaly.createAnomaly(_record, function(err, data) {
            if (err) {
                return cb(err, null);
            }

            return cb(null, data);
        });
    }

};
