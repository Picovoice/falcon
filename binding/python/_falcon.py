import os
import pathlib
from collections import namedtuple
from ctypes import *
from enum import Enum
from typing import *


class FalconError(Exception):
    def __init__(self, message: str = "", message_stack: Sequence[str] = None):
        super().__init__(message)

        self._message = message
        self._message_stack = list() if message_stack is None else message_stack

    def __str__(self):
        message = self._message
        if len(self._message_stack) > 0:
            message += ":"
            for i in range(len(self._message_stack)):
                message += "\n  [%d] %s" % (i, self._message_stack[i])
        return message

    @property
    def message(self) -> str:
        return self._message

    @property
    def message_stack(self) -> Sequence[str]:
        return self._message_stack


class FalconMemoryError(FalconError):
    pass


class FalconIOError(FalconError):
    pass


class FalconInvalidArgumentError(FalconError):
    pass


class FalconStopIterationError(FalconError):
    pass


class FalconKeyError(FalconError):
    pass


class FalconInvalidStateError(FalconError):
    pass


class FalconRuntimeError(FalconError):
    pass


class FalconActivationError(FalconError):
    pass


class FalconActivationLimitError(FalconError):
    pass


class FalconActivationThrottledError(FalconError):
    pass


class FalconActivationRefusedError(FalconError):
    pass


