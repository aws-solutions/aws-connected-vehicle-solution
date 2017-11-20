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
const ddbTable = process.env.VEHICLE_OWNER_TBL;

/**
 * Performs operations for vehicle management actions interfacing primiarly with
 * Amazon DynamoDB table.
 *
 * @class vehicle
 */
let vehicle = (function() {

    /**
     * @class vehicle
     * @constructor
     */
    let vehicle = function() {};

    /**
     * Retrieves a user's vehicles.
     * @param {JSON} ticket - authentication ticket
     * @param {listVehicles~callback} cb - The callback that handles the response.
     */
    vehicle.prototype.listVehicles = function(ticket, cb) {
        var params = {
            TableName: ddbTable,
            KeyConditionExpression: 'owner_id = :uid',
            ExpressionAttributeValues: {
                ':uid': ticket['cognito:username']
            }
        };

        let docClient = new AWS.DynamoDB.DocumentClient(dynamoConfig);
        docClient.query(params, function(err, data) {
            if (err) {
                console.log(err);
                return cb(err, null);
            }

            return cb(null, data);
        });

    };

    /**
     * Registers a vehicle to and owner.
     * @param {JSON} ticket - authentication ticket
     * @param {JSON} vehicle - vehicle object
     * @param {createVehicle~callback} cb - The callback that handles the response.
     */
    vehicle.prototype.createVehicle = function(ticket, vehicle, cb) {

        vehicle.owner_id = ticket['cognito:username'];

        let params = {
            TableName: ddbTable,
            Item: vehicle
        };

        let docClient = new AWS.DynamoDB.DocumentClient(dynamoConfig);
        docClient.put(params, function(err, data) {
            if (err) {
                console.log(err);
                return cb(err, null);
            }

            return cb(null, vehicle);
        });

    };

    /**
     * Retrieves a user's registered vehicle.
     * @param {JSON} ticket - authentication ticket
     * @param {string} vin - vehicle identification number
     * @param {getVehicle~callback} cb - The callback that handles the response.
     */
    vehicle.prototype.getVehicle = function(ticket, vin, cb) {

        let params = {
            TableName: ddbTable,
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
                return cb(null, data.Item);
            } else {
                return cb({
                    error: {
                        message: 'The vehicle requested does not exist.'
                    }
                }, null);
            }
        });

    };

    return vehicle;

})();

module.exports = vehicle;
