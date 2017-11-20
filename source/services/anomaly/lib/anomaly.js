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
const ddbTable = process.env.VEHICLE_ANOMALY_TBL;

/**
 * Performs operations for anomaly recording and management actions interfacing primiarly with
 * Amazon DynamoDB table.
 *
 * @class anomaly
 */
let anomaly = (function() {

    /**
     * @class anomaly
     * @constructor
     */
    let anomaly = function() {};

    /**
     * Retrieves a vehicle anomaly information.
     * @param {int} page - results page to retrieive
     * @param {getVehicleAnomaly~callback} cb - The callback that handles the response.
     */
    anomaly.prototype.getVehicleAnomaly = function(vin, page, cb) {
        let _page = parseInt(page);
        if (isNaN(_page)) {
            _page = 0;
        }

        getAnomalyPage(vin, null, 0, _page, function(err, data) {
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
     * Creates a anomaly record for a vehicle.
     * @param {JSON} record - anomaly message
     * @param {createAnomaly~callback} cb - The callback that handles the response.
     */
    anomaly.prototype.createAnomaly = function(record, cb) {

        if (record.low_limit < record.value) {

            var params = {
                TableName: ddbTable,
                IndexName: 'vin-trip_id-index',
                KeyConditionExpression: 'vin = :vin and trip_id = :trip_id',
                ExpressionAttributeValues: {
                    ':vin': record.vin,
                    ':trip_id': record.trip_id
                }
            };

            let docClient = new AWS.DynamoDB.DocumentClient(dynamoConfig);
            docClient.query(params, function(err, adata) {
                if (err) {
                    console.log(err);
                    return cb(err, null);
                }

                if (adata) {
                    let _exist = _.find(adata.Items, function(item) {
                        return item.telemetric === record.telemetric;
                    });

                    if (!_exist) {
                        let _anomaly = {
                            anomaly_id: shortid.generate(),
                            value: record.value,
                            trip_id: record.trip_id,
                            vin: record.vin,
                            anomaly_score: record.ANOMALY_SCORE,
                            telemetric: record.telemetric,
                            identified_at: moment(record.ts).utc().format(),
                            created_at: moment().utc().format(),
                            updated_at: moment().utc().format()
                        };

                        let params = {
                            TableName: ddbTable,
                            Item: _anomaly
                        };

                        let docClient = new AWS.DynamoDB.DocumentClient(dynamoConfig);
                        docClient.put(params, function(err, data) {
                            if (err) {
                                console.log(err);
                                return cb(err, null);
                            }

                            let _anomalyInfo = humanizeAnomaly(record.telemetric);

                            let _mobile = [
                                'Connected Car Notification. Your vehicle issued a anomaly alert for',
                                _anomalyInfo
                            ].join(' ');

                            let _hud = [
                                'An anomaly was detected for',
                                _anomalyInfo
                            ].join(' ');

                            let _message = {
                                type: 'anomaly',
                                mobile: _mobile,
                                mqtt: _hud
                            }

                            sendNotification(record.vin, _message, function(err, msg_data) {
                                if (err) {
                                    console.log(err);
                                    return cb(err, null);
                                }

                                console.log(msg_data);
                                return cb(null, _anomaly);

                            });

                        });
                    } else {
                        return cb(null, {});
                    }
                } else {
                    return cb({
                        error: {
                            message: 'Error occured querying anomaly table.'
                        }
                    }, null);
                }
            });
        } else {
            return cb(null, {});
        }

    };

    /**
     * Get a vehicle anomaly record.
     * @param {string} id - anomaly record id
     * @param {string} vin - vin of vehicle to delete
     * @param {getAnomaly~callback} cb - The callback that handles the response.
     */
    anomaly.prototype.getAnomaly = function(id, vin, cb) {

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
     * Deletes a vehicle anomaly record.
     * @param {string} id - anomaly record id
     * @param {string} vin - vin of vehicle to delete
     * @param {deleteAnomaly~callback} cb - The callback that handles the response.
     */
    anomaly.prototype.deleteAnomaly = function(id, vin, cb) {

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
                        message: 'The anomaly record requested to update does not exist.'
                    }
                }, null);
            }

        });

    };

    /**
     * Retrieves a page of anomaly items in groups of 20.
     * @param {string} vin - Vehicle Identification Number
     * @param {string} lastevalkey - last evaluated key from ddb
     * @param {string} curpage - current page to retrieve
     * @param {string} targetpage - targe page to retrieve
     * @param {getAnomalyPage~callback} cb - The callback that handles the response.
     */
    let getAnomalyPage = function(vin, lastevalkey, curpage, targetpage, cb) {

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
     * Send a an anomaly notification.
     * @param {string} vin - Vehicle Identification Number
     * @param {string} message - message to send
     * @param {sendNotification~callback} cb - The callback that handles the response.
     */
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

    /**
     * Humanize the anomaly detection.
     * @param {string} metric - the telemetric anomaly to humanize
     */
    let humanizeAnomaly = function(metric) {

        let _anomalyInfo = '';

        if (metric === 'oil_temp') {
            _anomalyInfo = 'high oil temperature';
        } else if (metric === 'vehicle_speed') {
            _anomalyInfo = 'high vehicle speed';
        }

        return _anomalyInfo;

    };

    return anomaly;

})();

module.exports = anomaly;
