import { Falcon, FalconWorker } from '../';
import testData from './test_data.json';

// @ts-ignore
import falconParams from './falcon_params';
import { PvModel } from '@picovoice/web-utils';
import { FalconSegment } from '../src';
import { FalconError } from '../src/falcon_errors';

const ACCESS_KEY = Cypress.env('ACCESS_KEY');
const DEVICE = Cypress.env('DEVICE');

const getDeviceList = () => {
  const result: string[] = [];
  if (DEVICE === 'cpu') {
    const maxThreads = self.navigator.hardwareConcurrency / 2;

    for (let i = 1; i <= maxThreads; i *= 2) {
      result.push(`cpu:${i}`);
    }
  } else {
    result.push(DEVICE);
  }

  return result;
};

const validateMetadata = (
  segments: FalconSegment[],
  expectedSegments: FalconSegment[]
) => {
  expect(segments.length).to.be.eq(expectedSegments.length);
  for (let i = 0; i < segments.length; i += 1) {
    expect(segments[i].startSec).to.be.closeTo(
      expectedSegments[i].startSec,
      0.1
    );
    expect(segments[i].endSec).to.be.closeTo(expectedSegments[i].endSec, 0.1);
    expect(segments[i].speakerTag).to.be.eq(expectedSegments[i].speakerTag);
  }
};

const runInitTest = async (
  instance: typeof Falcon | typeof FalconWorker,
  params: {
    accessKey?: string;
    model?: PvModel;
    device?: string;
    expectFailure?: boolean;
  } = {}
) => {
  const {
    accessKey = ACCESS_KEY,
    model = { publicPath: '/test/falcon_params.pv', forceWrite: true },
    device = undefined,
    expectFailure = false,
  } = params;

  let isFailed = false;

  try {
    const falcon = await instance.create(accessKey, model, device);
    expect(falcon.sampleRate).to.be.eq(16000);
    expect(typeof falcon.version).to.eq('string');
    expect(falcon.version.length).to.be.greaterThan(0);

    if (falcon instanceof FalconWorker) {
      falcon.terminate();
    } else {
      await falcon.release();
    }
  } catch (e) {
    if (expectFailure) {
      isFailed = true;
    } else {
      expect(e).to.be.undefined;
    }
  }

  if (expectFailure) {
    expect(isFailed).to.be.true;
  }
};

const runProcTest = async (
  instance: typeof Falcon | typeof FalconWorker,
  inputPcm: Int16Array,
  expectedSegments: FalconSegment[],
  params: {
    accessKey?: string;
    model?: PvModel;
    device?: string;
  } = {}
) => {
  const {
    accessKey = ACCESS_KEY,
    model = { publicPath: '/test/falcon_params.pv', forceWrite: true },
    device = undefined,
  } = params;

  try {
    const falcon = await instance.create(accessKey, model, device);

    const { segments } = await falcon.process(inputPcm);

    validateMetadata(segments, expectedSegments);

    if (falcon instanceof FalconWorker) {
      falcon.terminate();
    } else {
      await falcon.release();
    }
  } catch (e) {
    expect(e).to.be.undefined;
  }
};

