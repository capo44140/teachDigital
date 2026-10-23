/**
 * Exécute une chaîne de middlewares Express (validate(schema), handler...) sur une
 * requête simulée, comme le ferait le routeur : s'arrête dès qu'un maillon répond.
 */
async function runChain(handlers, req, res) {
  for (const handler of handlers) {
    let nextCalled = false;
    let nextError;
    await handler(req, res, (error) => {
      nextCalled = true;
      nextError = error;
    });
    if (nextError) throw nextError;
    if (!nextCalled) return res;
  }
  return res;
}

module.exports = { runChain };
