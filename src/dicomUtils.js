import * as cornerstone from "cornerstone-core";
import * as cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import * as cornerstoneTools from "cornerstone-tools";
import * as cornerstoneMath from "cornerstone-math";
import * as dicomParser from "dicom-parser";

import get from "lodash.get";

let cornerstoneInitDone = false; // only performed once
const initCornerstone = () => {
  if (cornerstoneInitDone) return;
  cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
  cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
  cornerstoneWADOImageLoader.webWorkerManager.initialize({
    webWorkerPath: "js/webWorker.js",
    taskConfiguration: {
      decodeTask: {
        codecsPath: "codecs.js" // relative to webWorkerPath???
      }
    }
  });
  cornerstoneTools.external.cornerstone = cornerstone;
  cornerstoneTools.external.cornerstoneMath = cornerstoneMath;
  cornerstoneInitDone = true;
};

// translate DICOM PN fields into something human-readable
const parseDicomName = input => {
  if (!input) return null;
  // up to 5 sections: last name, given name, middle name, prefix, suffix
  let [last, first, middle, prefix, suffix] = input.split("^");
  const outputParts = [prefix, first, middle, last, suffix].filter(x => x); // remove empty or null
  return outputParts.join(" ");
};

// crudely parse the boundary from the multipart response header
const parseBoundary = header => {
  const items = header.split(";");
  if (items) {
    for (let item of items) {
      item = item.trim();
      if (item.indexOf("boundary") >= 0) {
        let b = item.split("=")[1].trim();
        if (b.startsWith('"')) b = b.substring(1);
        if (b.endsWith('"')) b = b.substring(0, b.length - 1);
        return b;
      }
    }
  }
  return "";
};

// given the full multipart response buffer and the boundary string, return an array of objects containing the header and body for each part in the response
const parseMultipart = (buffer, boundary) => {
  const bodyArray = new Uint8Array(buffer);
  const boundaryArray = Array.from(`--${boundary}\r\n`, x => x.charCodeAt(0));
  const boundaryEndArray = Array.from(`--${boundary}--`, x => x.charCodeAt(0));

  let stops = [],
    i = 0;
  while (true) {
    i = findPart(bodyArray, boundaryArray, i);
    if (i === -1) break;
    stops.push(i);
    i += 1;
  }

  i = findPart(bodyArray, boundaryEndArray, stops[stops.length - 1] + 1);
  if (i !== -1) stops.push(i);

  let allParts = [],
    start = 0,
    end = 0;
  for (i = 0; i < stops.length - 1; i++) {
    start = stops[i] + boundaryArray.length;
    end = stops[i + 1] - 2; // don't include the 2 newline bytes

    const rawPart = bodyArray.slice(start, end);
    let headers = {},
      line = "";
    for (let j = 0; j < rawPart.length - 1; j++) {
      // 0x0d === '\r', 0x0a === '\n'
      if (rawPart[j] === 0x0d && rawPart[j + 1] === 0x0a) {
        if (line === "") { // empty line signifies end of headers and start of body (after 2 more newline bytes)
          allParts.push({ headers, body: rawPart.slice(j + 2).buffer });
          break;
        }
        const headerParts = line.split(":", 2);
        headers[headerParts[0]] = headerParts[1].trim();
        line = "";
        j += 1;
      } else {
        line += String.fromCharCode(rawPart[j]);
      }
    }
  }

  return allParts;
};

// find the next occurrence of a subarray *starting on a new line* within an array
const findPart = (arr, subarr, start = 0) => {
  for (let i = start; i < 1 + (arr.length - subarr.length); i++) {
    let j = 0;

    // 0x0d === '\r', 0x0a === '\n'
    // if not the first line in buffer or not preceeded by a newline, we don't look
    if (!(i === 0 || (arr[i - 2] === 0x0d && arr[i - 1] === 0x0a))) continue;

    for (; j < subarr.length; j++) if (arr[i + j] !== subarr[j]) break;
    if (j === subarr.length) return i;
  }
  return -1;
};

const doFetch = (uri, fetchWithAuth) =>
  fetchWithAuth(uri, {
    headers: { Accept: "multipart/related; type=application/dicom" }
  });

class DicomStudy {
  constructor(fhirResource) {
    this.studyId = fhirResource.uid;
    this.uri = fhirResource.contained.find(
      c => c.id === fhirResource.endpoint[0].reference.slice(1)
    ).address;
    this.modalities = fhirResource.modalityList.map(m => m.code);
    this.date = new Date(fhirResource.started);
    this.accession = get(fhirResource, "accession.value");
    this.referringPhysician = parseDicomName(
      // this should ideally use the reference instead of display value
      get(fhirResource, "referrer.display")
    );
    this.series = [];
    this._nSeries = fhirResource.numberOfSeries;
  }

  get nSeries() {
    if (this.series.length === 0) return this._nSeries; // from FHIR payload
    return this.series.length;
  }

  get description() {
    if (this.series.length === 0) return null;
    return this.series[0].studyDescription;
  }

  async download(fetchWithAuth) {
    if (this.series.length !== 0) return;
    let response = await doFetch(this.uri, fetchWithAuth);
    while (response.status === 503) {
      await new Promise(r => setTimeout(r, 1000)); // sleep
      response = await doFetch(this.uri, fetchWithAuth);
    }

    const boundary = parseBoundary(response.headers.get("Content-Type"));
    const parts = await response
      .arrayBuffer()
      .then(buffer => parseMultipart(buffer, boundary));
    const series = {};
    for (const part of parts) {
      const blob = new Blob([part.body]);
      const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(blob);
      const instanceData = (await cornerstone.loadAndCacheImage(imageId)).data;
      const seriesId = instanceData.string("x0020000e");
      if (series[seriesId] === undefined)
        series[seriesId] = new DicomSeries(seriesId);
      series[seriesId].addInstance(imageId, instanceData);
    }
    this.series = Object.values(series);
  }
}

class DicomSeries {
  constructor(seriesId) {
    this.seriesId = seriesId;
    this._imageIds = [];
    this.description = null;
    this.modality = null;
    this.studyDescription = null;
    this.patientName = null;
  }

  addInstance(imageId, instanceData) {
    const nFrames = instanceData.intString("x00280008");
    if (nFrames === undefined) {
      const index = instanceData.intString("x00200013");
      this._imageIds.push({ imageId, index });
    } else {
      for (let i = 0; i < nFrames; i++) {
        this._imageIds.push({ imageId: `${imageId}?frame=${i}`, index: i });
      }
    }
    if (!this.description) this.description = instanceData.string("x0008103e");
    if (!this.modality) this.modality = instanceData.string("x00080060");
    if (!this.studyDescription)
      this.studyDescription = instanceData.string("x00081030");
    const dicomPatientName = instanceData.string("x00100010");
    if (!this.patientName && dicomPatientName)
      this.patientName = parseDicomName(dicomPatientName);
  }

  get imageIds() {
    return this._imageIds
      .sort((a, b) => a.index - b.index)
      .map(el => el.imageId);
  }
}

export { DicomStudy, DicomSeries, initCornerstone };
