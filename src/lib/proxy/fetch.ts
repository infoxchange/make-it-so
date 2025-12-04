import {
  setGlobalDispatcher,
  EnvHttpProxyAgent,
  fetch as undiciFetch,
} from "undici";
import { bootstrap } from "global-agent";

export function setupProxyGlobally() {
  // To cover libraries that use fetch
  // See https://nodejs.org/api/globals.html#custom-dispatcher
  // This might stop being needed at some point: https://github.com/actions/create-github-app-token/pull/143#discussion_r1747641337
  const envHttpProxyAgent = new EnvHttpProxyAgent();
  setGlobalDispatcher(envHttpProxyAgent);

  // To cover libraries that use the http/https object
  if (!process.env.GLOBAL_AGENT_HTTP_PROXY) {
    process.env.GLOBAL_AGENT_HTTP_PROXY = process.env.HTTP_PROXY;
    process.env.GLOBAL_AGENT_HTTPS_PROXY =
      process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY;
  }
  bootstrap();
}

export function getProxiedFetch() {
  const fetch: typeof undiciFetch = (input, init = {}) => {
    console.log("Using proxied fetch for request to:", input);
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
