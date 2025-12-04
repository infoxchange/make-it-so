import {
  setGlobalDispatcher,
  EnvHttpProxyAgent,
  fetch as undiciFetch,
} from "undici";

export function setupProxyGlobally() {
  // See https://nodejs.org/api/globals.html#custom-dispatcher
  // This might stop being needed at some point: https://github.com/actions/create-github-app-token/pull/143#discussion_r1747641337
  const envHttpProxyAgent = new EnvHttpProxyAgent();
  setGlobalDispatcher(envHttpProxyAgent);
}

export function getProxiedFetch() {
  const fetch: typeof undiciFetch = (input, init = {}) => {
    if (init.dispatcher) {
      console.warn(
        "A custom dispatcher was provided to fetch but this is ignored as a proxy agent is being used.",
      );
    }
    const envHttpProxyAgent = new EnvHttpProxyAgent();
    return undiciFetch(input, { ...init, dispatcher: envHttpProxyAgent });
  };
  return fetch;
}
