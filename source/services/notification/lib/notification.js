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
const poolId = process.env.USER_POOL_ID;

/**
 * Performs operations for notification actions interfacing primiarly with
 * Amazon DynamoDB table, cognito and SNS.
 *
 * @class notification
 */
let notification = (function() {

    /**
     * @class notification
     * @constructor
     */
    let notification = function() {};

    /**
     * Send message to mobile device via SNS.
     * @param {payload} payload - message data payload
     * @param {sendNotification~callback} cb - The callback that handles the response.
     */
    notification.prototype.sendNotification = function(payload, cb) {

        getVehicleOwner(payload.vin, function(err, data) {
            if (err) {
                console.log(err);
                return cb(err, null);
            }

            if (data.Items.length > 0) {
                getUser(data.Items[0].owner_id, function(err, user) {
                    if (err) {
                        console.log(err);
                        return cb(err, null);
                    }

                    let params = {
                        Message: payload.message.mobile,
                        PhoneNumber: user.phone
                    };

                    let sns = new AWS.SNS();
                    sns.publish(params, function(err, msg_data) {
                        if (err) {
                            console.log(err);
                            return cb(err, null);
                        }

                        console.log(msg_data);
                        return cb(null, {
                            result: 'Owner notification sent'
                        });
                    });
                });
            } else {
                return cb(null, {
                    error: {
                        message: 'VIN does not have an associated onwer.'
                    }
                });
            }
        });

    };

    /**
     * Send notification message via MQTT.
     * @param {payload} payload - message data payload
     * @param {sendNotiviationViaMqtt~callback} cb - The callback that handles the response.
     */
    notification.prototype.sendNotiviationViaMqtt = function(payload, cb) {
        let _topic = ['connectedcar/alert', payload.vin, payload.type].join('/')

        var params = {
            topic: _topic,
            payload: JSON.stringify({
                timestamp: moment.utc().format('YYYY-MM-DD HH:mm:ss.SSSSSSSSS'),
                type: payload.message.type,
                message: payload.message.mqtt
            }),
            qos: 0
        };

        var iot = new AWS.Iot();

        iot.describeEndpoint({}, (err, data) => {
            if (err) {
                console.log(err);
                return cb(err, null);
            }

            var iotdata = new AWS.IotData({
                endpoint: data.endpointAddress
            });

            iotdata.publish(params, function(err, msg_data) {
                if (err) {
                    console.log(err);
                    return cb(err, null);
                }

                return cb(null, {
                    result: 'Owner notification sent'
                });
            });
        });
    };

    /**
     * Get the owner id for a vehicle.
     * @param {string} vin - vehicle identification number
     * @param {getVehicleOwner~callback} cb - The callback that handles the response.
     */
    let getVehicleOwner = function(vin, cb) {

        var params = {
            TableName: ddbTable,
            IndexName: 'vin-index',
            KeyConditionExpression: 'vin = :vin',
            ExpressionAttributeValues: {
                ':vin': vin
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
     * Retrieves a user account from the Amazon Cognito user pool.
     * @param {integer} userId - Username of account to retrieve from the user pool.
     * @param {getUser~requestCallback} cb - The callback that handles the response.
     */
    let getUser = function(userId, cb) {

        let params = {
            UserPoolId: poolId,
            Username: userId
        };

        let cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();
        cognitoidentityserviceprovider.adminGetUser(params, function(err, data) {
            if (err) {
                console.log(err);
                return cb(err.message, null);
            }

            let _user = {
                user_id: data.Username,
                phone: '',
                email: '',
                enabled: data.Enabled,
                created_at: data.UserCreateDate,
                updated_at: data.UserLastModifiedDate
            };

            let _em = _.where(data.UserAttributes, {
                Name: 'email'
            });
            if (_em.length > 0) {
                _user.email = _em[0].Value;
            }

            let _phone = _.where(data.UserAttributes, {
                Name: 'phone_number'
            });
            if (_phone.length > 0) {
                _user.phone = _phone[0].Value;
            }

            return cb(null, _user);

        });

    };

    return notification;

})();

module.exports = notification;
