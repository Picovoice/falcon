/*
    Copyright 2019-2025 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of
   the license is located in the "LICENSE" file accompanying this source.

    Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
   WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
   License for the specific language governing permissions and limitations under
   the License.
*/

#if !(defined(_WIN32) || defined(_WIN64))

#include <dlfcn.h>

#endif

#include <getopt.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/time.h>

#if defined(_WIN32) || defined(_WIN64)

#include <windows.h>

#endif

#include "pv_falcon.h"

static void *open_dl(const char *dl_path) {

#if defined(_WIN32) || defined(_WIN64)

    return LoadLibrary(dl_path);

#else

    return dlopen(dl_path, RTLD_NOW);

#endif
}

static void *load_symbol(void *handle, const char *symbol) {

#if defined(_WIN32) || defined(_WIN64)

    return GetProcAddress((HMODULE) handle, symbol);

#else

    return dlsym(handle, symbol);

#endif
}

static void close_dl(void *handle) {

#if defined(_WIN32) || defined(_WIN64)

    FreeLibrary((HMODULE) handle);

#else

    dlclose(handle);

#endif
}

static void print_dl_error(const char *message) {

#if defined(_WIN32) || defined(_WIN64)

    fprintf(stderr, "%s with code `%lu`.\n", message, GetLastError());

#else

    fprintf(stderr, "%s with `%s`.\n", message, dlerror());

#endif
}

static void print_error_message(char **message_stack, int32_t message_stack_depth) {
    for (int32_t i = 0; i < message_stack_depth; i++) {
        fprintf(stderr, "\n  [%d] %s", i, message_stack[i]);
    }
}

