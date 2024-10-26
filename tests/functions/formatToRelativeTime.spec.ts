import { formatToRelativeTime } from "../../src/server/core/format-number";

describe("formatToRelativeTime should ", function () {
  // 0 seconds
  it("return correct information for x = 0 and precision = 1", function () {
    const result = formatToRelativeTime(0, 1, false);
    result.should.equal("0 milliseconds");
  });

  // 1 millisecond
  it("return correct information for x = 1 and precision = 1", function () {
    const result = formatToRelativeTime(1, 1, false);
    result.should.equal("1 millisecond");
  });

  // 30 milliseconds
  it("return correct information for x = 30 and precision = 1", function () {
    const result = formatToRelativeTime(30, 1, false);
    result.should.equal("30 milliseconds");
  });

  // 1 second
  it("return correct information for x = 1000 and precision = 1", function () {
    const result = formatToRelativeTime(1000, 1, false);
    result.should.equal("1 second");
  });

  // 1.001 seconds
  it("return correct information for x = 1001 and precision = 1", function () {
    const result = formatToRelativeTime(1001, 1, false);
    result.should.equal("1 second");
  });

  // 1 minute
  it("return correct information for x = 60000 and precision = 1", function () {
    const result = formatToRelativeTime(60000, 1, false);
    result.should.equal("1 minute");
  });

  // 1 minute, 1 second
  it("return correct information for x = 60001 and precision = 1", function () {
    const result = formatToRelativeTime(60001, 1, false);
    result.should.equal("1 minute");
  });

  // 1 minute
  it("return correct information for x = 120000 and precision = 1", function () {
    const result = formatToRelativeTime(120000, 1, false);
    result.should.equal("2 minutes");
  });

  // 1 hour
  it("return correct information for x = 60*60*1000 and precision = 1", function () {
    const result = formatToRelativeTime(60 * 60 * 1000, 1, false);
    result.should.equal("1 hour");
  });

  // 1 hour, 1 millisecond
  it("return correct information for x = 60*60*1000+1 and precision = 1", function () {
    const result = formatToRelativeTime(60 * 60 * 1000 + 1, 1, false);
    result.should.equal("1 hour");
  });

  // 2 hours
  it("return correct information for x = 2*60*60*1000 and precision = 1", function () {
    const result = formatToRelativeTime(2 * 60 * 60 * 1000, 1, false);
    result.should.equal("2 hours");
  });

  // 1 day
  it("return correct information for x = 24*60*60*1000 and precision = 1", function () {
    const result = formatToRelativeTime(24 * 60 * 60 * 1000, 1, false);
    result.should.equal("1 day");
  });

  // 1 day, 1 millisecond
  it("return correct information for x = 24*60*60*1000+1 and precision = 1", function () {
    const result = formatToRelativeTime(24 * 60 * 60 * 1000 + 1, 1, false);
    result.should.equal("1 day");
  });

  // 2 days
  it("return correct information for x = 2*24*60*60*1000 and precision = 1", function () {
    const result = formatToRelativeTime(2 * 24 * 60 * 60 * 1000, 1, false);
    result.should.equal("2 days");
  });

  // just here so commas can be tested
  // 1,001 days
  it("return correct information for x = 1001*24*60*60*1000 and precision = 1", function () {
    const result = formatToRelativeTime(1001 * 24 * 60 * 60 * 1000, 1, false);
    result.should.equal("1,001 days");
  });

  // just here so years can be tested
  // 1,001 days = 2 years 270 days
  it("return correct information for x = 1001*24*60*60*1000 and precision = 2", function () {
    const result = formatToRelativeTime(1001 * 24 * 60 * 60 * 1000, 2, true);
    result.should.equal("2 years 270 days");
  });
});
