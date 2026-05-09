global.fetch = jest.fn();

global.Response = class Response {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status || 200;
    this.ok = this.status >= 200 && this.status < 300;
  }

  json() {
    return Promise.resolve(JSON.parse(this.body || "{}"));
  }

  text() {
    return Promise.resolve(this.body || "");
  }
};

global.Headers = class Headers {};
global.Request = class Request {};