describe('Falcon Binding', function () {
  it(`should return process error message stack`, async () => {
    let error: FalconError | null = null;

    const falcon = await Falcon.create(ACCESS_KEY, {
      publicPath: '/test/falcon_params.pv',
      forceWrite: true,
    });
    const testPcm = new Int16Array(512);
    // @ts-ignore
    const objectAddress = falcon._objectAddress;

    // @ts-ignore
    falcon._objectAddress = 0;

    try {
      await falcon.process(testPcm);
    } catch (e) {
      error = e as FalconError;
    }

    // @ts-ignore
    falcon._objectAddress = objectAddress;
    await falcon.release();

    expect(error).to.not.be.null;
    if (error) {
      expect((error as FalconError).messageStack.length).to.be.gt(0);
      expect((error as FalconError).messageStack.length).to.be.lte(8);
    }
  });

  for (const instance of [Falcon, FalconWorker]) {
    const instanceString = instance === FalconWorker ? 'worker' : 'main';

    it(`should return correct error message stack (${instanceString})`, async () => {
      let messageStack = [];
      try {
        const falcon = await instance.create('invalidAccessKey', {
          publicPath: '/test/falcon_params.pv',
          forceWrite: true,
        });
        expect(falcon).to.be.undefined;
      } catch (e: any) {
        messageStack = e.messageStack;
      }

      expect(messageStack.length).to.be.gt(0);
      expect(messageStack.length).to.be.lte(8);

      try {
        const falcon = await instance.create('invalidAccessKey', {
          publicPath: '/test/falcon_params.pv',
          forceWrite: true,
        });
        expect(falcon).to.be.undefined;
      } catch (e: any) {
        expect(messageStack.length).to.be.eq(e.messageStack.length);
      }
    });

    it(`should be able to init with public path (${instanceString})`, () => {
      cy.wrap(null).then(async () => {
        await runInitTest(instance);
      });
    });

    it(`should be able to init with base64 (${instanceString})`, () => {
      cy.wrap(null).then(async () => {
        await runInitTest(instance, {
          model: { base64: falconParams, forceWrite: true },
        });
      });
    });

    it(`should be able to handle UTF-8 public path (${instanceString})`, () => {
      cy.wrap(null).then(async () => {
        await runInitTest(instance, {
          model: {
            publicPath: '/test/falcon_params.pv',
            forceWrite: true,
            customWritePath: '테스트',
          },
        });
      });
    });

    it(`should be able to handle invalid public path (${instanceString})`, () => {
      cy.wrap(null).then(async () => {
        await runInitTest(instance, {
          model: { publicPath: 'invalid', forceWrite: true },
          expectFailure: true,
        });
      });
    });

    it(`should be able to handle invalid base64 (${instanceString})`, () => {
      cy.wrap(null).then(async () => {
        await runInitTest(instance, {
          model: { base64: 'invalid', forceWrite: true },
          expectFailure: true,
        });
      });
    });

    it(`should be able to handle invalid device (${instanceString})`, () => {
      cy.wrap(null).then(async () => {
        await runInitTest(instance, {
          device: 'invalid',
          expectFailure: true,
        });
      });
    });

    it(`should be able to handle invalid access key (${instanceString})`, () => {
      cy.wrap(null).then(async () => {
        await runInitTest(instance, {
          accessKey: 'invalid',
          expectFailure: true,
        });
      });
    });

    for (const device of getDeviceList()) {
      for (const testParam of testData.tests.diarization_tests) {
        it(`should be able to process (${instanceString}) (${device})`, () => {
          try {
            cy.getFramesFromFile(`audio_samples/${testParam.audio_file}`).then(
              async pcm => {
                await runProcTest(
                  instance,
                  pcm,
                  testParam.segments.map((s: any) => ({
                    startSec: s.start_sec,
                    endSec: s.end_sec,
                    speakerTag: s.speaker_tag,
                  })),
                  { device: device }
                );
              }
            );
          } catch (e) {
            expect(e).to.be.undefined;
          }
        });
      }
    }

    it(`should be able to transfer buffer`, () => {
      try {
        cy.getFramesFromFile(`audio_samples/test.wav`).then(async pcm => {
          const falcon = await FalconWorker.create(ACCESS_KEY, {
            publicPath: '/test/falcon_params.pv',
            forceWrite: true,
          });

          let copy = new Int16Array(pcm.length);
          copy.set(pcm);
          await falcon.process(copy, {
            transfer: true,
            transferCallback: data => {
              copy = data;
            },
          });
          falcon.terminate();

          expect(copy).to.deep.eq(pcm);
        });
      } catch (e) {
        expect(e).to.be.undefined;
      }
    });
  }
});
