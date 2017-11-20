'use strict';

let assert = require('chai').assert;
let expect = require('chai').expect;
let path = require('path');
let AWS = require('aws-sdk-mock');
AWS.setSDK(path.resolve('./node_modules/aws-sdk'));

let HealthReport = require('./healthreport.js');

describe('healthreport', function() {

    describe('#listHealthReportsByVehicle', function() {

        let _test_vehicle = {
            owner: 'user_test_com',
            vin: 'SAMPLEVIN123',
            nickname: 'Test Vehicle',
            odometer: 123
        };

        let _test_report = {
            report_id: '07dd5551-9e27-4fd5-813d-f5e009d773d0',
            vin: 'SAMPLEVIN123',
            owner_id: 'user_test_com'
        };

        let _ticket = {
            'cognito:username': 'user_test_com'
        };

        beforeEach(function() {});

        afterEach(function() {
            AWS.restore('DynamoDB.DocumentClient');
        });

        it('should return list of health report records when ddb query is successful', function(done) {

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, {
                    Item: _test_vehicle
                });
            });

            AWS.mock('DynamoDB.DocumentClient', 'query', function(params, callback) {
                callback(null, {
                    Items: [_test_report]
                });
            });

            let _hr = new HealthReport();
            _hr.listHealthReportsByVehicle(_ticket, _test_vehicle.vin, function(err, data) {
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

            let _hr = new HealthReport();
            _hr.listHealthReportsByVehicle(_ticket, _test_vehicle.vin, function(err, data) {
                if (err) {
                    expect(err).to.equal('error');
                    done();
                } else {
                    done('invalid failure for negative test');
                }
            });

        });
    });

    describe('#getVehicleHealthReport', function() {

        let _test_vehicle = {
            owner: 'user_test_com',
            vin: 'SAMPLEVIN123',
            nickname: 'Test Vehicle',
            odometer: 123
        };

        let _test_report = {
            report_id: '07dd5551-9e27-4fd5-813d-f5e009d773d0',
            vin: 'SAMPLEVIN123',
            owner_id: 'user_test_com'
        };

        let _ticket = {
            'cognito:username': 'user_test_com'
        };

        beforeEach(function() {});

        afterEach(function() {
            AWS.restore('DynamoDB.DocumentClient');
        });

        it('should return a health report when ddb get is successful', function(done) {

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                if (params.TableName === 'tblowner') {
                    callback(null, {
                        Item: _test_vehicle
                    });
                } else {
                    callback(null, {
                        Item: _test_report
                    });
                }
            });

            let _hr = new HealthReport();
            _hr.getVehicleHealthReport(_ticket, _test_vehicle.vin, _test_report.report_id,
                function(err, data) {
                    if (err) done(err);
                    else {
                        assert.equal(data, _test_report);
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

            let _hr = new HealthReport();
            _hr.getVehicleHealthReport(_ticket, _test_vehicle.vin, _test_report.report_id,
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
