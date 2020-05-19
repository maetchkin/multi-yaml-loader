const loader = require('..');

test('check test', () => {
    loader( './example.yaml' );
    expect(true).toBe(true);
});