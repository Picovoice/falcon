LIB_DIR="../../../lib"
RESOURCE_DIR="../../../resources"
ASSETS_DIR="./FalconAppTestUITests/test_resources"

echo "Creating test resources asset directory"
mkdir -p ${ASSETS_DIR}

echo "Copying test audio samples..."
mkdir -p ${ASSETS_DIR}/audio_samples
cp ${RESOURCE_DIR}/audio_samples/*.wav ${ASSETS_DIR}/audio_samples

echo "Copying test data file..."
cp ${RESOURCE_DIR}/.test/test_data.json ${ASSETS_DIR}
