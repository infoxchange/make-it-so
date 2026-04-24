// src/lib/proxy/fetch.ts
import { setGlobalDispatcher, getGlobalDispatcher, EnvHttpProxyAgent, fetch as undiciFetch } from "undici";
import { bootstrap } from "global-agent";
function setupProxyGlobally() {
  if (getGlobalDispatcher() instanceof EnvHttpProxyAgent)
    return;
  if (!process.env.HTTP_PROXY || !process.env.HTTPS_PROXY)
    return;
  const envHttpProxyAgent = new EnvHttpProxyAgent();
  setGlobalDispatcher(envHttpProxyAgent);
  if (!process.env.GLOBAL_AGENT_HTTP_PROXY) {
    process.env.GLOBAL_AGENT_HTTP_PROXY = process.env.HTTP_PROXY;
    process.env.GLOBAL_AGENT_HTTPS_PROXY = process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY;
  }
  bootstrap();
}
function getProxiedFetch() {
  const fetch = (input, init = {}) => {
    if (init.dispatcher) {
      console.warn("A custom dispatcher was provided to fetch but this is ignored as a proxy agent is being used.");
    }
    const envHttpProxyAgent = new EnvHttpProxyAgent();
    return undiciFetch(input, { ...init, dispatcher: envHttpProxyAgent });
  };
  return fetch;
}
export {
  getProxiedFetch,
  setupProxyGlobally
};
//# sourceMappingURL=index.js.map
