rm -r ./dist

mkdir ./dist

cp ./connected-vehicle-platform.yaml ./dist/aws-connected-vehicle-cloud.template
replace="s/%%BUCKET_NAME%%/$BUCKET_PREFIX/g"
sed -i '' -e $replace dist/aws-connected-vehicle-cloud.template

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
