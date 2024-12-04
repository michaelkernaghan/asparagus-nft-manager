// Add global fetch mock if it doesn't exist
if (!global.fetch) {
    global.fetch = jest.fn();
  }