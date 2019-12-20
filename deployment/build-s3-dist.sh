#!/bin/bash  
#  
# This assumes all of the OS-level configuration has been completed and git repo has already been cloned  
#  
# This script should be run from the repo's deployment directory  
# cd deployment  
# ./build-s3-dist.sh source-bucket-base-name trademarked-solution-name version-code  
#  
# Paramenters:  
#  - source-bucket-base-name: Name for the S3 bucket location where the template will source the Lambda  
#    code from. The template will append '-[region_name]' to this bucket name.  
#    For example: ./build-s3-dist.sh solutions my-solution v1.0.0  
#    The template will then expect the source code to be located in the solutions-[region_name] bucket  
#  
#  - trademarked-solution-name: name of the solution for consistency  
#  
#  - version-code: version of the package  

# Check to see if input has been provided:  
if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ] || [ -z "$4" ]; then 
    echo "Please provide the base source bucket name, trademark approved solution name, version and template bucket name where the lambda code will eventually reside."  
    echo "For example: ./build-s3-dist.sh solutions trademarked-solution-name v1.0.0"  
    exit 1  
fi  

# Get reference for all important folders  
template_dir="$PWD"  
template_dist_dir="$template_dir/global-s3-assets"  
build_dist_dir="$template_dir/regional-s3-assets"  
source_dir="$template_dir/../source"  

echo "------------------------------------------------------------------------------"  
echo "[Init] Clean old dist folders"  
echo "------------------------------------------------------------------------------"  
echo "rm -rf $template_dist_dir"  
rm -rf $template_dist_dir  
echo "mkdir -p $template_dist_dir"  
mkdir -p $template_dist_dir  
echo "rm -rf $build_dist_dir"  
rm -rf $build_dist_dir  
echo "mkdir -p $build_dist_dir"  
mkdir -p $build_dist_dir  

echo "------------------------------------------------------------------------------"  
echo "[Packing] Templates"  
echo "------------------------------------------------------------------------------"  
echo "cp $template_dir/*.template $template_dist_dir"  
#cp -R $template_dir/*.template $template_dist_dir/ 
cp -R $template_dir/connected-vehicle-platform.yaml $template_dist_dir/aws-connected-vehicle-solution.template

echo "Updating code source bucket in template with $1"  
replace="s/%%BUCKET_NAME%%/$1/g" 
sed -i '' -e $replace $template_dist_dir/*.template 

replace="s/%%SOLUTION_NAME%%/$2/g" 
sed -i '' -e $replace $template_dist_dir/*.template 

replace="s/%%VERSION%%/$3/g" 
sed -i '' -e $replace $template_dist_dir/*.template 

replace="s/%%TEMPLATE_BUCKET_NAME%%/$4/g" 
sed -i '' -e $replace $template_dist_dir/*.template 

echo "------------------------------------------------------------------------------"  
echo "[Rebuild] Services - anomaly"  
echo "------------------------------------------------------------------------------"  

cd $source_dir/services/anomaly
npm install
npm run build
npm run zip
cp dist/vhr-anomaly-service.zip $build_dist_dir/vhr-anomaly-service.zip

echo "------------------------------------------------------------------------------"  
echo "[Rebuild] Services - driversafety"  
echo "------------------------------------------------------------------------------"  

cd $source_dir/services/driversafety
npm install
npm run build
npm run zip
cp dist/vhr-driver-safety-service.zip $build_dist_dir/vhr-driver-safety-service.zip

echo "------------------------------------------------------------------------------"  
echo "[Rebuild] Services - marketing"  
echo "------------------------------------------------------------------------------"  

cd $source_dir/services/marketing
npm install
npm run build
npm run zip
cp dist/vhr-marketing-service.zip $build_dist_dir/vhr-marketing-service.zip

echo "------------------------------------------------------------------------------"  
echo "[Rebuild] Services - dtc"  
echo "------------------------------------------------------------------------------"  

cd $source_dir/services/dtc
npm install
npm run build
npm run zip
cp dist/vhr-dtc-service.zip $build_dist_dir/vhr-dtc-service.zip

echo "------------------------------------------------------------------------------"  
echo "[Rebuild] Services - notification"  
echo "------------------------------------------------------------------------------"  

cd $source_dir/services/notification
npm install
npm run build
npm run zip
cp dist/vhr-notification-service.zip $build_dist_dir/vhr-notification-service.zip

echo "------------------------------------------------------------------------------"  
echo "[Rebuild] Services - vehicle"  
echo "------------------------------------------------------------------------------"  

cd $source_dir/services/vehicle
npm install
npm run build
npm run zip
cp dist/vhr-vehicle-service.zip $build_dist_dir/vhr-vehicle-service.zip

echo "------------------------------------------------------------------------------"  
echo "[Rebuild] Services - jitr"  
echo "------------------------------------------------------------------------------"  

cd $source_dir/services/jitr
npm install
npm run build
npm run zip
cp dist/vhr-vehicle-jitr.zip $build_dist_dir/vhr-vehicle-jitr.zip

echo "------------------------------------------------------------------------------"  
echo "[Rebuild] Resources - helper"  
echo "------------------------------------------------------------------------------"  

cd $source_dir/resources/helper
npm install
npm run build
npm run zip
cp dist/cv-deployment-helper.zip $build_dist_dir/cv-deployment-helper.zip
