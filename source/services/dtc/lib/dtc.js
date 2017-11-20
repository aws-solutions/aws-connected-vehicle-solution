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

let shortid = require('shortid');
let moment = require('moment');
let _ = require('underscore');
let AWS = require('aws-sdk');

let creds = new AWS.EnvironmentCredentials('AWS'); // Lambda provided credentials
const dynamoConfig = {
    credentials: creds,
    region: process.env.AWS_REGION
};
const ddbTable = process.env.VEHICLE_DTC_TBL;
const dtcTable = process.env.DTC_TBL;

/**
 * Performs operations for dtc recording and management actions interfacing primiarly with
 * Amazon DynamoDB table.
 *
 * @class dtc
 */
let dtc = (function() {

    /**
     * @class dtc
     * @constructor
     */
    let dtc = function() {};

    /**
     * Retrieves a vehicle dtc information.
     * @param {int} page - results page to retrieive
     * @param {getVehicleDtc~callback} cb - The callback that handles the response.
     */
    dtc.prototype.getVehicleDtc = function(vin, page, cb) {
        let _page = parseInt(page);
        if (isNaN(_page)) {
            _page = 0;
        }

        getDtcPage(vin, null, 0, _page, function(err, data) {
            if (err) {
                console.log(err);
                return cb(err, null);
            }

            return cb(null, {
                Items: data
            });
        });
    };

    /**
     * Creates a dtc record for a vehicle.
     * @param {JSON} record - dtc message
     * @param {createDtc~callback} cb - The callback that handles the response.
     */
    dtc.prototype.createDtc = function(record, cb) {

        lookupDtc(record.value, function(err, dtc_info) {
            if (err) {
                console.log(err);
                return cb(err, null);
            }

            let dtc = {
                dtc_id: shortid.generate(),
                vin: record.vin,
                dtc: record.value,
                description: 'No description available.',
                steps: [],
                generated_at: moment.utc(record.timestamp, 'YYYY-MM-DD HH:mm:ss.SSSSSSSSS').format(),
                created_at: moment().utc().format(),
                updated_at: moment().utc().format(),
                acknowledged: false
            };

            if (!_.isEmpty(dtc_info)) {
                dtc.description = dtc_info.Item.description;
            }

            let params = {
                TableName: ddbTable,
                Item: dtc
            };

            let docClient = new AWS.DynamoDB.DocumentClient(dynamoConfig);
            docClient.put(params, function(err, data) {
                if (err) {
                    console.log(err);
                    return cb(err, null);
                }

                let _mobile = [
                    'Connected Car Notification. Your vehicle issued a diagnostic trouble code of',
                    dtc.description, '[', record.value, '].'
                ].join(' ');

                let _hud = [
                    'A trouble code was detected for \'',
                    dtc.description, '\' [', record.value, '].'
                ].join('');

                let _message = {
                    type: 'dtc',
                    mobile: _mobile,
                    mqtt: _hud
                }

                sendNotification(record.vin, _message, function(err, msg_data) {
                    if (err) {
                        console.log(err);
                        return cb(err, null);
                    }

                    console.log(msg_data);
                    return cb(null, dtc);

                });

            });

        });

    };

    /**
     * Get a vehicle dtc record.
     * @param {string} id - dtc record id
     * @param {string} vin - vin of vehicle to delete
     * @param {getDtc~callback} cb - The callback that handles the response.
     */
    dtc.prototype.getDtc = function(id, vin, cb) {

        let params = {
            TableName: ddbTable,
            Key: {
                dtc_id: id,
                vin: vin
            }
        };

        let docClient = new AWS.DynamoDB.DocumentClient(dynamoConfig);
        docClient.get(params, function(err, dtc) {
            if (err) {
                console.log(err);
                return cb(err, null);
            }

            return cb(null, dtc);

        });

    };

    /**
     * Deletes a vehicle dtc record.
     * @param {string} id - dtc record id
     * @param {string} vin - vin of vehicle to delete
     * @param {deleteDtc~callback} cb - The callback that handles the response.
     */
    dtc.prototype.deleteDtc = function(id, vin, cb) {

        let params = {
            TableName: ddbTable,
            Key: {
                dtc_id: id,
                vin: vin
            }
        };

        let docClient = new AWS.DynamoDB.DocumentClient(dynamoConfig);
        docClient.get(params, function(err, dtc) {
            if (err) {
                console.log(err);
                return cb(err, null);
            }

            if (!_.isEmpty(dtc)) {
                docClient.delete(params, function(err, data) {
                    if (err) {
                        console.log(err);
                        return cb(err, null);
                    }

                    return cb(null, data);
                });
            } else {
                return cb({
                    error: {
                        message: 'The dtc record requested to update does not exist.'
                    }
                }, null);
            }

        });

    };

    /**
     * Updates a dtc record for a vehicle.
     * @param {JSON} dtcinfo - updated information for dtc record
     * @param {updateVehicle~callback} cb - The callback that handles the response.
     */
    dtc.prototype.updateVehicle = function(dtcinfo, cb) {

        let params = {
            TableName: ddbTable,
            Key: {
                dtc_id: dtcinfo.dtc_id,
                vin: dtcinfo.vin
            }
        };

        let docClient = new AWS.DynamoDB.DocumentClient(dynamoConfig);
        docClient.get(params, function(err, dtc) {
            if (err) {
                console.log(err);
                return cb(err, null);
            }

            if (!_.isEmpty(dtc)) {

                dtc.Item.updated_at = moment().utc().format();

                let updateparams = {
                    TableName: ddbTable,
                    Item: dtc.Item
                };

                docClient.put(updateparams, function(err, data) {
                    if (err) {
                        console.log(err);
                        return cb(err, null);
                    }

                    return cb(null, data);

                });
            } else {
                return cb({
                    error: {
                        message: 'The dtc record requested to update does not exist.'
                    }
                }, null);
            }

        });

    };

    let getDtcPage = function(vin, lastevalkey, curpage, targetpage, cb) {

        let params = {
            TableName: ddbTable,
            KeyConditionExpression: 'vin = :vin',
            ExpressionAttributeValues: {
                ':vin': vin
            },
            Limit: 20
        };

        if (lastevalkey) {
            params.ExclusiveStartKey = lastevalkey;
        }

        let docClient = new AWS.DynamoDB.DocumentClient(dynamoConfig);
        docClient.query(params, function(err, result) {
            if (err) {
                console.log(err);
                return cb(err, null);
            }

            if (curpage === targetpage) {
                return cb(null, result.Items);
            } else if (result.LastEvaluatedKey) {
                curpage++;
                getVehiclePage(ticket, result.LastEvaluatedKey, curpage, targetpage, cb);
            } else {
                return cb(null, []);
            }

        });

    };

    /**
     * Get a vehicle dtc record.
     * @param {string} code - dtc
     * @param {lookupDtc~callback} cb - The callback that handles the response.
     */

    let lookupDtc = function(code, cb) {

        let params = {
            TableName: dtcTable,
            Key: {
                dtc: code
            }
        };

        let docClient = new AWS.DynamoDB.DocumentClient(dynamoConfig);
        docClient.get(params, function(err, dtc) {
            if (err) {
                console.log(err);
                return cb(err, null);
            }

            return cb(null, dtc);

        });

    };

    let sendNotification = function(vin, message, cb) {
        let _payload = {
            vin: vin,
            message: message
        };

        let params = {
            FunctionName: process.env.NOTIFICATION_SERVICE,
            InvocationType: 'Event',
            LogType: 'None',
            Payload: JSON.stringify(_payload)
        };
        let lambda = new AWS.Lambda();
        lambda.invoke(params, function(err, data) {
            if (err) {
                console.log('Error occured when triggering access logging service.', err);
            }

            return cb(null, 'notification transmission triggered');
        });
    };

    return dtc;

})();

module.exports = dtc;
