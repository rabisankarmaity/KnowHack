class ApiResponse {
  constructor(res) { this.res = res; }
  ok(data = {}, message = 'OK', pagination) {
    return this.res.status(200).json({ success: true, message, data, ...(pagination ? { pagination } : {}) });
  }
  created(data = {}, message = 'Created') {
    return this.res.status(201).json({ success: true, message, data });
  }
  noContent() { return this.res.status(204).send(); }
}
module.exports = { ApiResponse };
