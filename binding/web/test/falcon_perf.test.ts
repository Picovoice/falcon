import { Falcon, FalconWorker } from '../';

// const ACCESS_KEY = Cypress.env('ACCESS_KEY');
// const NUM_TEST_ITERATIONS = Number(Cypress.env('NUM_TEST_ITERATIONS'));
// const INIT_PERFORMANCE_THRESHOLD_SEC = Number(
//   Cypress.env('INIT_PERFORMANCE_THRESHOLD_SEC')
// );
// const PROC_PERFORMANCE_THRESHOLD_SEC = Number(
//   Cypress.env('PROC_PERFORMANCE_THRESHOLD_SEC')
// );

const ACCESS_KEY = 'mW3jTf9S6NUBzDHDpN/lNLNE9k8wk2ERjIKPGeX3tM62LzxFbdFtIQ==';
const NUM_TEST_ITERATIONS = 15;
const INIT_PERFORMANCE_THRESHOLD_SEC = 4.5;
const PROC_PERFORMANCE_THRESHOLD_SEC = 0.3;

async function testPerformance(
  instance: typeof Falcon | typeof FalconWorker,
  inputPcm: Int16Array
) {
  const initPerfResults: number[] = [];
  const procPerfResults: number[] = [];

  for (let j = 0; j < NUM_TEST_ITERATIONS; j++) {
    let start = Date.now();

    const falcon = await instance.create(ACCESS_KEY, {
      publicPath: '/test/falcon_params.pv',
      forceWrite: true,
    });

    let end = Date.now();
    initPerfResults.push((end - start) / 1000);

    start = Date.now();
    await falcon.process(inputPcm);
    end = Date.now();
    procPerfResults.push((end - start) / 1000);

    if (falcon instanceof FalconWorker) {
      falcon.terminate();
    } else {
      await falcon.release();
    }
  }

  const initAvgPerf =
    initPerfResults.reduce((a, b) => a + b) / NUM_TEST_ITERATIONS;
  const procAvgPerf =
    procPerfResults.reduce((a, b) => a + b) / NUM_TEST_ITERATIONS;

  // eslint-disable-next-line no-console
  console.log(`Average init performance: ${initAvgPerf} seconds`);
  // eslint-disable-next-line no-console
  console.log(`Average proc performance: ${procAvgPerf} seconds`);

  expect(initAvgPerf).to.be.lessThan(INIT_PERFORMANCE_THRESHOLD_SEC);
  expect(procAvgPerf).to.be.lessThan(PROC_PERFORMANCE_THRESHOLD_SEC);
}

describe('Falcon binding performance test', () => {
  Cypress.config('defaultCommandTimeout', 160000);

  for (const instance of [Falcon, FalconWorker]) {
    const instanceString = instance === FalconWorker ? 'worker' : 'main';

    it(`should be lower than performance threshold (${instanceString})`, () => {
      cy.getFramesFromFile('audio_samples/test.wav').then(async inputPcm => {
        await testPerformance(instance, inputPcm);
      });
    });
  }
});
