const addHandler = require('../service/add');
const badData = require('./badData.json');
const goodData = require('./goodData.json');

test('Data validation', () => {
  expect(addHandler.isValidData(badData.wrong_info)).toBe(false);
  expect(addHandler.isValidData(goodData)).toBe(true);
})

test('Key and data checking', () => {
  expect(addHandler.containsAllItems(badData.missing_keys)).toHaveProperty("missing_keys");
  expect(addHandler.containsAllItems(badData.missing_data)).toHaveProperty("missing_data");
  expect(addHandler.containsAllItems(goodData)).toHaveProperty("has_all_data", true);
})
