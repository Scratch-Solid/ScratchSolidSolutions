import { geocodeAddress } from './geocoding';

describe('geocodeAddress', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('returns coordinates for a successful lookup', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([{ lat: '-33.8986', lon: '18.6319' }]),
      })
    ) as any;

    const result = await geocodeAddress('1 Main Rd, Bellville');
    expect(result).toEqual({ lat: -33.8986, long: 18.6319 });
  });

  test('returns null when no results are found', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    ) as any;

    const result = await geocodeAddress('a made up place that does not exist');
    expect(result).toBeNull();
  });

  test('returns null on a failed request rather than throwing', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false })) as any;

    const result = await geocodeAddress('1 Main Rd, Bellville');
    expect(result).toBeNull();
  });

  test('returns null for an empty address', async () => {
    const result = await geocodeAddress('');
    expect(result).toBeNull();
  });
});
