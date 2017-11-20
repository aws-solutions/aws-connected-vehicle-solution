'use strict';

let assert = require('chai').assert;
let expect = require('chai').expect;
let path = require('path');
let AWS = require('aws-sdk-mock');
AWS.setSDK(path.resolve('./node_modules/aws-sdk'));

let Notification = require('./notification.js');

describe('notification', function() {

    describe('#sendNotification', function() {

        let payload = {
            vin: 'SAMPLEVIN123',
            message: {
                type: 'test',
                mobile: 'mobile test message',
                mqtt: 'mqtt test message'
            }
        };

        let _test_vehicle = {
            owner_id: 'user_test_com',
            vin: 'SAMPLEVIN123',
            nickname: 'Test Vehicle',
            odometer: 123
        };

        let _user = {
            Username: 'Test User',
            Enabled: true,
            UserCreateDate: '2017-03-11T14:55:22Z',
            UserLastModifiedDate: '2017-03-11T14:55:22Z',
            UserAttributes: [{
                Name: 'email',
                Value: 'user@test.com'
            }, {
                Name: 'phone_number',
                Value: '111-111-1111'
            }]
        };

        beforeEach(function() {});

        afterEach(function() {
            AWS.restore('DynamoDB.DocumentClient');
            AWS.restore('CognitoIdentityServiceProvider');
            AWS.restore('SNS');
        });

        it('should return success when notification is successful sent', function(done) {

            AWS.mock('DynamoDB.DocumentClient', 'query', function(params, callback) {
                callback(null, {
                    Items: [_test_vehicle]
                });
            });

            AWS.mock('CognitoIdentityServiceProvider', 'adminGetUser', function(params, callback) {
                callback(null, _user);
            });

            AWS.mock('SNS', 'publish', function(params, callback) {
                callback(null, {
                    result: 'success'
                });
            });

            let _notification = new Notification();
            _notification.sendNotification(payload, function(err, data) {
                if (err) done(err);
                else {
                    assert.equal(data.result, 'Owner notification sent');
                    done();
                }
            });
        });

        it('should return error information when ddb query fails', function(done) {

            AWS.mock('DynamoDB.DocumentClient', 'query', function(params, callback) {
                callback('ddb error', null);
            });

            AWS.mock('CognitoIdentityServiceProvider', 'adminGetUser', function(params, callback) {
                callback(null, _user);
            });

            AWS.mock('SNS', 'publish', function(params, callback) {
                callback(null, {
                    result: 'success'
                });
            });

            let _notification = new Notification();
            _notification.sendNotification(payload, function(err, data) {
                if (err) {
                    expect(err).to.equal('ddb error');
                    done();
                } else {
                    done('invalid failure for negative test');
                }
            });

        });

        it('should return error information when cognito lookup fails', function(done) {

            AWS.mock('DynamoDB.DocumentClient', 'query', function(params, callback) {
                callback(null, {
                    Items: [_test_vehicle]
                });
            });

            AWS.mock('CognitoIdentityServiceProvider', 'adminGetUser', function(params, callback) {
                callback({
                    message: 'cognito error'
                }, null);
            });

            AWS.mock('SNS', 'publish', function(params, callback) {
                callback(null, {
                    result: 'success'
                });
            });

            let _notification = new Notification();
            _notification.sendNotification(payload, function(err, data) {
                if (err) {
                    expect(err).to.equal('cognito error');
                    done();
                } else {
                    done('invalid failure for negative test');
                }
            });

        });

        it('should return error information when sns send fails', function(done) {

            AWS.mock('DynamoDB.DocumentClient', 'query', function(params, callback) {
                callback(null, {
                    Items: [_test_vehicle]
                });
            });

            AWS.mock('CognitoIdentityServiceProvider', 'adminGetUser', function(params, callback) {
                callback(null, _user);
            });

            AWS.mock('SNS', 'publish', function(params, callback) {
                callback('sns error', null);
            });

            let _notification = new Notification();
            _notification.sendNotification(payload, function(err, data) {
                if (err) {
                    expect(err).to.equal('sns error');
                    done();
                } else {
                    done('invalid failure for negative test');
                }
            });

        });

    });

    describe('#sendNotiviationViaMqtt', function() {

        let payload = {
            vin: 'SAMPLEVIN123',
            message: {
                type: 'test',
                mobile: 'mobile test message',
                mqtt: 'mqtt test message'
            }
        };

        beforeEach(function() {});

        afterEach(function() {
            AWS.restore('Iot');
            AWS.restore('IotData');
        });

        it('should return success when notification is successful sent', function(done) {

            AWS.mock('Iot', 'describeEndpoint', function(params, callback) {
                callback(null, {
                    endpointAddress: 'sample.iot.region.amazonaws.com'
                });
            });

            AWS.mock('IotData', 'publish', function(params, callback) {
                callback(null, {
                    result: 'success'
                });
            });

            let _notification = new Notification();
            _notification.sendNotiviationViaMqtt(payload, function(err, data) {
                if (err) done(err);
                else {
                    assert.equal(data.result, 'Owner notification sent');
                    done();
                }
            });
        });

        it('should return error information when publish fails', function(done) {

            AWS.mock('Iot', 'describeEndpoint', function(params, callback) {
                callback(null, {
                    endpointAddress: 'sample.iot.region.amazonaws.com'
                });
            });

            AWS.mock('IotData', 'publish', function(params, callback) {
                callback({
                    message: 'iotdata error'
                }, null);
            });

            let _notification = new Notification();
            _notification.sendNotiviationViaMqtt(payload, function(err,
                data) {
                if (err) {
                    expect(err.message).to.equal('iotdata error');
                    done();
                } else {
                    done('invalid failure for negative test');
                }
            });

        });

    });

});
