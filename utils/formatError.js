function formatError(err) {
  if (!err) return '未知錯誤';
  return {
    name: err.name || 'Error',
    message: err.message || String(err),
    stack: err.stack || '沒有 stack',
    ...(err.code ? { code: err.code } : {}),
    ...(err.method ? { method: err.method } : {}),
    ...(err.path ? { path: err.path } : {})
  };
}

module.exports = formatError;
