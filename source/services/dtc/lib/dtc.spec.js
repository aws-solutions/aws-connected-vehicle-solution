'use strict';

let assert = require('chai').assert;
let expect = require('chai').expect;
var path = require('path');
let AWS = require('aws-sdk-mock');
AWS.setSDK(path.resolve('./node_modules/aws-sdk'));

let Dtc = require('./dtc.js');

describe('DTC', function() {

    let dtcRecord = {
        dtc_id: 'testid',
        vin: 'TESTVINNUMBER',
        dtc: 'P1234',
        description: 'Mass or Volume Air Flow Circuit Range/Performance Problem',
        steps: [],
        generated_at: '2017-03-11T14:55:22Z',
        created_at: '2017-03-11T14:55:22Z',
        updated_at: '2017-03-11T14:55:22Z'
    };

    let dtcLookupRecord = {
        dtc: 'P1234',
        description: 'Mass or Volume Air Flow Circuit Range/Performance Problem'
    };

    describe('#getVehicleDtc', function() {

        beforeEach(function() {});

        afterEach(function() {
            AWS.restore('DynamoDB.DocumentClient');
        });

        it('should return dtc records when ddb query successful', function(done) {

            AWS.mock('DynamoDB.DocumentClient', 'query', function(params, callback) {
                callback(null, {
                    Items: [dtcRecord]
                });
            });

            let _dtc = new Dtc();
            _dtc.getVehicleDtc(dtcRecord.vin, 0, function(err, data) {
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

            let _dtc = new Dtc();
            _dtc.getVehicleDtc(dtcRecord.vin, 0, function(err, data) {
                if (err) {
                    expect(err).to.equal('error');
                    done();
                } else {
                    done('invalid failure for negative test');
                }
            });

        });
    });

    describe('#createDtc', function() {

        afterEach(function() {
            AWS.restore('DynamoDB.DocumentClient');
            AWS.restore('Lambda');
        });

        it('should return vehicle with successful create', function(done) {

            let record = {
                timestamp: '2017-03-11 14:55:22.204000000',
                vin: 'TESTVINNUMBER',
                name: 'dtc',
                value: 'P1234'
            };

            AWS.mock('DynamoDB.DocumentClient', 'put', function(params, callback) {
                callback(null, dtcRecord);
            });

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, {
                    Item: dtcLookupRecord
                });
            });

            AWS.mock('Lambda', 'invoke', function(params, callback) {
                callback(null, {
                    result: 'success'
                });
            });

            let _dtc = new Dtc();
            _dtc.createDtc(record, function(err, data) {
                if (err) done(err);
                else {
                    expect(data.vin).to.equal(dtcRecord.vin);
                    expect(data.description).to.equal(dtcLookupRecord.description);
                    expect(data.dtc).to.equal(dtcRecord.dtc);
                    done();
                }
            });
        });

        it('should return error information when ddb put fails', function(done) {

            let record = {
                timestamp: '2017-03-11 14:55:22.204000000',
                vin: 'TESTVINNUMBER',
                name: 'dtc',
                value: 'P1234'
            };

            AWS.mock('DynamoDB.DocumentClient', 'put', function(params, callback) {
                callback('ddb error', null);
            });

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, {
                    Item: dtcLookupRecord
                });
            });

            let _dtc = new Dtc();
            _dtc.createDtc(record, function(err, data) {
                if (err) {
                    expect(err).to.equal('ddb error');
                    done();
                } else {
                    done('invalid failure for negative test');
                }
            });

        });
    });

    describe('#getDtc', function() {

        afterEach(function() {
            AWS.restore('DynamoDB.DocumentClient');
        });

        it('should return dtc record ddb get successful', function(done) {

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, {
                    Item: dtcRecord
                });
            });

            let _dtc = new Dtc();
            _dtc.getDtc('testid', 'TESTVINNUMBER', function(err, data) {
                if (err) done(err);
                else {
                    expect(data.Item).to.equal(dtcRecord);
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

            let _dtc = new Dtc();
            _dtc.getDtc('testid', 'TESTVINNUMBER', function(err, data) {
                expect(err).to.eql(error);
                done();
            });

        });
    });

    describe('#deleteDtc', function() {

        afterEach(function() {
            AWS.restore('DynamoDB.DocumentClient');
        });

        it('should return empty result when ddb delete successful', function(done) {

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, {
                    Item: dtcRecord
                });
            });

            AWS.mock('DynamoDB.DocumentClient', 'delete', function(params, callback) {
                callback(null, {});
            });

            let _dtc = new Dtc();
            _dtc.deleteDtc('testid', 'TESTVINNUMBER', function(err, data) {
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
                    Item: dtcRecord
                });
            });

            AWS.mock('DynamoDB.DocumentClient', 'delete', function(params, callback) {
                callback(error, null);
            });

            let _dtc = new Dtc();
            _dtc.deleteDtc('testid', 'TESTVINNUMBER', function(err, data) {
                expect(err).to.eql(error);
                done();
            });

        });
    });

    describe('#updateDtc', function() {

        afterEach(function() {
            AWS.restore('DynamoDB.DocumentClient');
        });

        it('should return updated item when update successful', function(done) {

            let udpatedDtcRecord = {
                dtc_id: 'testid',
                vin: 'TESTVINNUMBER',
                dtc: 'P1234',
                description: 'Mass or Volume Air Flow Circuit Range/Performance Problem',
                steps: [],
                generated_at: '2017-03-11T14:55:22Z',
                created_at: '2017-03-11T14:55:22Z',
                updated_at: '2017-03-11T14:55:22Z',
                acknowledged: true
            };

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, {
                    Item: dtcRecord
                });
            });

            AWS.mock('DynamoDB.DocumentClient', 'put', function(params, callback) {
                callback(null, {
                    Item: udpatedDtcRecord
                });
            });

            let _dtc = new Dtc();
            _dtc.updateVehicle(udpatedDtcRecord, function(err, data) {
                if (err) done(err);
                else {
                    expect(data.Item).to.eql(udpatedDtcRecord);
                    expect(data.Item.acknowledged).to.eql(true);
                    done();
                }
            });
        });

        it('should return error information when ddb put fails', function(done) {

            let udpatedDtcRecord = {
                dtc_id: 'testid',
                vin: 'TESTVINNUMBER',
                dtc: 'P1234',
                description: 'Mass or Volume Air Flow Circuit Range/Performance Problem',
                steps: [],
                generated_at: '2017-03-11T14:55:22Z',
                created_at: '2017-03-11T14:55:22Z',
                updated_at: '2017-03-11T14:55:22Z',
                acknowledged: true
            };

            let error = {
                error: {
                    message: 'Failed to update object in ddb.'
                }
            };

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, {
                    Item: dtcRecord
                });
            });

            AWS.mock('DynamoDB.DocumentClient', 'put', function(params, callback) {
                callback(error, null);
            });

            let _dtc = new Dtc();
            _dtc.updateVehicle(udpatedDtcRecord, function(err, data) {
                expect(err).to.eql(error);
                done();
            });

        });
    });

});
