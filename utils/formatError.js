// 將錯誤物件轉換為乾淨字串，避免訊息過長或含不可序列化內容。
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