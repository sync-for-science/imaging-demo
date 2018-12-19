import React, { Component, Fragment } from "react";
import { Button, Col, Row } from 'reactstrap';
import * as cornerstone from "cornerstone-core";
import * as cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import * as cornerstoneTools from "cornerstone-tools";
import * as cornerstoneMath from "cornerstone-math";
import * as dicomParser from "dicom-parser";
import get from "lodash.get";

import { stackScroller, stackToggler } from "./tools.js";

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

const parseBoundary = header => {
  const items = header.split(";");
  if (items)
    for (let item of items) {
      item = item.trim();
      if (item.indexOf("boundary") >= 0) {
        let b = item.split("=")[1].trim();
        if (b.startsWith('"')) b = b.substring(1);
        if (b.endsWith('"')) b = b.substring(0, b.length - 1);
        return b;
      }
    }
  return "";
};

const parseMultipart = (buffer, boundary) => {
  const bodyArray = new Uint8Array(buffer);
  const boundaryBytes = Array.from(boundary, x => x.charCodeAt(0));
  const boundaryArray = [0x2d, 0x2d].concat(boundaryBytes, [0x0d, 0x0a]);
  const boundaryEndArray = [0x2d, 0x2d].concat(boundaryBytes, [0x2d, 0x2d]);

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
    end = stops[i + 1] - 2;

    const rawPart = bodyArray.slice(start, end);
    let headers = {},
      line = "";
    for (let j = 0; j < rawPart.length - 1; j++) {
      if (rawPart[j] === 0x0d && rawPart[j + 1] === 0x0a) {
        if (line === "") {
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

const findPart = (arr, subarr, start = 0) => {
  for (let i = start; i < 1 + (arr.length - subarr.length); i++) {
    let j = 0;
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
    this.referringPhysician = get(fhirResource, "referrer.display");
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
        this._imageIds.push({ imageId: imageId + "?frame=" + i, index: i });
      }
    }
    if (!this.description) this.description = instanceData.string("x0008103e");
    if (!this.modality) this.modality = instanceData.string("x00080060");
    if (!this.studyDescription)
      this.studyDescription = instanceData.string("x00081030");
    const dicomPatientName = instanceData.string("x00100010");
    if (!this.patientName && dicomPatientName) {
      const names = dicomPatientName.split("^");
      this.patientName = names.reverse().join(" ");
    }
  }

  get imageIds() {
    return this._imageIds
      .sort((a, b) => a.index - b.index)
      .map(el => el.imageId);
  }
}

class DicomPanel extends Component {
  constructor(props) {
    super(props);
    this.element = React.createRef();
    this.state = {
      running: true
    };
  }

  componentDidMount() {
    const element = this.element.current;
    cornerstone.enable(element);
    cornerstoneTools.keyboardInput.enable(element);
    cornerstoneTools.mouseInput.enable(element);
    cornerstoneTools.mouseWheelInput.enable(element);
    cornerstoneTools.wwwc.activate(element, 1);
    cornerstoneTools.pan.activate(element, 2);
    cornerstoneTools.zoom.activate(element, 4);
    cornerstoneTools.zoomWheel.activate(element);
    stackScroller.activate(element);
    stackToggler(() => this.toggleRunningState(!this.state.running)).activate(element);
    cornerstoneTools.addStackStateManager(element);
  }

  componentWillUnmount() {
    const element = this.element.current;
    cornerstone.disable(element);
  }

  componentDidUpdate(prevProps) {
    const { series } = this.props;
    if (series !== null && prevProps.series !== series) {
      const cornerstoneStack = {
        currentImageIdIndex: 0,
        imageIds: series.imageIds
      };
      const imageId = series.imageIds[0];
      const element = this.element.current;
      cornerstoneTools.stopClip(element);
      cornerstone.loadImage(imageId).then(image => {
        const viewport = cornerstone.getDefaultViewportForImage(element, image);
        cornerstone.displayImage(element, image, viewport);

        cornerstoneTools.clearToolState(element, "stack");
        cornerstoneTools.addToolState(element, "stack", cornerstoneStack);

        element.tabIndex = 0;
        element.focus();

        cornerstoneTools.playClip(element, 5);
      });
      this.setState({running: true});
    }
  }

  scroll = forward => {
    const element = this.element.current;
    cornerstoneTools.scroll(element, forward ? 1 : -1, true);
  }

  toggleRunningState = start => {
    const { running } = this.state;
    const element = this.element.current;
    if (running && !start)
      cornerstoneTools.stopClip(element);
    else if (!running && start)
      cornerstoneTools.playClip(element, 5);
    this.setState({ running: start });
  }

  render() {
    const { running } = this.state;
    const { series } = this.props;
    return (
      <Fragment>
        {series && <ControlPanel running={running} toggleState={this.toggleRunningState} series={series} scroll={this.scroll} />}
        <div ref={this.element} style={{ height: "750px" }} />
      </Fragment>
    );
  }
}

const ControlPanel = props => {
  const { series, running, toggleState, scroll } = props;
  
  return (
    <Row>
      <Col sm={6}>
        {series && (
          <div>
            <b>
              {series.studyDescription ? series.studyDescription + " - " : ""}
              {series.description}
            </b>{" "}
            for <b>{series.patientName}</b>
          </div>
        )}
      </Col>
      {series.imageIds.length > 1 && (
        <Col sm={6} className="align-self-center text-center">
          <span className="oi oi-chevron-left control-scroll" onClick={() => scroll(false)} />
          <span className={[running ? "control-disabled" : "control-enabled", "oi", "oi-media-play"].join(" ")} onClick={() => toggleState(true)} />
          <span className={[running ? "control-enabled" : "control-disabled", "oi", "oi-media-pause"].join(" ")} onClick={() => toggleState(false)} />
          <span className="oi oi-chevron-right control-scroll" onClick={() => scroll(true)} />
        </Col>
      )}
    </Row>
  );
}

export { DicomStudy, DicomSeries, DicomPanel };
