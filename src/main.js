import axios from 'axios';
import base64 from 'base-64';

import loadDicom from './dicom.js';

const clinicalUri = 'https://portal-stu3.demo.syncfor.science/api/fhir';
const imagingUri = 'https://imaging-broker.demo.syncfor.science/baseDstu3';
const redirectUri = new URL('redirect.html', window.location).href;


async function getAuthUris(baseUri) {
  return fetch(baseUri + '/metadata')
    .then(response => response.json())
    .then(j => findOAuthUris(j));
}

function findOAuthUris(metadataObj) {
  for (const restObj of metadataObj.rest) 
    for (const extObj of restObj.security.extension) 
      if (extObj.url === 'http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris')
        return extObj.extension.reduce((obj, uriPair) => {
          obj[uriPair.url] = uriPair.valueUri;
          return obj;
        }, {});
}

async function registerClient(registerUri) {
  const args = {
    client_name: 'Imaging Demo Application',
    redirect_uris: [redirectUri],
    scope: 'launch/patient patient/*.read offline_access'
  };
  
  return fetch(registerUri, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(args)
  })
    .then(response => response.json());
}

async function getToken(tokenUri, clientId, clientSecret, code) {
  const data = new FormData();
  data.set('grant_type', 'authorization_code');
  data.set('code', code);
  data.set('redirect_uri', redirectUri);

  return fetch(tokenUri, {
    method: 'POST',
    headers: {Authorization: 'Basic ' + base64.encode(clientId + ':' + clientSecret)},
    body: data
  })
    .then(response => response.json());
}

async function getDicomUri(patientId, token) {
  return fetch(imagingUri + '/ImagingStudy?patient=' + patientId, {
    method: 'GET',
    headers: {Authorization: 'Bearer ' + token}
  })
    .then(r => r.json())
    .then(data => data.entry[0].resource.contained[0].address);
}

function launchOAuth(authorizeUri, clientId, state) {
  const params = {
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'launch/patient patient/*.read offline_access',
    state: state,
    aud: clinicalUri
  };
  const queryParams = new URLSearchParams();
  Object.entries(params)
    .forEach(([k, v]) => queryParams.set(k, v));
  const url = new URL(authorizeUri);
  url.search = '?' + queryParams.toString();
  return window.open(url.href);
}

function makeState(length = 8) {
  return Math.floor(Math.random() * 16**length).toString(16);
}

function receiveCode(state) {
  return new Promise((resolve, reject) => {
    const bc = new BroadcastChannel(state);
    bc.onmessage = ev => resolve(ev.data);
    bc.onmessageerror = ev => reject(ev);
  });
}

const run = async () => {
  const state = makeState();
  const authUris = await getAuthUris(clinicalUri);
  const { client_id: clientId, client_secret: clientSecret } = await registerClient(authUris.register);
  const newWindow = launchOAuth(authUris.authorize, clientId, state);

  const code = await receiveCode(state);
  newWindow.close();

  const { access_token: token, patient: patientId } = await getToken(authUris.token, clientId, clientSecret, code);
  const dicomUri = await getDicomUri(patientId, token);
  loadDicom(dicomUri, token);
}

run()
