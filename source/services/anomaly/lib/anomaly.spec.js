'use strict';

let assert = require('chai').assert;
let expect = require('chai').expect;
var path = require('path');
let AWS = require('aws-sdk-mock');
AWS.setSDK(path.resolve('./node_modules/aws-sdk'));

let Anomaly = require('./anomaly.js');

describe('Anomaly', function() {

    let anomalyRecord = {
        anomaly_id: 'testid',
        value: 293.3,
        trip_id: "test-trip-id",
        vin: "TESTVINNUMBER",
        anomaly_score: 2.09417735932075,
        telemetric: 'oil_temp',
        identified_at: '2017-05-26T00:59:24Z',
        created_at: '2017-03-11T14:55:22Z',
        updated_at: '2017-03-11T14:55:22Z'
    };

    describe('#getVehicleAnomlay', function() {

        beforeEach(function() {});

        afterEach(function() {
            AWS.restore('DynamoDB.DocumentClient');
        });

        it('should return anomaly records when ddb query successful', function(done) {

            AWS.mock('DynamoDB.DocumentClient', 'query', function(params, callback) {
                callback(null, {
                    Items: [anomalyRecord]
                });
            });

            let _anomaly = new Anomaly();
            _anomaly.getVehicleAnomaly(anomalyRecord.vin, 0, function(err, data) {
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

            let _anomaly = new Anomaly();
            _anomaly.getVehicleAnomaly(anomalyRecord.vin, 0, function(err, data) {
                if (err) {
                    expect(err).to.equal('error');
                    done();
                } else {
                    done('invalid failure for negative test');
                }
            });

        });
    });

    describe('#createAnomaly', function() {

        afterEach(function() {
            AWS.restore('DynamoDB.DocumentClient');
            AWS.restore('Lambda');
        });

        it('should return anomaly with successful create', function(done) {

            let record = {
                "ts": "2017-05-26 00:59:24.466",
                "value": 293.3,
                "trip_id": "test-trip-id",
                "vin": "TESTVINNUMBER",
                "ANOMALY_SCORE": 2.09417735932075,
                "telemetric": "oil_temp",
                "low_limit": 250
            };

            AWS.mock('DynamoDB.DocumentClient', 'put', function(params, callback) {
                callback(null, anomalyRecord);
            });

            AWS.mock('DynamoDB.DocumentClient', 'query', function(params, callback) {
                callback(null, {
                    Items: []
                });
            });

            AWS.mock('Lambda', 'invoke', function(params, callback) {
                callback(null, {
                    result: 'success'
                });
            });

            let _anomaly = new Anomaly();
            _anomaly.createAnomaly(record, function(err, data) {
                if (err) done(err);
                else {
                    expect(data.vin).to.equal(anomalyRecord.vin);
                    expect(data.trip_id).to.equal(anomalyRecord.trip_id);
                    expect(data.anomaly_score).to.equal(anomalyRecord.anomaly_score);
                    expect(data.telemetric).to.equal(anomalyRecord.telemetric);
                    done();
                }
            });
        });

        it('should return empty if value below low limit', function(done) {

            let record = {
                "ts": "2017-05-26 00:59:24.466",
                "value": 249.9,
                "trip_id": "test-trip-id",
                "vin": "TESTVINNUMBER",
                "ANOMALY_SCORE": 2.09417735932075,
                "telemetric": "oil_temp",
                "low_limit": 250
            };

            AWS.mock('DynamoDB.DocumentClient', 'put', function(params, callback) {
                callback(null, anomalyRecord);
            });

            AWS.mock('DynamoDB.DocumentClient', 'query', function(params, callback) {
                callback(null, {
                    Items: []
                });
            });

            AWS.mock('Lambda', 'invoke', function(params, callback) {
                callback(null, {
                    result: 'success'
                });
            });

            let _anomaly = new Anomaly();
            _anomaly.createAnomaly(record, function(err, data) {
                if (err) done(err);
                else {
                    expect(data).to.deep.equal({});
                    done();
                }
            });
        });

        it('should return empty when telemetric anomaly exists for trip', function(done) {

            let record = {
                "ts": "2017-05-26 00:59:24.466",
                "value": 293.3,
                "trip_id": "test-trip-id",
                "vin": "TESTVINNUMBER",
                "ANOMALY_SCORE": 2.09417735932075,
                "telemetric": "oil_temp",
                "low_limit": 250
            };

            AWS.mock('DynamoDB.DocumentClient', 'put', function(params, callback) {
                callback(null, anomalyRecord);
            });

            AWS.mock('DynamoDB.DocumentClient', 'query', function(params, callback) {
                callback(null, {
                    Items: [
                        anomalyRecord
                    ]
                });
            });

            AWS.mock('Lambda', 'invoke', function(params, callback) {
                callback(null, {
                    result: 'success'
                });
            });

            let _anomaly = new Anomaly();
            _anomaly.createAnomaly(record, function(err, data) {
                if (err) done(err);
                else {
                    expect(data).to.deep.equal({});
                    done();
                }
            });
        });

        it('should return error information when ddb put fails', function(done) {

            let record = {
                "ts": "2017-05-26 00:59:24.466",
                "value": 293.3,
                "trip_id": "test-trip-id",
                "vin": "TESTVINNUMBER",
                "ANOMALY_SCORE": 2.09417735932075,
                "low_limit": 250
            };

            AWS.mock('DynamoDB.DocumentClient', 'put', function(params, callback) {
                callback('ddb error', null);
            });

            AWS.mock('DynamoDB.DocumentClient', 'query', function(params, callback) {
                callback(null, {
                    Items: []
                });
            });

            let _anomaly = new Anomaly();
            _anomaly.createAnomaly(record, function(err, data) {
                if (err) {
                    expect(err).to.equal('ddb error');
                    done();
                } else {
                    done('invalid failure for negative test');
                }
            });

        });
    });

    describe('#getAnomaly', function() {

        afterEach(function() {
            AWS.restore('DynamoDB.DocumentClient');
        });

        it('should return anomaly record ddb get successful', function(done) {

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, {
                    Item: anomalyRecord
                });
            });

            let _anomaly = new Anomaly();
            _anomaly.getAnomaly('testid', 'TESTVINNUMBER', function(err, data) {
                if (err) done(err);
                else {
                    expect(data.Item).to.equal(anomalyRecord);
                    done();
                }
            });
        });

        it('should return error information when ddb get fails', function(done) {

            let error = {
                error: {
                    message: 'Failed to get object from ddb.'
                }
            };

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(error, null);
            });

            let _anomaly = new Anomaly();
            _anomaly.getAnomaly('testid', 'TESTVINNUMBER', function(err, data) {
                expect(err).to.eql(error);
                done();
            });

        });
    });

    describe('#deleteAnomaly', function() {

        afterEach(function() {
            AWS.restore('DynamoDB.DocumentClient');
        });

        it('should return empty result when ddb delete successful', function(done) {

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, {
                    Item: anomalyRecord
                });
            });

            AWS.mock('DynamoDB.DocumentClient', 'delete', function(params, callback) {
                callback(null, {});
            });

            let _anomaly = new Anomaly();
            _anomaly.deleteAnomaly('testid', 'TESTVINNUMBER', function(err, data) {
                if (err) done(err);
                else {
                    expect(data).to.be.empty;
                    done();
                }
            });
        });

        it('should return error information when ddb delete fails', function(done) {

            let error = {
                error: {
                    message: 'Failed to delete object from ddb.'
                }
            };

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, {
                    Item: anomalyRecord
                });
            });

            AWS.mock('DynamoDB.DocumentClient', 'delete', function(params, callback) {
                callback(error, null);
            });

            let _anomaly = new Anomaly();
            _anomaly.deleteAnomaly('testid', 'TESTVINNUMBER', function(err, data) {
                expect(err).to.eql(error);
                done();
            });

        });

    });

});
