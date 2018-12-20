import React, { Component, Fragment } from "react";
import {
  Popover,
  PopoverBody,
  PopoverHeader
} from "reactstrap";

class PopoverTip extends Component {
  constructor(props) {
    super(props);
    this.state = {
      open: false
    };
    this.target = React.createRef();
  }

  toggle = e => {
    if (e)
      e.preventDefault();
    this.setState(s => ({ open: !s.open }));
  }

  render() {
    const { open } = this.state;
    const { title, children } = this.props;
    return (
      <Fragment>
        <span className="oi oi-bolt popover-trigger" ref={this.target} onClick={this.toggle} />
        <Popover placement="right" target={this.target} toggle={this.toggle} isOpen={open}>
          <PopoverHeader>Developer Tip</PopoverHeader>
          <PopoverBody>
            <h6 style={{textAlign: "center"}}>{title}</h6>
            <hr />
            {children}
          </PopoverBody>
        </Popover>
      </Fragment>
    );
  }
}

const PopoverTip1 = () => (
  <PopoverTip title="Discovering OAuth Endpoints">
    <p>The Imaging Demo App begins with a user-supplied pair of API endpoints: one for clinical data and one for imaging. In a real-life application, the user would typically see a "Choose My Provider" search box, rather than pasting in API endpoint URLs directly. This functionality would be powered by a directory of portal endpoints, covering both clinical and imaging data. </p>
    <p>Given a clinical data endpoint URL, the app connects using the SMART API, beginning by issuing a <code>GET /metadata</code> to obtain OAuth URLs, and then initiating a <a href="http://hl7.org/fhir/smart-app-launch/#standalone-launch-sequence" target="_blank">SMART Standalone Launch</a>. (In fact, this demo app also performs a dynamic registration step if it's talking to a server for the first time; most real-world S4S apps will be pre-configured to talk to data back-ends, so dynamic registration is not required.)</p>
  </PopoverTip>
);

const PopoverTip2 = () => (
  <PopoverTip title="Fetch Clinical Data from Clinical Data Server">
    <p>Once the Standalone Launch is complete, the Imaging Demo App fetches some clinical data via the <code>Patient</code> resource. This app keeps it simple by issuing a <code>GET /$clinical-data-server/Patient/:id</code>, using the patient ID supplied by the SMART Standalone Launch, and using the resulting patient demographics to display a small patient identification banner.</p>
  </PopoverTip>
);

const PopoverTip3 = () => (
  <PopoverTip title="Fetch List of Imaging Studies from Imaging Data Server">
    <p>Next, the Imaging Demo App fetches a list of <code>ImagingStudy</code> resources via <code>GET /$imaging-data-server/ImagingStudy?patient=:id</code>. The resulting study metadata are used to draw a table of imaging studies, but no actual DICOM data have been fetched yet.</p>
  </PopoverTip>
);

const PopoverTip4 = () => (
  <PopoverTip title="Fetch DICOM Data for an Individual Study">
    <p>When a user clicks the <code>Download</code> button next to a specific study, the Imaging Demo App follows a link from the ImagingStudy resource to retrieve the full DICOM study. Specifically, the app resolves the FHIR <code>ImagingStudy.endpoint</code>, and then the <code>Endpoint.address</code> to obtain the WADO-RS URL of the study.</p>
  </PopoverTip>
);

const PopoverTip5 = () => (
  <PopoverTip title="Render a Study for the User to Review">
    <p>When a user clicks the <code>Review</code> button next to a specific study, the Imaging Demo App uses the <a href="https://cornerstonejs.org/" target="_blank">Cornerstone library</a> to render the study to the screen and provide tools to interact with the data.</p>
  </PopoverTip>
);

export {
  PopoverTip1,
  PopoverTip2,
  PopoverTip3,
  PopoverTip4,
  PopoverTip5
};
