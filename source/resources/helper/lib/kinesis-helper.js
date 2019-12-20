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

let moment = require('moment');
let AWS = require('aws-sdk');

/**
 * Helper function to interact with AWS IoT for cfn custom resource.
 *
 * @class iotHelper
 */
let kinesisHelper = (function() {

    /**
     * @class kinesisHelper
     * @constructor
     */
    let kinesisHelper = function() {};

    /**
     * Creates an kinesis analytics application.
     * @param {string} settings - Settings for creation of the kinesis analytics application.
     * @param {createKinesisAnalyticsApp~requestCallback} cb - The callback that handles the response.
     */
    kinesisHelper.prototype.createKinesisAnalyticsApp = function(settings, cb) {

        let _params = {
            ApplicationName: settings.appName,
            ApplicationDescription: 'This Amazon Kinesis Analaytics application detects anomalous oil temperatures for the connected vehicle platform',
            Inputs: [{
                InputSchema: {
                    RecordColumns: [{
                        Name: 'ts',
                        SqlType: 'TIMESTAMP',
                        Mapping: '$.timestamp'
                    }, {
                        Name: 'trip_id',
                        SqlType: 'VARCHAR(64)',
                        Mapping: '$.trip_id'
                    }, {
                        Name: 'vin',
                        SqlType: 'VARCHAR(32)',
                        Mapping: '$.vin'
                    }, {
                        Name: 'name',
                        SqlType: 'VARCHAR(32)',
                        Mapping: '$.name'
                    }, {
                        Name: 'val',
                        SqlType: 'DOUBLE',
                        Mapping: '$.value'
                    }, {
                        Name: 'latitude',
                        SqlType: 'DOUBLE',
                        Mapping: '$.latitude'
                    }, {
                        Name: 'longitude',
                        SqlType: 'DOUBLE',
                        Mapping: '$.longitude'
                    }],
                    RecordFormat: {
                        RecordFormatType: 'JSON',
                        MappingParameters: {
                            JSONMappingParameters: {
                                RecordRowPath: '$'
                            }
                        }
                    },
                    RecordEncoding: 'UTF-8'
                },
                NamePrefix: 'SOURCE_SQL_STREAM',
                KinesisFirehoseInput: {
                    ResourceARN: settings.deliveryStream,
                    RoleARN: settings.roleArn
                }
            }],
            Outputs: [{
                DestinationSchema: {
                    RecordFormatType: 'JSON'
                },
                Name: 'ANOMALY_OUTPUT_STREAM',
                KinesisStreamsOutput: {
                    ResourceARN: settings.anomalyStream,
                    RoleARN: settings.roleArn
                }
            }],
            ApplicationCode: 'CREATE OR REPLACE STREAM "TEMP_STREAM" ("ts" TIMESTAMP,"oil_temp" DOUBLE,"trip_id" VARCHAR(64),"vin" VARCHAR(32),"ANOMALY_SCORE" DOUBLE);\r\n\
              CREATE OR REPLACE STREAM "ANOMALY_STREAM" ("ts" TIMESTAMP,"oil_temp" DOUBLE,"trip_id" VARCHAR(64),"vin" VARCHAR(32),"ANOMALY_SCORE" DOUBLE);\r\n\
              CREATE OR REPLACE STREAM "ANOMALY_OUTPUT_STREAM" ("ts" TIMESTAMP,"value" DOUBLE,"trip_id" VARCHAR(64),"vin" VARCHAR(32),"ANOMALY_SCORE" DOUBLE, "telemetric" VARCHAR(32),"low_limit" INT);\r\n\
              -- Option 1 - Compute an anomaly score for each oil temperature record in the input stream using unsupervised machine learning algorithm, Random Cut Forest\r\n\
              --CREATE OR REPLACE PUMP "STREAM_PUMP" AS INSERT INTO "TEMP_STREAM" SELECT STREAM "ts","val", "trip_id", "vin", ANOMALY_SCORE FROM TABLE(RANDOM_CUT_FOREST(CURSOR(SELECT STREAM * FROM "SOURCE_SQL_STREAM_001" WHERE "name" = \'oil_temp\' AND "val" > 240),10,10,10,1));\r\n\
              -- Option 2 - Compute an anomaly score for each oil temperaure record in the input stream, where the anomaly is a simple diff between the observed oil temperature and a predefined average\r\n\
              CREATE OR REPLACE PUMP "STREAM_PUMP" AS INSERT INTO "TEMP_STREAM" SELECT STREAM "ts","val", "trip_id", "vin", ("val"-250) as ANOMALY_SCORE FROM "SOURCE_SQL_STREAM_001" WHERE "name" = \'oil_temp\';\r\n\
              CREATE OR REPLACE PUMP "ANOMALY_STREAM_PUMP" AS INSERT INTO "ANOMALY_STREAM" SELECT STREAM * FROM "TEMP_STREAM";\r\n\
              CREATE OR REPLACE PUMP "OUTPUT_PUMP" AS INSERT INTO "ANOMALY_OUTPUT_STREAM" SELECT STREAM *,\'oil_temp\' as telemetric, 250 as low_limit FROM "TEMP_STREAM" WHERE ANOMALY_SCORE > 30;\r\n'
        };

        let kinesisAnalytics = new AWS.KinesisAnalytics();
        kinesisAnalytics.createApplication(_params, function(err, data) {
            if (err) {
                console.log(err);
                console.log('Could not create Amazon Kinesis Analytics application');
                return cb(err, null);
            } else {
                console.log('Amazon Kinesis Analytics application was successfully created');
                kinesisAnalytics.describeApplication({
                    ApplicationName: settings.appName
                }, function(err, appData) {
                    if (err) {
                        console.log(err);
                        console.log('Could not start Amazon Kinesis Analytics application');
                        return cb(err, null);
                    } else {
                        console.log('Found Amazon Kinesis Analytics application input Id');
                        let appInputId = appData.ApplicationDetail.InputDescriptions[0].InputId;
                        startKinesisAnalyticsApp({
                            appName: settings.appName,
                            appInputId: appInputId
                        }, function(err, startData) {
                            if (err) {
                                return cb(err, null);
                            }

                            return cb(null, startData);
                        });
                    }
                });
            }
        });

    };

    /**
     * Deletes a kinesis analytics application.
     * @param {string} settings - Settings for deletion of the kinesis analytics application.
     * @param {deleteKinesisAnalyticsApp~requestCallback} cb - The callback that handles the response.
     */
    kinesisHelper.prototype.deleteKinesisAnalyticsApp = function(settings, cb) {

        console.log('Preparing to delete Amazon Kinesis Analytics application');
        console.log("Getting the Amazon Kinesis Analytics applications");

        let _params = {
            ApplicationName: settings.appName
        };

        let kinesisAnalytics = new AWS.KinesisAnalytics();
        kinesisAnalytics.describeApplication(_params, function(err, data) {
            if (err) {
                console.log(
                    "Getting the Amazon Kinesis Analytics applications failed. Assuming it does not exist."
                );
                console.log(err);
                // assume application does not exist
                return cb(null, data);
            } else {
                console.log(data);
                let _delete_params = {
                    ApplicationName: settings.appName,
                    CreateTimestamp: data.ApplicationDetail.CreateTimestamp
                };
                kinesisAnalytics.deleteApplication(_delete_params, function(err, deleteData) {
                    if (err) {
                        console.log("Deleting the Amazon Kinesis Analytics application failed.");
                        console.log(err);
                        // assume application does not exist
                        return cb(err, null);
                    } else {
                        console.log(
                            "Deleting the Amazon Kinesis Analytics application succeeded.");
                        console.log(deleteData);
                        return cb(null, deleteData);
                    }
                });
            }
        });
    };

    /**
     * Start a kinesis analytics application.
     * @param {string} settings - Settings for starting of the kinesis analytics application.
     * @param {startKinesisAnalyticsApp~requestCallback} cb - The callback that handles the response.
     */
    let startKinesisAnalyticsApp = function(params, cb) {

        console.log('Trying to start application');
        let kinesisAnalytics = new AWS.KinesisAnalytics();
        kinesisAnalytics.startApplication({
            ApplicationName: params.appName,
            InputConfigurations: [{
                Id: params.appInputId,
                InputStartingPositionConfiguration: {
                    InputStartingPosition: "NOW"
                }
            }]
        }, function(err, data) {
            if (err) {
                console.log(err);
                console.log('Could not start Amazon Kinesis Analytics application');
                return cb(err, null);
            } else {
                console.log(data);
                console.log('Starting Amazon Kinesis Analytics application');
                return cb(null, data);
            }
        });
    };

    return kinesisHelper;

})();

module.exports = kinesisHelper;
