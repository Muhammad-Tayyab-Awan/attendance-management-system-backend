function validateFilterQueries(queries, allowedQueries) {
  const keys = Object.keys(queries);
  if (keys.length < 0 || keys.length > 6) {
    return false;
  }
  for (const key of keys) {
    if (!allowedQueries.includes(key)) {
      return false;
    }
  }

  return true;
}

export default validateFilterQueries;
