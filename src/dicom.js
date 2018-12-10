import React, { Component } from 'react';
import * as cornerstone from 'cornerstone-core';
import * as cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import * as cornerstoneTools from 'cornerstone-tools';
import * as cornerstoneMath from 'cornerstone-math';
import * as dicomParser from 'dicom-parser';

cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
cornerstoneWADOImageLoader.webWorkerManager.initialize({
  webWorkerPath: 'js/webWorker.js',
  taskConfiguration: {
    decodeTask: {
      codecsPath: 'codecs.js'  // relative to webWorkerPath???
    }
  }
});
cornerstoneTools.external.cornerstone = cornerstone;
cornerstoneTools.external.cornerstoneMath = cornerstoneMath;

const parseBoundary = header => {
  const items = header.split(';');
  if (items)
    for (let item of items) {
      item = item.trim();
      if (item.indexOf('boundary') >= 0) {
        let b = item.split('=')[1].trim();
        if (b.startsWith('"'))
          b = b.substring(1);
        if (b.endsWith('"'))
          b = b.substring(0, b.length - 1);
        return b;
      }
    }
  return '';
}

const parseMultipart = (buffer, boundary) => {
  const bodyArray = new Uint8Array(buffer);
  const boundaryBytes = Array.from(boundary, x => x.charCodeAt(0));
  const boundaryArray = [0x2d, 0x2d].concat(boundaryBytes, [0x0d, 0x0a]);
  const boundaryEndArray = [0x2d, 0x2d].concat(boundaryBytes, [0x2d, 0x2d]);

  let stops = [], i = 0;
  while (true) {
    i = findPart(bodyArray, boundaryArray, i);
    if (i === -1)
      break;
    stops.push(i);
    i += 1;
  }
  i = findPart(bodyArray, boundaryEndArray, stops[stops.length - 1] + 1);

  if (i !== -1)
    stops.push(i);

  let allParts = [], start = 0, end = 0;
  for (i = 0; i < stops.length - 1; i++) {
    start = stops[i] + boundaryArray.length;
    end = stops[i+1] - 2;

    const rawPart = bodyArray.slice(start, end);
    let headers = {}, line = '';
    for (let j = 0; j < rawPart.length - 1; j++) {
      if (rawPart[j] === 0x0d && rawPart[j+1] === 0x0a) {
        if (line === '') {
          allParts.push({headers, body: rawPart.slice(j+2).buffer});
          break;
        }
        const headerParts = line.split(':', 2);
        headers[headerParts[0]] = headerParts[1].trim();
        line = '';
        j += 1;
      } else {
        line += String.fromCharCode(rawPart[j]);
      }
    }
  }

  return allParts;
}

const findPart = (arr, subarr, start = 0) => {
  for (let i = start; i < 1 + (arr.length - subarr.length); i++) {
    let j = 0;
    if (!(i === 0 || (arr[i-2] === 0x0d && arr[i-1] === 0x0a)))
      continue;
    for (; j < subarr.length; j++)
      if (arr[i+j] !== subarr[j])
        break;
    if (j === subarr.length)
      return i;
  }
  return -1;
}

const doFetch = (uri, fetchWithAuth) => fetchWithAuth(uri, {
  headers: {Accept: 'multipart/related; type=application/dicom'}
});

const download = async (uri, fetchWithAuth) => {
  let response = await doFetch(uri, fetchWithAuth);
  while (response.status === 503) {
    await new Promise(r => setTimeout(r, 1500));  // sleep
    response = await doFetch(uri, fetchWithAuth);
  }

  const boundary = parseBoundary(response.headers.get('Content-Type'));
  const parts = await response.arrayBuffer()
    .then(buffer => parseMultipart(buffer, boundary));
  const stackBySeries = {};
  for (const part of parts) {
    const blob = new Blob([part.body]);
    const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(blob);
    const image = await cornerstone.loadAndCacheImage(imageId).then(newimage => {if (window.images === undefined) {window.images = [];} window.images.push(newimage);return newimage});
    const seriesId = image.data.string('x0020000e');
    const nFrames = image.data.intString('x00280008');
    const newImageIds = [];
    if (nFrames === undefined) {
      const index = parseInt(image.data.string('x00200013'));
      newImageIds.push({imageId, index});
    }
    else
      for (let i = 0; i < nFrames; i++)
        newImageIds.push({imageId: imageId + '?frame=' + i, index: i});
    if (stackBySeries[seriesId] === undefined)
      stackBySeries[seriesId] = [];
    stackBySeries[seriesId].push(...newImageIds);
  }
  const sortedStacks = [];
  for (const seriesId in stackBySeries)
    sortedStacks.push({seriesId, imageIds: stackBySeries[seriesId].sort((a, b) => a.index - b.index).map(el => el.imageId)});
  return sortedStacks;
}

class DicomPanel extends Component {
  constructor(props) {
    super(props);
    this.element = React.createRef();
  }

  componentDidMount() {
    const element = this.element.current;
    cornerstone.enable(element);
    cornerstoneTools.mouseInput.enable(element);
    cornerstoneTools.mouseWheelInput.enable(element);
    cornerstoneTools.wwwc.activate(element, 1);
    cornerstoneTools.pan.activate(element, 2);
    cornerstoneTools.zoom.activate(element, 4);
    cornerstoneTools.zoomWheel.activate(element);
    cornerstoneTools.addStackStateManager(element);
  }

  componentWillUnmount() {
    const element = this.element.current;
    cornerstone.disable(element);
  }

  componentDidUpdate(prevProps) {
    const { stack } = this.props;
    if (stack !== null && prevProps.stack !== stack) {
      const cornerstoneStack = {currentImageIdIndex: 0, imageIds: stack.imageIds};
      const imageId = stack.imageIds[0];
      const element = this.element.current;
      cornerstone.loadImage(imageId).then(image => {
        const viewport = cornerstone.getDefaultViewportForImage(element, image);
        cornerstone.displayImage(element, image, viewport);

        cornerstoneTools.clearToolState(element, 'stack');
        cornerstoneTools.addToolState(element, 'stack', cornerstoneStack);

        cornerstoneTools.playClip(element, 5);
      });
    }
  }

  render() {
    return (
      <div>
        {this.props.stack && <div>Series ID: {this.props.stack.seriesId}</div>}
        <div ref={this.element} style={{height: '500px'}} />
      </div>
    );
  }
}

export default DicomPanel;
export { download };
