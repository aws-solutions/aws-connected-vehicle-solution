if [[ -d ./dist ]]; then
    rm -r ./dist
fi

mkdir ./dist

cp ./aws-connected-vehicle-solution.template ./dist/aws-connected-vehicle-solution.template

if [[ -z $BUCKET_PREFIX ]]; then
    export BUCKET_PREFIX=solutions-test
    if [[ $PIPELINE_TYPE = "release" ]]; then
        export BUCKET_PREFIX=solutions
    fi
fi

replace="s/%%BUCKET_PREFIX%%/$BUCKET_PREFIX/g"
sed -i '' -e $replace dist/aws-connected-vehicle-solution.template

cd ../source/services/anomaly
npm install
npm run build
npm run zip
cp ./dist/vhr-anomaly-service.zip ../../../deployment/dist/vhr-anomaly-service.zip

cd ../driversafety
npm install
npm run build
npm run zip
cp ./dist/vhr-driver-safety-service.zip ../../../deployment/dist/vhr-driver-safety-service.zip

cd ../marketing
npm install
npm run build
npm run zip
cp ./dist/vhr-marketing-service.zip ../../../deployment/dist/vhr-marketing-service.zip

cd ../dtc
npm install
npm run build
npm run zip
cp ./dist/vhr-dtc-service.zip ../../../deployment/dist/vhr-dtc-service.zip

cd ../notification
npm install
npm run build
npm run zip
cp ./dist/vhr-notification-service.zip ../../../deployment/dist/vhr-notification-service.zip

cd ../vehicle
npm install
npm run build
npm run zip
cp ./dist/vhr-vehicle-service.zip ../../../deployment/dist/vhr-vehicle-service.zip

cd ../jitr
npm install
npm run build
npm run zip
cp ./dist/vhr-vehicle-jitr.zip ../../../deployment/dist/vhr-vehicle-jitr.zip

cd ../../resources/helper
npm install
npm run build
npm run zip
cp ./dist/cv-deployment-helper.zip ../../../deployment/dist/cv-deployment-helper.zip
