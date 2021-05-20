# AWS Connected Vehicle Solution
The AWS Connected Vehicle Solution is a reference implementation that provides a foundation for automotive product transformations for connected vehicle services, autonomous driving, electric powertrains, and shared mobility.

## Getting Started
To get started with the AWS Connected Vehicle Solution, please review the solution documentation. https://aws.amazon.com/answers/iot/connected-vehicle-solution/

## Building distributables for customization
* Configure the bucket name of your target Amazon S3 distribution bucket
```
export BUCKET_PREFIX=my-bucket-name
```

* Clone the repository, then build the distibutables:
```
cd ./deployment \n
chmod +x build-s3-dist.sh \n
./build-s3-dist.sh \n
```

* Deploy the distibutables to an Amazon S3 bucket in your account. _Note:_ you must have the AWS Command Line Interface installed.

```
cd ./deployment \n
s3 cp ./dist s3://my-bucket-name/aws-cv-solution/latest --recursive --profile aws-cred-profile-name \n
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

***

Copyright 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Amazon Software License (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at

    http://aws.amazon.com/asl/

or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions and limitations under the License.