class Falcon(object):
    """
    Python binding for Falcon Speaker Diarization engine.
    """

    class PicovoiceStatuses(Enum):
        SUCCESS = 0
        OUT_OF_MEMORY = 1
        IO_ERROR = 2
        INVALID_ARGUMENT = 3
        STOP_ITERATION = 4
        KEY_ERROR = 5
        INVALID_STATE = 6
        RUNTIME_ERROR = 7
        ACTIVATION_ERROR = 8
        ACTIVATION_LIMIT_REACHED = 9
        ACTIVATION_THROTTLED = 10
        ACTIVATION_REFUSED = 11

    _PICOVOICE_STATUS_TO_EXCEPTION = {
        PicovoiceStatuses.OUT_OF_MEMORY: FalconMemoryError,
        PicovoiceStatuses.IO_ERROR: FalconIOError,
        PicovoiceStatuses.INVALID_ARGUMENT: FalconInvalidArgumentError,
        PicovoiceStatuses.STOP_ITERATION: FalconStopIterationError,
        PicovoiceStatuses.KEY_ERROR: FalconKeyError,
        PicovoiceStatuses.INVALID_STATE: FalconInvalidStateError,
        PicovoiceStatuses.RUNTIME_ERROR: FalconRuntimeError,
        PicovoiceStatuses.ACTIVATION_ERROR: FalconActivationError,
        PicovoiceStatuses.ACTIVATION_LIMIT_REACHED: FalconActivationLimitError,
        PicovoiceStatuses.ACTIVATION_THROTTLED: FalconActivationThrottledError,
        PicovoiceStatuses.ACTIVATION_REFUSED: FalconActivationRefusedError,
    }

    _VALID_EXTENSIONS = (
        "3gp",
        "flac",
        "m4a",
        "mp3",
        "mp4",
        "ogg",
        "opus",
        "vorbis",
        "wav",
        "webm",
    )

    class CFalcon(Structure):
        pass

    class CSegment(Structure):
        """
        Represents a segment with its start, end, and associated speaker tag.
        """
        _fields_ = [("start_sec", c_float), ("end_sec", c_float), ("speaker_tag", c_int32)]

    def __init__(self, access_key: str, model_path: str, library_path: str) -> None:
        """
        Constructor.

        :param access_key: AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)
        :param model_path: Absolute path to the file containing model parameters.
        :param library_path: Absolute path to Falcon's dynamic library.
        """

        if not isinstance(access_key, str) or len(access_key) == 0:
            raise FalconInvalidArgumentError("`access_key` should be a non-empty string.")

        if not os.path.exists(model_path):
            raise FalconIOError("Could not find model file at `%s`." % model_path)

        if not os.path.exists(library_path):
            raise FalconIOError("Could not find Falcon's dynamic library at `%s`." % library_path)

        library = cdll.LoadLibrary(library_path)

        set_sdk_func = library.pv_set_sdk
        set_sdk_func.argtypes = [c_char_p]
        set_sdk_func.restype = None

        set_sdk_func("python".encode("utf-8"))

        self._get_error_stack_func = library.pv_get_error_stack
        self._get_error_stack_func.argtypes = [POINTER(POINTER(c_char_p)), POINTER(c_int)]
        self._get_error_stack_func.restype = self.PicovoiceStatuses

        self._free_error_stack_func = library.pv_free_error_stack
        self._free_error_stack_func.argtypes = [POINTER(c_char_p)]
        self._free_error_stack_func.restype = None

        init_func = library.pv_falcon_init
        init_func.argtypes = [c_char_p, c_char_p, POINTER(POINTER(self.CFalcon))]
        init_func.restype = self.PicovoiceStatuses

        self._handle = POINTER(self.CFalcon)()

        status = init_func(access_key.encode(), model_path.encode(), byref(self._handle))
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status](
                message="Initialization failed", message_stack=self._get_error_stack()
            )

        self._delete_func = library.pv_falcon_delete
        self._delete_func.argtypes = [POINTER(self.CFalcon)]
        self._delete_func.restype = None

        self._process_func = library.pv_falcon_process
        self._process_func.argtypes = [
            POINTER(self.CFalcon),
            POINTER(c_short),
            c_int32,
            POINTER(c_int32),
            POINTER(POINTER(self.CSegment)),
        ]
        self._process_func.restype = self.PicovoiceStatuses

        self._process_file_func = library.pv_falcon_process_file
        self._process_file_func.argtypes = [
            POINTER(self.CFalcon),
            c_char_p,
            POINTER(c_int32),
            POINTER(POINTER(self.CSegment)),
        ]
        self._process_file_func.restype = self.PicovoiceStatuses

        version_func = library.pv_falcon_version
        version_func.argtypes = []
        version_func.restype = c_char_p
        self._version = version_func().decode("utf-8")

        self._sample_rate = library.pv_sample_rate()

        self._segments_delete_func = library.pv_falcon_segments_delete
        self._segments_delete_func.argtypes = [POINTER(self.CSegment)]
        self._segments_delete_func.restype = None

    Segment = namedtuple("Segment", ["start_sec", "end_sec", "speaker_tag"])
    """
    Represents a segment with its start, end, and associated speaker tag.
    The speaker tag is a non-negative integer that uniquely identifies a speaker.
    """

    def process(self, pcm: Sequence[int]) -> Sequence[Segment]:
        """
        Processes the given audio data and returns the diarization output.

        :param pcm: Audio data. The audio needs to have a sample rate equal to `.sample_rate` and be 16-bit
        linearly-encoded. This function operates on single-channel audio. If you wish to process data in a different
        sample rate or format consider using `.process_file`.
        :return: Diarization output as a sequence of segments. Each segment is a tuple of
                (start_sec, end_sec, speaker_tag).
        """

        if len(pcm) == 0:
            raise FalconInvalidArgumentError()

        num_segments = c_int32()
        c_segments = POINTER(self.CSegment)()
        status = self._process_func(
            self._handle, (c_short * len(pcm))(*pcm), len(pcm), byref(num_segments), byref(c_segments)
        )
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status](
                message="Initialization failed", message_stack=self._get_error_stack()
            )

        segments = list()
        for i in range(num_segments.value):
            segment = self.Segment(
                start_sec=c_segments[i].start_sec, end_sec=c_segments[i].end_sec, speaker_tag=c_segments[i].speaker_tag
            )
            segments.append(segment)

        self._segments_delete_func(c_segments)

        return segments

    def process_file(self, audio_path: str) -> Sequence[Segment]:
        """
        Processes the given audio file and returns the diarization output.

        :param audio_path: Absolute path to the audio file. The file needs to have a sample rate equal to or greater
        than `.sample_rate`. The supported formats are: `FLAC`, `MP3`, `Ogg`, `Opus`, `Vorbis`, `WAV`, and `WebM`.
        :return: Diarization output as a sequence of segments. Each segment is a tuple of
                (start_sec, end_sec, speaker_tag).
        """

        if not os.path.exists(audio_path):
            raise FalconIOError("Could not find the audio file at `%s`" % audio_path)

        num_segments = c_int32()
        c_segments = POINTER(self.CSegment)()
        status = self._process_file_func(self._handle, audio_path.encode(), byref(num_segments), byref(c_segments))
        if status is not self.PicovoiceStatuses.SUCCESS:
            if status is self.PicovoiceStatuses.INVALID_ARGUMENT:
                if not audio_path.lower().endswith(self._VALID_EXTENSIONS):
                    raise self._PICOVOICE_STATUS_TO_EXCEPTION[status](
                        "Specified file with extension '%s' is not supported" % pathlib.Path(audio_path).suffix
                    )
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status]()

        segments = list()
        for i in range(num_segments.value):
            segment = self.Segment(
                start_sec=c_segments[i].start_sec, end_sec=c_segments[i].end_sec, speaker_tag=c_segments[i].speaker_tag
            )
            segments.append(segment)

        self._segments_delete_func(c_segments)

        return segments

    def delete(self) -> None:
        """Releases resources acquired by Falcon."""

        self._delete_func(self._handle)

    @property
    def version(self) -> str:
        """Version."""

        return self._version

    @property
    def sample_rate(self) -> int:
        """Audio sample rate accepted by `.process`."""

        return self._sample_rate

    def _get_error_stack(self) -> Sequence[str]:
        message_stack_ref = POINTER(c_char_p)()
        message_stack_depth = c_int()
        status = self._get_error_stack_func(byref(message_stack_ref), byref(message_stack_depth))
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status](message="Unable to get Falcon error state")

        message_stack = list()
        for i in range(message_stack_depth.value):
            message_stack.append(message_stack_ref[i].decode("utf-8"))

        self._free_error_stack_func(message_stack_ref)

        return message_stack


__all__ = [
    "Falcon",
    "FalconActivationError",
    "FalconActivationLimitError",
    "FalconActivationRefusedError",
    "FalconActivationThrottledError",
    "FalconError",
    "FalconIOError",
    "FalconInvalidArgumentError",
    "FalconInvalidStateError",
    "FalconKeyError",
    "FalconMemoryError",
    "FalconRuntimeError",
    "FalconStopIterationError",
]
