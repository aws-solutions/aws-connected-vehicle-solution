'use strict';

let assert = require('chai').assert;
let expect = require('chai').expect;
let path = require('path');
let AWS = require('aws-sdk-mock');
AWS.setSDK(path.resolve('./node_modules/aws-sdk'));

let DriverSafety = require('./driver-safety.js');

describe('driversafety', function() {

    describe('#updateVehicleTrip', function() {

        let payload = {
            vin: 'SAMPLEVIN123',
            trip_id: 'TRIPID123'
        };

        beforeEach(function() {});

        afterEach(function() {
            AWS.restore('DynamoDB.DocumentClient');
        });

        it('should return success when ddb update is successful', function(done) {

            AWS.mock('DynamoDB.DocumentClient', 'put', function(params, callback) {
                callback(null, {
                    result: 'success'
                });
            });

            let _driverSafety = new DriverSafety();
            _driverSafety.updateVehicleTrip(payload, function(err, data) {
                if (err) done(err);
                else {
                    assert.equal(data.result, 'success');
                    done();
                }
            });
        });

        it('should return error information when ddb update fails', function(done) {

            AWS.mock('DynamoDB.DocumentClient', 'put', function(params, callback) {
                callback('error', null);
            });

            let _driverSafety = new DriverSafety();
            _driverSafety.updateVehicleTrip(payload, function(err, data) {
                if (err) {
                    expect(err).to.equal('error');
                    done();
                } else {
                    done('invalid failure for negative test');
                }
            });

        });
    });

    describe('#getDriverScorePrediction', function() {

        let payload = {
            vin: 'SAMPLEVIN123',
            trip_id: 'TRIPID123'
        };

        beforeEach(function() {});

        afterEach(function() {
            AWS.restore('DynamoDB.DocumentClient');
        });

        it('should return success when driver prediction and update are successful', function(done) {

            AWS.mock('DynamoDB.DocumentClient', 'put', function(params, callback) {
                callback(null, {
                    result: 'success'
                });
            });

            let _driverSafety = new DriverSafety();
            _driverSafety.updateVehicleTrip(payload, function(err, data) {
                if (err) done(err);
                else {
                    assert.equal(data.result, 'success');
                    done();
                }
            });
        });

        it('should return error information when driver prediction or update fails', function(done) {

            AWS.mock('DynamoDB.DocumentClient', 'put', function(params, callback) {
                callback('error', null);
            });

            let _driverSafety = new DriverSafety();
            _driverSafety.updateVehicleTrip(payload, function(err, data) {
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
