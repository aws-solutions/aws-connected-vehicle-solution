/********************************************************************************************************************* 
 *  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           * 
 *                                                                                                                    * 
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    * 
 *  with the License. A copy of the License is located at                                                             * 
 *                                                                                                                    * 
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    * 
 *                                                                                                                    * 
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES * 
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    * 
 *  and limitations under the License.                                                                                * 
 *********************************************************************************************************************/

/**
 * @author Solution Builders
 */

'use strict';

let geolib = require('geolib');
let AWS = require('aws-sdk');
let moment = require('moment');
let _ = require('underscore');
let creds = new AWS.EnvironmentCredentials('AWS');

const marketingTable = process.env.MKT_TBL;
const poiTable = process.env.POI_TBL;
const dynamoConfig = {
    credentials: creds,
    region: process.env.AWS_REGION
};

/**
 * Performs operations for location-based advertisements interfacing primiarly with
 * Amazon DynamoDB table.
 *
 * @class advertisement
 */
let advertisement = (function() {

  /**
   * @class advertisement
   * @constructor
   */
  let advertisement = function() {};

  /**
   * Retrieves points of interest from POI table.
   * @param {JSON} payload - location message
   * @param {getPoints~callback} cb - The callback that handles the response.
   */
  advertisement.prototype.getPoints = function(payload, cb) {
      var params = {
          TableName: poiTable
      };

      let docClient = new AWS.DynamoDB.DocumentClient(dynamoConfig);
      docClient.scan(params, function(err, data) {
          if (err) {
              console.log(err);
              return cb(err, null);
          }
          if (data) {
              getGeolocationResults(data.Items, 0, payload, function(err, data) {
                  if (err) {
                      console.log(err);
                      return cb(err, null);
                  } else {
                      return cb(null, 'completed geo eval');
                  }
              });
          }
      });
  };

  /**
   * Determines if the vehicle is near a point of interest.
   * @param {array} items - points of interest
   * @param {int} index - counter
   * @param {JSON} record - location message
   * @param {getGeolocationResults~callback} cb - The callback that handles the response.
   */
  let getGeolocationResults = function(items, index, record, cb) {
      console.log(items)
      if (index < items.length) {
          console.log("processing: ", items[index]);
          let poi_point = {latitude: items[index].latitude, longitude: items[index].longitude};
          if(geolib.isPointWithinRadius(poi_point,{latitude: record.latitude, longitude: record.longitude},items[index].radius)){
              console.log('point is in circle for ' + items[index].poi);
              processAd(record, items[index], function(err, data) {
                  if (err) {
                      console.log("error processing ad");
                      console.log(err);
                      return cb(err, null);
                  } else {
                      index++;
                      getGeolocationResults(items, index, record, cb);
                  }
              });
          } else {
              index++;
              getGeolocationResults(items, index, record, cb);
          }

      } else {
          return cb(null, "evals complete");
      }
  };

  /**
   * Process the nearby point of interest.
   * @param {JSON} record - location message
   * @param {JSON} poi - nearby point of interest
   * @param {processAd~callback} cb - The callback that handles the response.
   */
  let processAd = function(record,poi,cb){
      var params = {
          TableName: marketingTable,
          KeyConditionExpression: 'trip_id = :tripid and poi_id = :poiid',
          ExpressionAttributeValues: {
                      ':tripid': record.trip_id,
                      ':poiid': poi.poi_id
                  }

      };
      let docClient = new AWS.DynamoDB.DocumentClient(dynamoConfig);
      docClient.query(params, function(err, adata){
          if (err) {
              console.log(err);
              return cb(err, null);
              }
          if(adata) {
              console.log(adata);
              let _exist = _.find(adata.Items, function(item) {
                  return item.poi_id === poi.poi_id;
              });
              console.log(_exist);

              if (!_exist){
                      console.log('has not yet received this ad');
                      let _advertisement = {
                          vin: record.vin,
                          trip_id: record.trip_id,
                          created_at: moment().utc().format(),
                          updated_at: moment().utc().format(),
                          identified_at: moment(record.timestamp).utc().format(),
                          poi_id: poi.poi_id,
                          message: poi.message,
                          action: 'none'
                      };

                      let params = {
                          TableName: marketingTable,
                          Item: _advertisement
                      };

                      let docClient = new AWS.DynamoDB.DocumentClient(dynamoConfig);
                      docClient.put(params, function(err, data){
                          if (err) {
                              console.log(err);
                              return cb(err, null);
                          }
                          if (data){

                              console.log(data);
                              let _adInfo = poi.message;

                              let _mobile = [
                                  '*Notification from',
                                  poi.poi,
                                  '-',
                                  _adInfo
                              ].join(' ');

                              let _hud = _adInfo;

                              let _message = {
                                  type: 'info',
                                  mobile: _mobile,
                                  mqtt: _hud
                              };

                              sendNotification(record.vin, _message, function(err, msg_data){
                                  if (err) {
                                      console.log(err);
                                      return cb(err, null);
                                  }
                                  console.log(msg_data);
                                  return cb(null, _advertisement);
                              });
                          }
                      });
                  } else {
                      console.log('already exists');
                      return cb(null, {});
                  }
          } else {
              return cb({
                  error: {
                      message: 'Error occured querying anomaly table.'
                  }
              }, null);
          }
      });
  };

  let sendNotification = function(vin, message, cb) {
      let _payload = {
          vin: vin,
          message: message
      };

      let params = {
          FunctionName: process.env.NOTIFICATION_SERVICE,
          InvocationType: 'Event',
          LogType: 'None',
          Payload: JSON.stringify(_payload)
      };
      let lambda = new AWS.Lambda();
      lambda.invoke(params, function(err, data) {
          if (err) {
              console.log('Error occured when triggering access logging service.', err);
          }

          return cb(null, 'notification transmission triggered');
      });
  };

  return advertisement;

})();

module.exports = advertisement;
