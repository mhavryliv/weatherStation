const addHandler = require('../service/add');
const badData = require('./badData.json');
const goodData = require('./goodData.json');

test('Data validation', () => {
  expect(addHandler.isValidData(badData)).toBe(false);
  expect(addHandler.isValidData(goodData)).toBe(true);
})
