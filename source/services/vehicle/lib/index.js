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

/**
 * Lib
 */
let AWS = require('aws-sdk');

// add service library modules here
let Vehicle = require('./vehicle.js');
let Dtc = require('./dtc.js');
let Trip = require('./trip.js');
let Anomaly = require('./anomaly.js');
let HealthReport = require('./healthreport.js');

// service constants
const servicename = 'vehicle-service'; // name of the service for logging

/**
 * Verifies user's authorization to execute requested action. If the request is
 * authorized, it is processed, otherwise a 401 unathorized result is returned
 * @param {JSON} event - Request event.
 * @param {respond~requestCallback} cb - The callback that handles the response.
 */
module.exports.respond = function(event, cb) {

    processRequest(event, cb);

};

/**
 * Routes the request to the appropriate logic based on the request resource and method.
 * @param {JSON} event - Request event.
 * @param {JSON} ticket - authorization ticket.
 * @param {processRequest~requestCallback} cb - The callback that handles the response.
 */
function processRequest(event, cb) {

    // set the claims ticket
    let _ticket = event.requestContext.authorizer.claims;

    // catch error if proxied API path sent to service is not processed by available logic
    let INVALID_PATH_ERR = {
        Error: ['Invalid path request ', event.resource, ', ', event.httpMethod].join('')
    };

    // instantiate service modules
    let _vehicle = new Vehicle();
    let _dtc = new Dtc();
    let _trip = new Trip();
    let _anomaly = new Anomaly();
    let _healthreport = new HealthReport();
    let _response = '';

    let _body = {};
    let _operation = '';
    if (event.body) {
        _body = JSON.parse(event.body);
    }

    // set logic for proxied API path
    if (event.resource === '/vehicles' && event.httpMethod === 'GET') {
        _operation = 'retrieving vehicles for user';
        _vehicle.listVehicles(_ticket, function(err, data) {
            processResponse(err, data, _operation, event.requestContext.requestId, _ticket['cognito:username'], cb);
        });
    } else if (event.resource === '/vehicles' && event.httpMethod === 'POST') {
        _operation = 'registering vehicle for owner'; // set a description of the operation for logging
        _vehicle.createVehicle(_ticket, _body, function(err, data) {
            processResponse(err, data, _operation, event.requestContext.requestId, _ticket['cognito:username'], cb);
        });
    } else if (event.resource === '/vehicles/{vin}' && event.httpMethod === 'GET') {
        _operation = 'retrieving vehicle for user';
        _vehicle.getVehicle(_ticket, event.pathParameters.vin, function(err, data) {
            processResponse(err, data, _operation, event.requestContext.requestId, _ticket['cognito:username'], cb);
        });
    } else if (event.resource === '/vehicles/{vin}/dtc' && event.httpMethod === 'GET') {
        _operation = 'retrieving dtc records of vehicle for user';
        _dtc.listDtcByVehicle(_ticket, event.pathParameters.vin, function(err, data) {
            processResponse(err, data, _operation, event.requestContext.requestId, _ticket['cognito:username'], cb);
        });
    } else if (event.resource === '/vehicles/{vin}/dtc/{dtc_id}' && event.httpMethod === 'GET') {
        _operation = 'retrieving dtc record of vehicle for user';
        _dtc.getVehicleDtc(_ticket, event.pathParameters.vin, event.pathParameters.dtc_id, function(err, data) {
            processResponse(err, data, _operation, event.requestContext.requestId, _ticket['cognito:username'], cb);
        });
    } else if (event.resource === '/vehicles/{vin}/dtc/{dtc_id}/acknowledge' && event.httpMethod === 'PUT') {
        _operation = 'acknowledge dtc record of vehicle for user';
        _dtc.acknowledgeVehicleDtc(_ticket, event.pathParameters.vin, event.pathParameters.dtc_id, function(err, data) {
            processResponse(err, data, _operation, event.requestContext.requestId, _ticket['cognito:username'], cb);
        });
    } else if (event.resource === '/vehicles/{vin}/anomalies' && event.httpMethod === 'GET') {
        _operation = 'retrieving anomaly records of vehicle for user';
        _anomaly.listAnomaliesByVehicle(_ticket, event.pathParameters.vin, function(err, data) {
            processResponse(err, data, _operation, event.requestContext.requestId, _ticket['cognito:username'], cb);
        });
    } else if (event.resource === '/vehicles/{vin}/anomalies/{anomaly_id}' && event.httpMethod === 'GET') {
        _operation = 'retrieving anomaly record of vehicle for user';
        _anomaly.getVehicleAnomaly(_ticket, event.pathParameters.vin, event.pathParameters.anomaly_id, function(err, data) {
            processResponse(err, data, _operation, event.requestContext.requestId, _ticket['cognito:username'], cb);
        });
    } else if (event.resource === '/vehicles/{vin}/anomalies/{anomaly_id}/acknowledge' && event.httpMethod === 'PUT') {
        _operation = 'acknowledge anomaly record of vehicle for user';
        _anomaly.acknowledgeVehicleAnomaly(_ticket, event.pathParameters.vin, event.pathParameters.anomaly_id, function(err,
            data) {
            processResponse(err, data, _operation, event.requestContext.requestId, _ticket['cognito:username'], cb);
        });
    } else if (event.resource === '/vehicles/{vin}/trips' && event.httpMethod === 'GET') {
        _operation = 'retrieving trip records of vehicle for user';
        _trip.listTripsByVehicle(_ticket, event.pathParameters.vin, function(err, data) {
            processResponse(err, data, _operation, event.requestContext.requestId, _ticket['cognito:username'], cb);
        });
    } else if (event.resource === '/vehicles/{vin}/trips/{trip_id}' && event.httpMethod === 'GET') {
        _operation = 'retrieving trip record of vehicle for user';
        _trip.getVehicleTrip(_ticket, event.pathParameters.vin, event.pathParameters.trip_id, function(err, data) {
            processResponse(err, data, _operation, event.requestContext.requestId, _ticket['cognito:username'], cb);
        });
    } else if (event.resource === '/vehicles/{vin}/healthreports' && event.httpMethod === 'GET') {
        _operation = 'retrieving health report records of vehicle for user';
        _healthreport.listHealthReportsByVehicle(_ticket, event.pathParameters.vin, function(err, data) {
            processResponse(err, data, _operation, event.requestContext.requestId, _ticket['cognito:username'], cb);
        });
    } else if (event.resource === '/vehicles/{vin}/healthreports/{report_id}' && event.httpMethod === 'GET') {
        _operation = 'retrieving health report record of vehicle for user';
        _healthreport.getVehicleHealthReport(_ticket, event.pathParameters.vin, event.pathParameters.report_id, function(err,
            data) {
            processResponse(err, data, _operation, event.requestContext.requestId, _ticket['cognito:username'], cb);
        });
    } else {
        _response = buildOutput(500, INVALID_PATH_ERR);
        return cb(_response, null);
    }

};

/**
 * Process operation response and log the access/result.
 * @param {JSON} err - Error returned from operation.
 * @param {JSON} data - Data returned from operation.
 * @param {JSON} operation - Description of operation executed.
 * @param {string} requestId - Id of the request.
 * @param {string} userid - Id of user requesting operation.
 * @param {processResponse~callback} cb - The callback that handles the response.
 */
function processResponse(err, data, operation, requestId, userid, cb) {
    let _response = {};

    if (err) {
        console.log(err);
        _response = buildOutput(500, err);
        return cb(_response, null);
        // _accessLog.logEvent(requestId, servicename, userid, operation, 'failed/error', function(err, resp) {
        //     return cb(_response, null);
        // });
    } else {
        _response = buildOutput(200, data);
        return cb(null, _response);
        // _accessLog.logEvent(requestId, servicename, userid, operation, 'success', function(err, resp) {
        //     return cb(null, _response);
        // });
    }
};

/**
 * Constructs the appropriate HTTP response.
 * @param {integer} statusCode - HTTP status code for the response.
 * @param {JSON} data - Result body to return in the response.
 */
function buildOutput(statusCode, data) {

    let _response = {
        statusCode: statusCode,
        headers: {
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(data)
    };

    return _response;
};
