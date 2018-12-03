import base64 from 'base-64';

const redirectUri = new URL('redirect', window.location).href;

const getAuthUris = async baseUri =>
  fetch(baseUri + '/metadata')
    .then(response => response.json())
    .then(findAuthUris);

const findAuthUris = metadataObj => {
  for (const restObj of metadataObj.rest)
    for (const extObj of restObj.security.extension)
      if (extObj.url === 'http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris')
        return extObj.extension.reduce((obj, uriPair) => {
          obj[uriPair.url] = uriPair.valueUri;
          return obj;
        }, {});
}

const registerClient = async registerUri =>
  fetch(registerUri, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      client_name: 'Imaging Demo Application',
      redirect_uris: [redirectUri],
      scope: 'launch/patient patient/*.read offline_access'
    })
  })
    .then(response => response.json())
    .then(({client_id, client_secret}) => ({id: client_id, secret: client_secret}));

const getAuthCode = (authorizeUri, clinicalUri, client) => {
  const state = Math.floor(Math.random() * 16**8).toString(16);
  const params = {
    response_type: 'code',
    client_id: client.id,
    redirect_uri: redirectUri,
    scope: 'launch/patient patient/*.read offline_access',
    state: state,
    aud: clinicalUri
  };
  const queryParams = new URLSearchParams();
  Object.entries(params)
    .forEach(([k, v]) => queryParams.set(k, v));
  const uri = authorizeUri + '?' + queryParams.toString();
  const newWindow = window.open(uri);

  const bc = new BroadcastChannel(state);
  return new Promise((resolve, reject) => {
    bc.onmessage = ev => {
      newWindow.close();
      resolve(ev.data);
    };
    bc.onmessageerror = reject;
  });
}

const getAuthToken = (tokenUri, client, code) => {
  const data = new FormData();
  data.set('grant_type', 'authorization_code');
  data.set('code', code);
  data.set('redirect_uri', redirectUri);

  return fetch(tokenUri, {
    method: 'POST',
    headers: {Authorization: 'Basic ' + base64.encode(client.id + ':' + client.secret)},
    body: data
  })
    .then(response => response.json())
    .then(({access_token, patient}) => ({token: access_token, patientId: patient}));
}

export {getAuthUris, registerClient, getAuthCode, getAuthToken};
