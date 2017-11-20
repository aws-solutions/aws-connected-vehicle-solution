'use strict';

let assert = require('chai').assert;
let expect = require('chai').expect;
let path = require('path');
let AWS = require('aws-sdk-mock');
AWS.setSDK(path.resolve('./node_modules/aws-sdk'));

let Vehicle = require('./vehicle.js');

describe('vehicle', function() {

    describe('#listVehicles', function() {

        let _test_vehicle = {
            owner: 'user_test_com',
            vin: 'SAMPLEVIN123',
            nickname: 'Test Vehicle',
            odometer: 123
        };

        let _ticket = {
            'cognito:username': 'user_test_com'
        };

        beforeEach(function() {});

        afterEach(function() {
            AWS.restore('DynamoDB.DocumentClient');
        });

        it('should return list of vehicles when ddb query is successful', function(done) {

            AWS.mock('DynamoDB.DocumentClient', 'query', function(params, callback) {
                callback(null, {
                    Items: [_test_vehicle]
                });
            });

            let _vehicle = new Vehicle();
            _vehicle.listVehicles(_ticket, function(err, data) {
                if (err) done(err);
                else {
                    assert.equal(data.Items.length, 1);
                    done();
                }
            });
        });

        it('should return error information when ddb query fails', function(done) {

            AWS.mock('DynamoDB.DocumentClient', 'query', function(params, callback) {
                callback('error', null);
            });

            let _vehicle = new Vehicle();
            _vehicle.listVehicles(_ticket, function(err, data) {
                if (err) {
                    expect(err).to.equal('error');
                    done();
                } else {
                    done('invalid failure for negative test');
                }
            });

        });
    });

    describe('#getVehicle', function() {

        let _test_vehicle = {
            owner: 'user_test_com',
            vin: 'SAMPLEVIN123',
            nickname: 'Test Vehicle',
            odometer: 123
        };

        let _ticket = {
            'cognito:username': 'user_test_com'
        };

        beforeEach(function() {});

        afterEach(function() {
            AWS.restore('DynamoDB.DocumentClient');
        });

        it('should return a vehicle when ddb get is successful', function(done) {

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, {
                    Item: _test_vehicle
                });
            });

            let _vehicle = new Vehicle();
            _vehicle.getVehicle(_ticket, _test_vehicle.vin, function(err, data) {
                if (err) done(err);
                else {
                    assert.equal(data, _test_vehicle);
                    done();
                }
            });
        });

        it('should return error information when ddb get fails', function(done) {

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback('error', null);
            });

            let _vehicle = new Vehicle();
            _vehicle.getVehicle(_ticket, _test_vehicle.vin, function(err, data) {
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
