# AWS Connected Vehicle Solution
The AWS Connected Vehicle Solution is a reference implementation that provides a foundation for automotive product transformations for connected vehicle services, autonomous driving, electric powertrains, and shared mobility.

## Getting Started
To get started with the AWS Connected Vehicle Solution, please review the solution documentation. https://aws.amazon.com/answers/iot/connected-vehicle-solution/

## Building distributables for customization
* Configure the bucket name and the region your target Amazon S3 distribution bucket
```
export BUCKET_PREFIX=my-bucket-name
export REGION=us-east-1
```

* Create a Amazon S3 distribution bucket. The name has to be suffixed with the target region. _Note:_ you must have the AWS Command Line Interface installed.
```
aws s3api create-bucket --bucket $BUCKET_PREFIX-$REGION --region $REGION
```

* Clone the repository, then build the distibutables:
```
cd ./deployment
chmod +x build-s3-dist.sh
./build-s3-dist.sh
```

* Deploy the distributables to the Amazon S3 distribution bucket in your account.

```
cd ./deployment
s3 cp ./dist s3://$BUCKET_PREFIX-$REGION/connected-vehicle-solution/latest --recursive --profile aws-cred-profile-name
```

* Get the link of the aws-connected-vehicle-solution.template uploaded to your Amazon S3 bucket.
* Deploy the AWS Connected Vehicle Solution to your account by launching a new AWS CloudFormation stack using the link of the aws-connected-vehicle-solution.template.

## File Structure
The AWS Connected Vehicle Solution project consists of microservices that facilitate the functional areas of the platform. These microservices are deployed to a serverless environment in AWS Lambda.

<pre>
|-source/
  |-services/
    |-helper/       [ AWS CloudFormation custom resource deployment helper ]
  |-services/
    |-anomaly/      [ microservice for humanization and persistence of identified anomalies ]
    |-driversafety/ [ microservice to orchestrate the creation of driver scores ]
    |-dtc/          [ microservice to orchestrate the capture, humanization and persistence of diagnostic trouble codes ]
    |-jitr/         [ microservice to orchestrate registration and policy creation for just-in-time registration of devices ]    
    |-notification/ [ microservice to send SMS and MQTT notifications for the solution ]
    |-vehicle/      [ microservice to provide proxy interface for the AWS Connected Vehicle Solution API ]    
</pre>

Each microservice follows the structure of:

<pre>
|-service-name/
  |-lib/
    |-[ service module libraries and unit tests ]
  |-index.js [ injection point for microservice ]
  |-package.json
</pre>

#### v2.1.0 changes

```
* [Update] Upgrade AWS Lambda version to 8.10

```

***

Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Amazon Software License (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at

    http://aws.amazon.com/asl/

or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions and limitations under the License.
