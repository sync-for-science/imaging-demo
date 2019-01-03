import React, { Component, Fragment } from "react";
import { Col, Row } from "reactstrap";
import classNames from "classnames";

import * as cornerstone from "cornerstone-core";
import * as cornerstoneTools from "cornerstone-tools";

import { initCornerstone } from "./dicomUtils.js";
import { PopoverTip5 } from "./PopoverTips.jsx";
import { stackScroller, stackToggler } from "./tools.js";

class DicomPanel extends Component {
  constructor(props) {
    super(props);
    this.element = React.createRef();
    this.state = {
      running: true
    };
  }

  componentDidMount() {
    initCornerstone();
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
    stackToggler(() => this.toggleRunningState(!this.state.running)).activate(
      element
    );
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
      this.setState({ running: true });
    }
  }

  scroll = forward => {
    const element = this.element.current;
    cornerstoneTools.scroll(element, forward ? 1 : -1, true);
  };

  toggleRunningState = start => {
    const { running } = this.state;
    const element = this.element.current;
    if (running && !start) cornerstoneTools.stopClip(element);
    else if (!running && start) cornerstoneTools.playClip(element, 5);
    this.setState({ running: start });
  };

  render() {
    const { running } = this.state;
    const { series } = this.props;
    return (
      <Fragment>
        {series && (
          <ControlPanel
            running={running}
            toggleState={this.toggleRunningState}
            series={series}
            scroll={this.scroll}
          />
        )}
        <div ref={this.element} style={{ height: "750px" }} />
      </Fragment>
    );
  }
}

const ControlPanel = props => {
  const { series, running, toggleState, scroll } = props;
  const descriptions = [];
  if (series.studyDescription) descriptions.push(series.studyDescription);
  if (series.description) descriptions.push(series.description);
  if (descriptions.length === 0) descriptions.push("DICOM image");

  const multiImage = series.imageIds.length > 1;

  return (
    <Row>
      {series && (
        <Col sm={6}>
          {descriptions.join(" - ")}
          {series.patientName && ` for ${series.patientName}`}
          <PopoverTip5 />
        </Col>
      )}
      <Col sm={6} className="align-self-center text-center">
        <span
          className={classNames("oi", "oi-chevron-left", "control-scroll", {
            "control-enabled": multiImage,
            "control-disabled": !multiImage
          })}
          onClick={() => scroll(false)}
        />
        <span
          className={classNames("oi", "oi-media-play", {
            "control-disabled": running || !multiImage,
            "control-enabled": !running && multiImage
          })}
          onClick={() => toggleState(true)}
        />
        <span
          className={classNames("oi", "oi-media-pause", {
            "control-disabled": !running || !multiImage,
            "control-enabled": running && multiImage
          })}
          onClick={() => toggleState(false)}
        />
        <span
          className={classNames("oi", "oi-chevron-right", "control-scroll", {
            "control-enabled": multiImage,
            "control-disabled": !multiImage
          })}
          onClick={() => scroll(true)}
        />
      </Col>
    </Row>
  );
};

export default DicomPanel;
