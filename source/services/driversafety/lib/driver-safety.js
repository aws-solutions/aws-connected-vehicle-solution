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
const ddbTable = process.env.VEHICLE_TRIP_TBL;

/**
 * Performs operations for driver safety recording and management actions interfacing primiarly with
 * Amazon DynamoDB table.
 *
 * @class dtc
 */
let driversafety = (function() {

    /**
     * @class driversafety
     * @constructor
     */
    let driversafety = function() {};

    /**
     * Update the vehicle trip table with the driver safety score.
     * @param {payload} payload - trip aggregation data payload
     * @param {updateVehicleTrip~callback} cb - The callback that handles the response.
     */
    driversafety.prototype.updateVehicleTrip = function(payload, cb) {

        let params = {
            TableName: ddbTable,
            Item: payload
        };

        let docClient = new AWS.DynamoDB.DocumentClient(dynamoConfig);
        docClient.put(params, function(err, data) {
            if (err) {
                console.log(err);
                return cb(err, null);
            }

            return cb(null, {
                result: 'success'
            });
        });

    };

    /**
     * Retrieve the driver safety score categorization predication.
     * @param {payload} payload - trip aggregation data payload
     * @param {getDriverScorePrediction~callback} cb - The callback that handles the response.
     */
    driversafety.prototype.getDriverScorePrediction = function(payload, cb) {

        let _this = this;

        let _triptime = moment(payload.end_time).diff(moment(payload.start_time));
        let _timedelta = (_triptime - payload.idle_duration) / _triptime;
        let _odometer = Math.ceil(payload.odometer);

        // payload.driver_safety_score = ((_timedelta +
        //     ((_odometer - payload.high_braking_event) / _odometer) +
        //     ((_odometer - payload.high_acceleration_event) / _odometer) +
        //     ((payload.high_speed_duration / _triptime) * _odometer)) / 4) * 100;
        //((_odometer - payload.high_speed_duration) / _odometer)) / 4) * 100;

        let _raw_score = (_timedelta +
            Math.abs(((_odometer - payload.high_braking_event) / _odometer)) +
            Math.abs(((_odometer - payload.high_acceleration_event) / _odometer)) +
            ((payload.high_speed_duration / _triptime) * _odometer)) / 4;

        if (_raw_score > 1) {
            _raw_score = _raw_score / 100;
        }

        payload.driver_safety_score = _raw_score * 100;

        _this.updateVehicleTrip(payload, function(err, data) {
            if (err) {
                console.log(err);
                return cb(err, null);
            }

            let _score = {
                score: Number(Math.round(payload.driver_safety_score + 'e' + 1) + 'e-' + 1),
                high_acceleration_events: payload.high_acceleration_event,
                high_braking_events: payload.high_braking_event,
                high_speed_duration: payload.high_speed_duration,
                vehicle_speed_mean: payload.vehicle_speed_mean,
                milage: payload.odometer
            };

            let _mobile = [
                'Connected Car Notification. Your driver score for your last trip was ',
                _score.score, '.'
            ].join(' ');

            let _message = {
                type: 'driverscore',
                mobile: _mobile,
                mqtt: _score
            }

            sendNotification(payload.vin, _message, function(err, msg_data) {
                if (err) {
                    console.log(err);
                    return cb(err, null);
                }

                return cb(null, data);
            });
        });

        // let machinelearning = new AWS.MachineLearning();
        //
        // var params = {
        //     MLModelId: process.env.MODEL_ID,
        //     PredictEndpoint: process.env.PREDICTION_ENDPOINT,
        //     Record: {
        //         high_acceleration_events: payload.high_acceleration_event.toString(),
        //         high_braking_events: payload.high_braking_event.toString(),
        //         high_speed_duration: payload.high_speed_duration.toString(),
        //         idle_duration: payload.idle_duration.toString(),
        //         odometer: payload.odometer.toString(),
        //         vehicle_speed_mean: payload.vehicle_speed_mean.toString()
        //     }
        // };
        // machinelearning.predict(params, function(err, prediction) {
        //     if (err) {
        //         console.log(err);
        //         payload.driver_safety_score = 'NA';
        //     } else {
        //         payload.driver_safety_score = prediction.Prediction.predictedValue;
        //     }
        //
        //     _this.updateVehicleTrip(payload, function(err, data) {
        //         if (err) {
        //             console.log(err);
        //             return cb(err, null);
        //         }
        //
        //         let _score = Number(Math.round(payload.driver_safety_score + 'e' + 1) + 'e-' + 1);
        //         let _mobile = [
        //             'Connected Car Notification. Your driver score for your last trip was ',
        //             _score, '.'
        //         ].join(' ');
        //
        //         let _message = {
        //             type: 'driverscore',
        //             mobile: _mobile,
        //             mqtt: _score
        //         }
        //
        //         sendNotification(payload.vin, _message, function(err, msg_data) {
        //             if (err) {
        //                 console.log(err);
        //                 return cb(err, null);
        //             }
        //
        //             return cb(null, data);
        //         });
        //     });
        //
        // });
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
                console.log('Error occured when triggering notification service.', err);
            }

            return cb(null, 'notification transmission triggered');
        });
    };

    return driversafety;

})();

module.exports = driversafety;
