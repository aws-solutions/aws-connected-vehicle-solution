'use strict';

let assert = require('chai').assert;
let expect = require('chai').expect;
let path = require('path');
let AWS = require('aws-sdk-mock');
AWS.setSDK(path.resolve('./node_modules/aws-sdk'));

let Trip = require('./trip.js');

describe('vehicle', function() {

    describe('#listDtcByVehicle', function() {

        let _test_vehicle = {
            owner: 'user_test_com',
            vin: 'SAMPLEVIN123',
            nickname: 'Test Vehicle',
            odometer: 123
        };

        let _test_trip = {
            trip_id: '07dd5551-9e27-4fd5-813d-f5e009d773d0',
            vin: 'SAMPLEVIN123'
        };

        let _ticket = {
            'cognito:username': 'user_test_com'
        };

        beforeEach(function() {});

        afterEach(function() {
            AWS.restore('DynamoDB.DocumentClient');
        });

        it('should return list of trip records when ddb query is successful', function(done) {

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, {
                    Item: _test_vehicle
                });
            });

            AWS.mock('DynamoDB.DocumentClient', 'query', function(params, callback) {
                callback(null, {
                    Items: [_test_trip]
                });
            });

            let _trip = new Trip();
            _trip.listTripsByVehicle(_ticket, _test_vehicle.vin, function(err, data) {
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

            let _trip = new Trip();
            _trip.listTripsByVehicle(_ticket, _test_vehicle.vin, function(err, data) {
                if (err) {
                    expect(err).to.equal('error');
                    done();
                } else {
                    done('invalid failure for negative test');
                }
            });

        });
    });

    // describe('#getVehicleDtc', function() {
    //
    //     let _test_vehicle = {
    //         owner: 'user_test_com',
    //         vin: 'SAMPLEVIN123',
    //         nickname: 'Test Vehicle',
    //         odometer: 123
    //     };
    //
    //     let _test_dtc = {
    //         acknowledged: false,
    //         created_at: '2017-04-27T14:49:36Z',
    //         udpated_at: '2017-04-27T14:49:36Z',
    //         generated: '2017-04-27T14:49:34Z',
    //         description: 'No description available.',
    //         description: 'No description available.',
    //         dtc: 'P0485',
    //         dtc_id: 'TEST123',
    //         vin: 'SAMPLEVIN123',
    //         steps: []
    //     };
    //
    //     let _ticket = {
    //         'cognito:username': 'user_test_com'
    //     };
    //
    //     beforeEach(function() {});
    //
    //     afterEach(function() {
    //         AWS.restore('DynamoDB.DocumentClient');
    //     });
    //
    //     it('should return a vehicle when ddb get is successful', function(done) {
    //
    //         AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
    //             callback(null, {
    //                 Item: _test_vehicle
    //             });
    //         });
    //
    //         AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
    //             callback(null, {
    //                 Item: _test_vehicle
    //             });
    //         });
    //
    //         let _vehicle = new Vehicle();
    //         _vehicle.getVehicle(_ticket, _test_vehicle.vin, function(err, data) {
    //             if (err) done(err);
    //             else {
    //                 assert.equal(data, _test_vehicle);
    //                 done();
    //             }
    //         });
    //     });
    //
    //     it('should return error information when ddb get fails', function(done) {
    //
    //         AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
    //             callback('error', null);
    //         });
    //
    //         let _vehicle = new Vehicle();
    //         _vehicle.getVehicle(_ticket, _test_vehicle.vin, function(err, data) {
    //             if (err) {
    //                 expect(err).to.equal('error');
    //                 done();
    //             } else {
    //                 done('invalid failure for negative test');
    //             }
    //         });
    //
    //     });
    // });

});
