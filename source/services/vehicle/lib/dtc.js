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
const ownerTable = process.env.VEHICLE_OWNER_TBL;

/**
 * Performs operations for dtc management actions interfacing primiarly with
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
     * Retrieves the dtc records for a user's vehicles.
     * @param {JSON} ticket - authentication ticket
     * @param {string} vin - vehicle identification number
     * @param {listVehicles~callback} cb - The callback that handles the response.
     */
    dtc.prototype.listDtcByVehicle = function(ticket, vin, cb) {

        // verify user owns vehicle
        let params = {
            TableName: ownerTable,
            Key: {
                owner_id: ticket['cognito:username'],
                vin: vin
            }
        };

        let docClient = new AWS.DynamoDB.DocumentClient(dynamoConfig);
        docClient.get(params, function(err, data) {
            if (err) {
                console.log(err);
                return cb(err, null);
            }

            if (!_.isEmpty(data)) {
                var dtc_params = {
                    TableName: ddbTable,
                    KeyConditionExpression: 'vin = :vin',
                    ExpressionAttributeValues: {
                        ':vin': vin
                    }
                };

                let docClient = new AWS.DynamoDB.DocumentClient(dynamoConfig);
                docClient.query(dtc_params, function(err, dtc_data) {
                    if (err) {
                        console.log(err);
                        return cb(err, null);
                    }

                    return cb(null, dtc_data);
                });
            } else {
                return cb({
                    error: {
                        message: 'The vehicle requested is not registered under the user.'
                    }
                }, null);
            }
        });

    };

    /**
     * Retrieves a specific dtc record for a user's registered vehicle.
     * @param {JSON} ticket - authentication ticket
     * @param {string} vin - vehicle identification number
     * @param {string} dtcId - DTC record id
     * @param {getVehicle~callback} cb - The callback that handles the response.
     */
    dtc.prototype.getVehicleDtc = function(ticket, vin, dtcId, cb) {

        // verify user owns vehicle
        let params = {
            TableName: ownerTable,
            Key: {
                owner_id: ticket['cognito:username'],
                vin: vin
            }
        };

        let docClient = new AWS.DynamoDB.DocumentClient(dynamoConfig);
        docClient.get(params, function(err, data) {
            if (err) {
                console.log(err);
                return cb(err, null);
            }

            if (!_.isEmpty(data)) {
                let dtc_params = {
                    TableName: ddbTable,
                    Key: {
                        vin: vin,
                        dtc_id: dtcId
                    }
                };

                let docClient = new AWS.DynamoDB.DocumentClient(dynamoConfig);
                docClient.get(dtc_params, function(err, dtc_data) {
                    if (err) {
                        console.log(err);
                        return cb(err, null);
                    }

                    if (!_.isEmpty(dtc_data)) {
                        return cb(null, dtc_data.Item);
                    } else {
                        return cb({
                            error: {
                                message: 'The dtc record requested does not exist.'
                            }
                        }, null);
                    }
                });
            } else {
                return cb({
                    error: {
                        message: 'The vehicle requested is not registered under the user.'
                    }
                }, null);
            }
        });

    };

    /**
     * Acknowledges a specific dtc record for a user's registered vehicle.
     * @param {JSON} ticket - authentication ticket
     * @param {string} vin - vehicle identification number
     * @param {string} dtcId - DTC record id
     * @param {getVehicle~callback} cb - The callback that handles the response.
     */
    dtc.prototype.acknowledgeVehicleDtc = function(ticket, vin, dtcId, cb) {

        // verify user owns vehicle
        let params = {
            TableName: ownerTable,
            Key: {
                owner_id: ticket['cognito:username'],
                vin: vin
            }
        };

        let docClient = new AWS.DynamoDB.DocumentClient(dynamoConfig);
        docClient.get(params, function(err, data) {
            if (err) {
                console.log(err);
                return cb(err, null);
            }

            if (!_.isEmpty(data)) {
                let dtc_params = {
                    TableName: ddbTable,
                    Key: {
                        vin: vin,
                        dtc_id: dtcId
                    }
                };

                let docClient = new AWS.DynamoDB.DocumentClient(dynamoConfig);
                docClient.get(dtc_params, function(err, dtc_data) {
                    if (err) {
                        console.log(err);
                        return cb(err, null);
                    }

                    if (!_.isEmpty(dtc_data)) {

                        dtc_data.Item.acknowledged = true;

                        let updateparams = {
                            TableName: ddbTable,
                            Item: dtc_data.Item
                        };

                        docClient.put(updateparams, function(err, data) {
                            if (err) {
                                console.log(err);
                                return cb(err, null);
                            }

                            return cb(null, dtc_data.Item);
                        });
                    } else {
                        return cb({
                            error: {
                                message: 'The dtc record requested does not exist.'
                            }
                        }, null);
                    }
                });
            } else {
                return cb({
                    error: {
                        message: 'The vehicle requested is not registered under the user.'
                    }
                }, null);
            }
        });

    };

    return dtc;

})();

module.exports = dtc;
