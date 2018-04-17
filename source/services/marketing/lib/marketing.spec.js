'use strict';

let assert = require('chai').assert;
let expect = require('chai').expect;
let path = require('path');
let AWS = require('aws-sdk-mock');
AWS.setSDK(path.resolve('./node_modules/aws-sdk'));

let advertisement = require('./marketing.js');

describe('advertisement', function() {

    let payload = {
        timestamp: '2017-12-19 18:10:46.836000000',
        trip_id: '59a84da4-0c17-4f6c-9405-8187dc1af3e5',
        vin: 'SAMPLEVIN123',
        name: 'location',
        latitude: '-12.34567',
        longitude: '98.76543'
    };

    let poiRecord = {
        city: 'Henderson',
        poi_id: 'nv_rec_2',
        radius: '500',
        longitude: '-115.024756',
        message: 'Closed for Winter. Save on 2018 season passes:',
        address: '900 Galleria Dr, Henderson, NV 89011',
        poi: 'Cowabunga Bay Las Vegas',
        latitude: '36.072018',
        state: 'NV'
      };

    describe('#getPoints', function() {

        beforeEach(function() {});

        afterEach(function() {
            AWS.restore('DynamoDB.DocumentClient');
        });

        it('should return a list of POI records when ddb scan successful', function(done) {

              AWS.mock('DynamoDB.DocumentClient', 'scan', function(params, callback) {
                  callback(null, {
                      Items: [poiRecord]
                  });
              });

              let _ad = new advertisement();
              _ad.getPoints(payload, function(err, data) {
                  if (err) done(err);
                  else{
                      expect(data).to.equal('completed geo eval');
                      done();
                  }
              });
        });

        it('should return an error when ddb scan not successful', function(done) {

              AWS.mock('DynamoDB.DocumentClient', 'scan', function(params, callback) {
                  callback('error',null);
              });

              let _ad = new advertisement();
              _ad.getPoints(payload, function(err, data) {
                  if (err) {
                      expect(err).to.equal('error');
                      done();
                  } else{
                      done();
                  }
              });
        });
    });
});