int picovoice_main(int argc, char **argv) {
    const char *access_key = NULL;
    const char *model_path = NULL;
    const char *library_path = NULL;
    const char *device = NULL;

    int opt;
    while ((opt = getopt(argc, argv, "a:m:l:y:")) != -1) {
        switch (opt) {
            case 'a':
                access_key = optarg;
                break;
            case 'm':
                model_path = optarg;
                break;
            case 'l':
                library_path = optarg;
                break;
            case 'y':
                device = optarg;
                break;
            default:
                break;
        }
    }

    if (!(access_key && library_path && model_path && (optind < argc))) {
        fprintf(stderr, "usage: -a ACCESS_KEY -m MODEL_PATH -l LIBRARY_PATH [-y DEVICE] audio_path0 audio_path1 ...\n");
        exit(1);
    }

    if (device == NULL) {
        device = "cpu:1";
    }

    void *dl_handle = open_dl(library_path);
    if (!dl_handle) {
        fprintf(stderr, "failed to load library at `%s`.\n", library_path);

#if defined(_WIN32) || defined(_WIN64)

        DWORD errorCode = GetLastError();

        LPVOID msgBuffer;
        FormatMessage(
            FORMAT_MESSAGE_ALLOCATE_BUFFER | FORMAT_MESSAGE_FROM_SYSTEM | FORMAT_MESSAGE_IGNORE_INSERTS,
            NULL,
            errorCode,
            MAKELANGID(LANG_NEUTRAL, SUBLANG_DEFAULT),
            (LPTSTR)&msgBuffer,
            0,
            NULL
        );

        printf("LoadLibrary failed with error %lu: %s\n", errorCode, (char*)msgBuffer);

        LocalFree(msgBuffer);

#endif

        exit(1);
    }

    const char *(*pv_status_to_string_func)(pv_status_t) =
            load_symbol(dl_handle, "pv_status_to_string");
    if (!pv_status_to_string_func) {
        print_dl_error("failed to load `pv_status_to_string`");
        exit(1);
    }

    const int32_t (*pv_sample_rate_func)() =
            load_symbol(dl_handle, "pv_sample_rate");
    if (!pv_sample_rate_func) {
        print_dl_error("failed to load `pv_sample_rate`");
        exit(1);
    }

    const char *(*pv_falcon_version_func)() = load_symbol(dl_handle, "pv_falcon_version");

    pv_status_t (*pv_falcon_init_func)(const char *, const char *, const char *, pv_falcon_t **) =
            load_symbol(dl_handle, "pv_falcon_init");
    if (!pv_falcon_init_func) {
        print_dl_error("failed to load `pv_falcon_init`");
        exit(1);
    }

    void (*pv_falcon_delete_func)(pv_falcon_t *) =
            load_symbol(dl_handle, "pv_falcon_delete");
    if (!pv_falcon_delete_func) {
        print_dl_error("failed to load `pv_falcon_delete`");
        exit(1);
    }

    pv_status_t (*pv_falcon_process_file_func)(
            pv_falcon_t *,
            const char *,
            int32_t *,
            pv_segment_t **) =
            load_symbol(dl_handle, "pv_falcon_process_file");
    if (!pv_falcon_process_file_func) {
        print_dl_error("failed to load `pv_falcon_process_file`");
        exit(1);
    }

    pv_status_t (*pv_falcon_segments_delete_func)(pv_segment_t *) =
            load_symbol(dl_handle, "pv_falcon_segments_delete");
    if (!pv_falcon_segments_delete_func) {
        print_dl_error("failed to load `pv_falcon_segments_delete`");
        exit(1);
    }

    pv_status_t (*pv_get_error_stack_func)(char ***, int32_t *) = load_symbol(dl_handle, "pv_get_error_stack");
    if (!pv_get_error_stack_func) {
        print_dl_error("failed to load 'pv_get_error_stack_func'");
        exit(1);
    }

    void (*pv_free_error_stack_func)(char **) = load_symbol(dl_handle, "pv_free_error_stack");
    if (!pv_free_error_stack_func) {
        print_dl_error("failed to load 'pv_free_error_stack_func'");
        exit(1);
    }

    char **message_stack = NULL;
    int32_t message_stack_depth = 0;
    pv_status_t error_status = PV_STATUS_RUNTIME_ERROR;

    fprintf(stdout, "Falcon %s\n", pv_falcon_version_func());

    struct timeval before;
    gettimeofday(&before, NULL);

    pv_falcon_t *falcon = NULL;
    pv_status_t status = pv_falcon_init_func(
            access_key,
            model_path,
            device,
            &falcon);
    if (status != PV_STATUS_SUCCESS) {
        fprintf(stderr, "failed to init with `%s`.\n", pv_status_to_string_func(status));
        error_status = pv_get_error_stack_func(&message_stack, &message_stack_depth);

        if (error_status != PV_STATUS_SUCCESS) {
            fprintf(stderr, ".\nUnable to get Falcon error state with '%s'\n", pv_status_to_string_func(error_status));
            exit(1);
        }

        if (message_stack_depth > 0) {
            fprintf(stderr, ":\n");
            print_error_message(message_stack, message_stack_depth);
        }

        pv_free_error_stack_func(message_stack);
        exit(1);
    }

    struct timeval after;
    gettimeofday(&after, NULL);

    double init_sec = ((double) (after.tv_sec - before.tv_sec) +
                       ((double) (after.tv_usec - before.tv_usec)) * 1e-6);
    fprintf(stdout, "init took %.1f sec\n", init_sec);

    double proc_sec = 0.;

    for (int32_t i = optind; i < argc; i++) {
        gettimeofday(&before, NULL);

        int32_t num_segments = 0;
        pv_segment_t *segments = NULL;
        status = pv_falcon_process_file_func(falcon, argv[i], &num_segments, &segments);
        if (status != PV_STATUS_SUCCESS) {
            fprintf(stderr, "'pv_falcon_process' failed with '%s'", pv_status_to_string_func(status));
            error_status = pv_get_error_stack_func(&message_stack, &message_stack_depth);

            if (error_status != PV_STATUS_SUCCESS) {
                fprintf(stderr, ".\nUnable to get Falcon error state with '%s'\n", pv_status_to_string_func(error_status));
                exit(1);
            }

            if (message_stack_depth > 0) {
                fprintf(stderr, ":\n");
                print_error_message(message_stack, message_stack_depth);
            }

            pv_free_error_stack_func(message_stack);
            exit(1);
        }

        gettimeofday(&after, NULL);

        proc_sec += ((double) (after.tv_sec - before.tv_sec) +
                     ((double) (after.tv_usec - before.tv_usec)) * 1e-6);

        for (int32_t j = 0; j < num_segments; j++) {
            pv_segment_t *segment = &segments[j];
            fprintf(stdout,
                    "Speaker: %d -> Start: %5.2f, End: %5.2f\n",
                    segment->speaker_tag,
                    segment->start_sec,
                    segment->end_sec);
        }
        pv_falcon_segments_delete_func(segments);
    }

    fprintf(stdout, "proc took %.2f sec\n", proc_sec);

    close_dl(dl_handle);

    return 0;
}

int main(int argc, char *argv[]) {

#if defined(_WIN32) || defined(_WIN64)

#define UTF8_COMPOSITION_FLAG (0)
#define NULL_TERMINATED       (-1)

    LPWSTR *wargv = CommandLineToArgvW(GetCommandLineW(), &argc);
    if (wargv == NULL) {
        fprintf(stderr, "CommandLineToArgvW failed\n");
        exit(1);
    }

    char *utf8_argv[argc];

    for (int i = 0; i < argc; ++i) {
        // WideCharToMultiByte:
        // https://docs.microsoft.com/en-us/windows/win32/api/stringapiset/nf-stringapiset-widechartomultibyte
        int arg_chars_num =
                WideCharToMultiByte(CP_UTF8, UTF8_COMPOSITION_FLAG, wargv[i], NULL_TERMINATED, NULL, 0, NULL, NULL);
        utf8_argv[i] = (char *) malloc(arg_chars_num * sizeof(char));
        if (!utf8_argv[i]) {
            fprintf(stderr, "failed to to allocate memory for converting args");
        }
        WideCharToMultiByte(CP_UTF8, UTF8_COMPOSITION_FLAG, wargv[i], NULL_TERMINATED, utf8_argv[i], arg_chars_num, NULL, NULL);
    }

    LocalFree(wargv);
    argv = utf8_argv;

#endif

    int result = picovoice_main(argc, argv);

#if defined(_WIN32) || defined(_WIN64)

    for (int i = 0; i < argc; ++i) {
        free(utf8_argv[i]);
    }

#endif

    return result;
}
