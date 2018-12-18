import base64 from "base-64";
import moment from "moment";

const redirectUri = new URL("redirect", window.location).href;

const getAuthUris = async baseUri =>
  fetch(baseUri + "/metadata")
    .then(response => response.json())
    .then(findAuthUris);

const findAuthUris = metadataObj => {
  for (const restObj of metadataObj.rest)
    for (const extObj of restObj.security.extension)
      if (
        extObj.url ===
        "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris"
      )
        return extObj.extension.reduce((obj, uriPair) => {
          obj[uriPair.url] = uriPair.valueUri;
          return obj;
        }, {});
};

const registerClient = async registerUri =>
  fetch(registerUri, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: "Imaging Demo Application",
      redirect_uris: [redirectUri],
      scope: "launch/patient patient/*.read offline_access"
    })
  })
    .then(response => response.json())
    .then(({ client_id, client_secret }) => ({
      id: client_id,
      secret: client_secret
    }));

const getAuthCode = (authorizeUri, clinicalUri, client) => {
  const state = Math.floor(Math.random() * 16 ** 8).toString(16);
  const params = {
    response_type: "code",
    client_id: client.id,
    redirect_uri: redirectUri,
    scope: "launch/patient patient/*.read offline_access",
    state: state,
    aud: clinicalUri
  };
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => queryParams.set(k, v));
  const uri = authorizeUri + "?" + queryParams.toString();
  const newWindow = window.open(uri);

  const bc = new BroadcastChannel(state);
  return new Promise((resolve, reject) => {
    bc.onmessage = ev => {
      newWindow.close();
      resolve(ev.data);
    };
    bc.onmessageerror = reject;
  });
};

const authTokenRequest = async (tokenUri, client, data) => {
  const response = await fetch(tokenUri, {
    method: "POST",
    headers: {
      Authorization: "Basic " + base64.encode(client.id + ":" + client.secret)
    },
    body: data
  });
  const json = await response.json();

  return {
    token: json.access_token,
    patientId: json.patient,
    refreshToken: json.refresh_token,
    refreshUri: tokenUri,
    client: client,
    expires: moment()
      .add(json.expires_in, "s")
      .valueOf()
  };
};

const getAuthToken = async (tokenUri, client, code) => {
  const data = new FormData();
  data.set("grant_type", "authorization_code");
  data.set("code", code);
  data.set("redirect_uri", redirectUri);
  return await authTokenRequest(tokenUri, client, data);
};

const refreshAuthToken = async (tokenUri, client, token) => {
  const data = new FormData();
  data.set("grant_type", "refresh_token");
  data.set("refresh_token", token);
  data.set("redirect_uri", redirectUri);
  return await authTokenRequest(tokenUri, client, data);
};

export {
  getAuthUris,
  registerClient,
  getAuthCode,
  getAuthToken,
  refreshAuthToken,
  redirectUri
};
