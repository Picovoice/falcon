/*
    Copyright 2021-2025 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

#ifndef PV_FALCON_H
#define PV_FALCON_H

#include <stdint.h>

#include "picovoice.h"

#ifdef __cplusplus

extern "C" {

#endif

/**
* Forward Declaration for Falcon Speaker Diarization engine.
*/
typedef struct pv_falcon pv_falcon_t;

/**
 * Constructor.
 *
 * @param access_key AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)
 * @param model_path The absolute path to the file containing Falcon's model parameters.
 * @param device String representation of the device (e.g., CPU or GPU) to use. If set to `best`, the most
 * suitable device is selected automatically. If set to `gpu`, the engine uses the first available GPU device. To select a specific
 * GPU device, set this argument to `gpu:${GPU_INDEX}`, where `${GPU_INDEX}` is the index of the target GPU. If set to
 * `cpu`, the engine will run on the CPU with the default number of threads. To specify the number of threads, set this
 * argument to `cpu:${NUM_THREADS}`, where `${NUM_THREADS}` is the desired number of threads.
 * @param[out] object Constructed instance of Falcon.
 * @return A status code indicating the result of the initialization. Possible values include:
 *         - `PV_STATUS_OUT_OF_MEMORY`: Memory allocation failure.
 *         - `PV_STATUS_IO_ERROR`: Input/output error.
 *         - `PV_STATUS_INVALID_ARGUMENT`: Invalid input argument.
 *         - `PV_STATUS_RUNTIME_ERROR`: Error during runtime.
 *         - `PV_STATUS_ACTIVATION_ERROR`: Activation-related error.
 *         - `PV_STATUS_ACTIVATION_LIMIT_REACHED`: Activation limit reached.
 *         - `PV_STATUS_ACTIVATION_THROTTLED`: Activation throttled.
 *         - `PV_STATUS_ACTIVATION_REFUSED`: Activation refused.
 */
PV_API pv_status_t pv_falcon_init(
        const char *access_key,
        const char *model_path,
        const char *device,
        pv_falcon_t **object);

/**
 * Deallocate resources associated with a Falcon instance.
 *
 * This function releases the resources associated with a Falcon instance that was previously initialized using the
 * `pv_falcon_init()` function. It deallocates memory and performs cleanup tasks, ensuring proper resource management.
 *
 * @param object A pointer to the Falcon object to be deallocated.
 */
PV_API void pv_falcon_delete(pv_falcon_t *object);

/**
 * Represents a segment with its start, end, and associated speaker tag.
 */
typedef struct {
    float start_sec; /** Start time of the segment in seconds. */
    float end_sec; /** End time of the segment in seconds. */
    int32_t speaker_tag; /** Speaker tag identifier - a non-negative integer identifying unique speakers. */
} pv_segment_t;

/**
 * Processes the given audio data and returns the diarization output.
 *
 * This function analyzes the provided audio data, which should be single-channel, 16-bit linearly-encoded,
 * and have a sample rate matching `pv_sample_rate()`. It identifies different segments in the audio, each
 * represented by a `pv_segment_t` structure. The caller is responsible for freeing the segments buffer
 * using appropriate memory management.
 *
 * @param object A pointer to the Falcon object.
 * @param pcm Pointer to the audio data array.
 * @param num_samples Number of audio samples in the data array.
 * @param[out] num_segments Pointer to store the number of segments in the output.
 * @param[out] segments Pointer to an array of `pv_segment_t` structures representing the identified segments.
 *                    The caller is responsible for freeing this buffer.
 * @return Status code indicating the result of the processing. Possible values include:
 *         - `PV_STATUS_OUT_OF_MEMORY`: Memory allocation failure.
 *         - `PV_STATUS_IO_ERROR`: Input/output error.
 *         - `PV_STATUS_INVALID_ARGUMENT`: Invalid input argument.
 *         - `PV_STATUS_RUNTIME_ERROR`: Error during runtime.
 *         - `PV_STATUS_ACTIVATION_ERROR`: Activation-related error.
 *         - `PV_STATUS_ACTIVATION_LIMIT_REACHED`: Activation limit reached.
 *         - `PV_STATUS_ACTIVATION_THROTTLED`: Activation throttled.
 *         - `PV_STATUS_ACTIVATION_REFUSED`: Activation refused.
 */
PV_API pv_status_t pv_falcon_process(
        pv_falcon_t *object,
        const int16_t *pcm,
        int32_t num_samples,
        int32_t *num_segments,
        pv_segment_t **segments);

/**
 * Processes a given audio file and returns the diarization output.
 *
 * @param object A pointer to the Falcon object.
 * @param audio_path Absolute path to the audio file. The file needs to have a sample rate equal to or greater than
 * `pv_sample_rate()`. The supported formats are: `3gp (AMR)`, `FLAC`, `MP3`, `MP4/m4a (AAC)`, `Ogg`, `WAV`, `WebM`.
 * Files with stereo audio are mixed into a single mono channel and then processed.
 * @param[out] num_segments Pointer to store the number of segments in the output.
 * @param[out] segments Pointer to an array of `pv_segment_t` structures representing the identified segments.
 *                    The caller is responsible for freeing this buffer using `pv_falcon_segments_delete()`.
 * @return Status code indicating the result of the processing. Possible values include:
 *         - `PV_STATUS_OUT_OF_MEMORY`: Memory allocation failure.
 *         - `PV_STATUS_IO_ERROR`: Input/output error.
 *         - `PV_STATUS_INVALID_ARGUMENT`: Invalid input argument.
 *         - `PV_STATUS_RUNTIME_ERROR`: Error during runtime.
 *         - `PV_STATUS_ACTIVATION_ERROR`: Activation-related error.
 *         - `PV_STATUS_ACTIVATION_LIMIT_REACHED`: Activation limit reached.
 *         - `PV_STATUS_ACTIVATION_THROTTLED`: Activation throttled.
 *         - `PV_STATUS_ACTIVATION_REFUSED`: Activation refused.
 */
PV_API pv_status_t pv_falcon_process_file(
        pv_falcon_t *object,
        const char *audio_path,
        int32_t *num_segments,
        pv_segment_t **segments);

/**
 * Deletes segments allocated by `pv_falcon_process()`.
 *
 * Use this function to properly release memory allocated for segments returned by the
 * `pv_falcon_process()` functions.
 *
 * @param segments Pointer to the array of segments to be deleted.
 */
PV_API void pv_falcon_segments_delete(pv_segment_t *segments);

/**
 * Get the version of the Falcon library.
 *
 * @return A pointer to a string containing the version information.
 */
PV_API const char *pv_falcon_version(void);

#ifdef __cplusplus

}

#endif

#endif // PV_FALCON_H
