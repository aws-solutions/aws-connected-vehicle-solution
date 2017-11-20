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
This node.js Lambda function code creates and attaches an IoT policy to the
just-in-time registered certificate. It also activates the certificate. The Lambda
function is attached as a rule engine action to the registration topic
Saws/events/certificates/registered/<caCertificateID>
**/

var AWS = require('aws-sdk');

exports.handler = function(event, context, callback) {

    //Replace it with the AWS region the lambda will be running in
    var region = process.env.AWS_REGION;

    var accountId = event.awsAccountId.toString().trim();

    var iot = new AWS.Iot({
        'region': region,
        apiVersion: '2015-05-28'
    });
    var certificateId = event.certificateId.toString().trim();

    //Replace it with your desired topic prefix
    var telemetricsTopic = `connectedcar/telemetry`;
    var aggregationTopic = `connectedcar/trip`;
    var dtcTopic = `connectedcar/dtc`;
    var alertTopic = `connectedcar/alert`;

    var topicName = `connectedcar/obd`;


    var certificateARN = `arn:aws:iot:${region}:${accountId}:cert/${certificateId}`;
    var policyName = `Policy_${certificateId}`;

    //Policy that allows connect, publish, subscribe and receive
    var policy = {
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow",
            "Action": [
                "iot:Connect"
            ],
            "Resource": `arn:aws:iot:${region}:${accountId}:client/` +
                '${iot:Certificate.Subject.CommonName}'
        }, {
            "Effect": "Allow",
            "Action": [
                "iot:Publish",
                "iot:Receive"
            ],
            "Resource": [
                `arn:aws:iot:${region}:${accountId}:topic/${telemetricsTopic}/` +
                '${iot:Certificate.Subject.Pseudonym}',
                `arn:aws:iot:${region}:${accountId}:topic/${aggregationTopic}/` +
                '${iot:Certificate.Subject.Pseudonym}',
                `arn:aws:iot:${region}:${accountId}:topic/${dtcTopic}/` +
                '${iot:Certificate.Subject.Pseudonym}',
                `arn:aws:iot:${region}:${accountId}:topic/${alertTopic}/` +
                '${iot:Certificate.Subject.Pseudonym}/*'
            ]
        }, {
            "Effect": "Allow",
            "Action": [
                "iot:Subscribe",
            ],
            "Resource": [
                `arn:aws:iot:${region}:${accountId}:topicfilter/${telemetricsTopic}/` +
                '${iot:Certificate.Subject.Pseudonym}',
                `arn:aws:iot:${region}:${accountId}:topicfilter/${dtcTopic}/` +
                '${iot:Certificate.Subject.Pseudonym}',
                `arn:aws:iot:${region}:${accountId}:topicfilter/${alertTopic}/` +
                '${iot:Certificate.Subject.Pseudonym}/*'
            ]
        }]
    };

    /*
    Step 1) Create a policy
    */
    iot.createPolicy({
        policyDocument: JSON.stringify(policy),
        policyName: policyName
    }, (err, data) => {
        //Ignore if the policy already exists
        if (err && (!err.code || err.code !== 'ResourceAlreadyExistsException')) {
            console.log(err);
            callback(err, data);
            return;
        }
        console.log(data);

        /*
        Step 2) Attach the policy to the certificate
        */
        iot.attachPrincipalPolicy({
            policyName: policyName,
            principal: certificateARN
        }, (err, data) => {
            //Ignore if the policy is already attached
            if (err && (!err.code || err.code !== 'ResourceAlreadyExistsException')) {
                console.log(err);
                callback(err, data);
                return;
            }
            console.log(data);
            /*
            Step 3) Activate the certificate. Optionally, you can have your custom Certificate Revocation List (CRL) check
            logic here and ACTIVATE the certificate only if it is not in the CRL. Revoke the certificate if it is in the CRL
            */
            iot.updateCertificate({
                certificateId: certificateId,
                newStatus: 'ACTIVE'
            }, (err, data) => {
                if (err) {
                    console.log(err, err.stack);
                    callback(err, data);
                } else {
                    console.log(data);
                    callback(null,
                        "Success, created, attached policy and activated the certificate " +
                        certificateId);
                }
            });
        });
    });

}
