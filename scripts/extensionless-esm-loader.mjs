export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    const relative = specifier.startsWith('./') || specifier.startsWith('../');
    const alreadyHasExtension = /\.[a-z0-9]+$/i.test(specifier);

    if (relative && !alreadyHasExtension) {
      return nextResolve(`${specifier}.js`, context);
    }

    throw error;
  }
}
