if [ ! -d "./falcon-test-app/src/androidTest/assets/test_resources/audio_samples" ]
then
    echo "Creating test audio samples directory..."
    mkdir -p ./falcon-test-app/src/androidTest/assets/test_resources/audio_samples
fi

echo "Copying test audio samples..."
cp ../../../resources/audio_samples/*.wav ./falcon-test-app/src/androidTest/assets/test_resources/audio_samples

if [ ! -d "./falcon-test-app/src/androidTest/assets/test_resources/model_files" ]
then
    echo "Creating test model files directory..."
    mkdir -p ./falcon-test-app/src/androidTest/assets/test_resources/model_files
fi

echo "Copying falcon model files ..."
cp ../../../lib/common/*.pv ./falcon-test-app/src/androidTest/assets/test_resources/model_files

echo "Copying test data file..."
cp ../../../resources/.test/test_data.json ./falcon-test-app/src/androidTest/assets/test_resources
