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

'use strict';

console.log('Loading function');

const AWS = require('aws-sdk');
const https = require('https');
const url = require('url');
const moment = require('moment');
const IotHelper = require('./lib/iot-helper.js');
const KinesisHelper = require('./lib/kinesis-helper.js');
const MetricsHelper = require('./lib/metrics-helper.js');
const DynamoHelper = require('./lib/dynamodb-helper.js');
const UUID = require('node-uuid');

/**
 * Request handler.
 */
exports.handler = (event, context, callback) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    let responseStatus = 'FAILED';
    let responseData = {};

    if (event.RequestType === 'Delete') {
        if (event.ResourceProperties.customAction === 'dynamoDBv2IotRule') {
            responseStatus = 'SUCCESS';

            let _iotHelper = new IotHelper();

            let _params = {
                name: event.ResourceProperties.name,
            };

            _iotHelper.deleteTopicRule(_params, function(err, data) {
                if (err) {
                    responseData = {
                        Error: ['Deleting IoT Topic Rule', event.ResourceProperties.name, 'failed'].join(' ')
                    };
                    console.log([responseData.Error, ':\n', err].join(''));
                }

                sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
            });

        } else if (event.ResourceProperties.customAction === 'kinesisApplication') {
            let _kinesisHelper = new KinesisHelper();
            let _params = {
                appName: event.ResourceProperties.name,
            };

            _kinesisHelper.deleteKinesisAnalyticsApp(_params, function(err, data) {
                if (err) {
                    responseData = {
                        Error: ['Deleting Kinesis Application', event.ResourceProperties.name, 'failed'].join(
                            ' ')
                    };
                    console.log([responseData.Error, ':\n', err].join(''));
                } else {
                    responseStatus = 'SUCCESS';
                    responseData = {};
                }

                sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
            });

        } else {
            sendResponse(event, callback, context.logStreamName, 'SUCCESS');
        }
    }

    if (event.RequestType === 'Create') {
        if (event.ResourceProperties.customAction === 'dynamoDBv2IotRule') {
            let _iotHelper = new IotHelper();
            let _params = {
                name: event.ResourceProperties.name,
                actions: [{
                    dynamoDBv2: {
                        putItem: {
                            tableName: event.ResourceProperties.tableName
                        },
                        roleArn: event.ResourceProperties.roleArn
                    }
                }],
                sql: event.ResourceProperties.sql,
                description: event.ResourceProperties.description
            };

            _iotHelper.createTopicRule(_params, function(err, data) {
                if (err) {
                    responseData = {
                        Error: ['Creating IoT Topic Rule', event.ResourceProperties.name, 'failed'].join(' ')
                    };
                    console.log([responseData.Error, ':\n', err].join(''));
                } else {
                    responseStatus = 'SUCCESS';
                    responseData = {};
                }

                sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
            });

        } else if (event.ResourceProperties.customAction === 'kinesisApplication') {
            let _kinesisHelper = new KinesisHelper();
            let _params = {
                appName: event.ResourceProperties.name,
                deliveryStream: event.ResourceProperties.deliveryStream,
                anomalyStream: event.ResourceProperties.anomalyStream,
                roleArn: event.ResourceProperties.roleArn
            };

            _kinesisHelper.createKinesisAnalyticsApp(_params, function(err, data) {
                if (err) {
                    responseData = {
                        Error: ['Creating Kinesis Application', event.ResourceProperties.name, 'failed'].join(
                            ' ')
                    };
                    console.log([responseData.Error, ':\n', err].join(''));
                } else {
                    responseStatus = 'SUCCESS';
                    responseData = {};
                }

                sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
            });

        } else if (event.ResourceProperties.customAction === 'loadDtcCodes') {
            let _dynamoHelper = new DynamoHelper();
            _dynamoHelper.loadDtcCodes(event.ResourceProperties.tableName, function(err, data) {
                if (err) {
                    responseData = {
                        Error: ['Loading DTC reference table', event.ResourceProperties.tableName, 'failed']
                            .join(' ')
                    };
                    console.log([responseData.Error, ':\n', err].join(''));
                } else {
                    responseStatus = 'SUCCESS';
                    responseData = {};
                }

                sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
            });
        } else if (event.ResourceProperties.customAction === 'loadPois') {
            let _dynamoHelper = new DynamoHelper();
            _dynamoHelper.loadPois(event.ResourceProperties.tableName, function(err, data) {
                if (err) {
                    responseData = {
                        Error: ['Loading Marketing POI table', event.ResourceProperties.tableName, 'failed']
                            .join(' ')
                    };
                    console.log([responseData.Error, ':\n', err].join(''));
                } else {
                    responseStatus = 'SUCCESS';
                    responseData = {};
                }

                sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
            });
        } else if (event.ResourceProperties.customAction === 'createUuid') {
            responseStatus = 'SUCCESS';
            responseData = {
                UUID: UUID.v4()
            };
            sendResponse(event, callback, context.logStreamName, responseStatus, responseData);

        } else if (event.ResourceProperties.customAction === 'sendMetric') {
            let _metricsHelper = new MetricsHelper();

            let _metric = {
                Solution: event.ResourceProperties.solutionId,
                UUID: event.ResourceProperties.UUID,
                TimeStamp: moment().utc().format('YYYY-MM-DD HH:mm:ss.S'),
                Data: {
                    Version: event.ResourceProperties.version,
                    Launch: moment().utc().format()
                }
            };

            if (event.ResourceProperties.anonymousData === 'Yes') {
                _metricsHelper.sendAnonymousMetric(_metric, function(err, data) {
                    if (err) {
                        responseData = {
                            Error: 'Sending anonymous launch metric failed'
                        };
                        console.log([responseData.Error, ':\n', err].join(''));
                    } else {
                        responseData = {};
                    }

                    sendResponse(event, callback, context.logStreamName, 'SUCCESS', responseData);
                });
            } else {
                sendResponse(event, callback, context.logStreamName, 'SUCCESS');
            }

        } else {
            sendResponse(event, callback, context.logStreamName, 'SUCCESS');
        }
    }

};

/**
 * Sends a response to the pre-signed S3 URL
 */
let sendResponse = function(event, callback, logStreamName, responseStatus, responseData) {
    const responseBody = JSON.stringify({
        Status: responseStatus,
        Reason: `See the details in CloudWatch Log Stream: ${logStreamName}`,
        PhysicalResourceId: logStreamName,
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        Data: responseData,
    });

    console.log('RESPONSE BODY:\n', responseBody);
    const parsedUrl = url.parse(event.ResponseURL);
    const options = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.path,
        method: 'PUT',
        headers: {
            'Content-Type': '',
            'Content-Length': responseBody.length,
        }
    };

    const req = https.request(options, (res) => {
        console.log('STATUS:', res.statusCode);
        console.log('HEADERS:', JSON.stringify(res.headers));
        callback(null, 'Successfully sent stack response!');
    });

    req.on('error', (err) => {
        console.log('sendResponse Error:\n', err);
        callback(err);
    });

    req.write(responseBody);
    req.end();
};
