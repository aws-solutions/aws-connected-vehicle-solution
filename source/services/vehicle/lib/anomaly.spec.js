'use strict';

let assert = require('chai').assert;
let expect = require('chai').expect;
let path = require('path');
let AWS = require('aws-sdk-mock');
AWS.setSDK(path.resolve('./node_modules/aws-sdk'));

let Anomaly = require('./anomaly.js');

describe('anomaly', function() {

    describe('#listDtcByVehicle', function() {

        let _test_vehicle = {
            owner: 'user_test_com',
            vin: 'SAMPLEVIN123',
            nickname: 'Test Vehicle',
            odometer: 123
        };

        let _test_anomaly = {
            acknowledged: false,
            anomaly_id: 'TEST123',
            vin: 'SAMPLEVIN123'
        };

        let _ticket = {
            'cognito:username': 'user_test_com'
        };

        beforeEach(function() {});

        afterEach(function() {
            AWS.restore('DynamoDB.DocumentClient');
        });

        it('should return list of dtc records when ddb query is successful', function(done) {

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, {
                    Item: _test_vehicle
                });
            });

            AWS.mock('DynamoDB.DocumentClient', 'query', function(params, callback) {
                callback(null, {
                    Items: [_test_anomaly]
                });
            });

            let _anomaly = new Anomaly();
            _anomaly.listAnomaliesByVehicle(_ticket, _test_vehicle.vin, function(err, data) {
                if (err) done(err);
                else {
                    assert.equal(data.Items.length, 1);
                    done();
                }
            });
        });

        it('should return error information when ddb query fails', function(done) {

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, {
                    Item: _test_vehicle
                });
            });

            AWS.mock('DynamoDB.DocumentClient', 'query', function(params, callback) {
                callback('error', null);
            });

            let _anomaly = new Anomaly();
            _anomaly.listAnomaliesByVehicle(_ticket, _test_vehicle.vin, function(err, data) {
                if (err) {
                    expect(err).to.equal('error');
                    done();
                } else {
                    done('invalid failure for negative test');
                }
            });

        });
    });

    describe('#getVehicleAnomaly', function() {

        let _test_vehicle = {
            owner: 'user_test_com',
            vin: 'SAMPLEVIN123',
            nickname: 'Test Vehicle',
            odometer: 123
        };

        let _test_anomaly = {
            acknowledged: false,
            anomaly_id: 'TEST123',
            vin: 'SAMPLEVIN123'
        };

        let _ticket = {
            'cognito:username': 'user_test_com'
        };

        beforeEach(function() {});

        afterEach(function() {
            AWS.restore('DynamoDB.DocumentClient');
        });

        it('should return a anomaly when ddb get is successful', function(done) {

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                if (params.TableName === 'tblowner') {
                    callback(null, {
                        Item: _test_vehicle
                    });
                } else {
                    callback(null, {
                        Item: _test_anomaly
                    });
                }
            });

            let _anomaly = new Anomaly();
            _anomaly.getVehicleAnomaly(_ticket, _test_vehicle.vin, _test_anomaly.anomaly_id,
                function(err, data) {
                    if (err) done(err);
                    else {
                        assert.equal(data, _test_anomaly);
                        done();
                    }
                });
        });

        it('should return error information when ddb get fails', function(done) {

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                if (params.TableName === 'tblowner') {
                    callback(null, {
                        Item: _test_vehicle
                    });
                } else {
                    callback('error', null);
                }
            });

            let _anomaly = new Anomaly();
            _anomaly.getVehicleAnomaly(_ticket, _test_vehicle.vin, _test_anomaly.anomaly_id,
                function(err, data) {

                    if (err) {
                        expect(err).to.equal('error');
                        done();
                    } else {
                        done('invalid failure for negative test');
                    }
                });
        });
    });

});
