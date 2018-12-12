import React, { Component } from "react";
import { Col, Row } from "reactstrap";
import Studies from "./studies.js";
import { DicomStudy, DicomPanel } from "./dicom.js";
import get from "lodash.get";
import moment from "moment";

const parseStudies = ({ entry }) =>
  entry.map(({ resource }) => new DicomStudy(resource));

class Dashboard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      demographicData: null,
      studies: [],
      activeSeries: null
    };
  }

  fetchWithAuth = (uri, options) => {
    const { auth } = this.props;
    options.headers = options.headers || {};
    options.headers.Authorization = "Bearer " + auth.token;
    return fetch(uri, options);
  };

  fetchDemographics() {
    const { clinicalUri, auth } = this.props;
    this.fetchWithAuth(clinicalUri + "/Patient/" + auth.patientId, {
      method: "GET"
    })
      .then(response => response.json())
      .then(demographicData => this.setState({ demographicData }))
      .catch(console.log);
  }

  fetchStudies() {
    const { imagingUri, auth } = this.props;
    this.fetchWithAuth(imagingUri + "/ImagingStudy?patient=" + auth.patientId, {
      method: "GET"
    })
      .then(response => response.json())
      .then(parseStudies)
      .then(studies => this.setState({ studies }));
  }

  componentDidMount() {
    this.fetchDemographics();
    this.fetchStudies();
  }

  render() {
    const { demographicData, studies, activeSeries } = this.state;
    return (
      <div>
        <Header demographics={demographicData} />
        <Row>
          <Col sm={3}>
            <Studies
              studies={studies}
              fetchWithAuth={this.fetchWithAuth}
              setActiveSeries={activeSeries => this.setState({ activeSeries })}
            />
          </Col>
          <Col sm={9}>
            <DicomPanel series={activeSeries} />
          </Col>
        </Row>
      </div>
    );
  }
}

const Header = ({ demographics }) => {
  let name, birthday, city;

  if (demographics) {
    const fhirName = get(demographics, "name.0");
    if (fhirName !== undefined)
      name = fhirName.given.join(" ") + " " + fhirName.family;

    if (demographics.birthDate)
      birthday = moment(demographics.birthDate).format("MM-DD-YYYY");

    const fhirAddress = get(demographics, "address.0");
    if (fhirAddress !== undefined) {
      city = fhirAddress.city + ", " + fhirAddress.state;
    }
  }

  return (
    <div>
      <h1>S4S Imaging Demo Application</h1>
      <h5>
        {name && name + " | "}
        {birthday && "DOB: " + birthday + " | "}
        {city}
      </h5>
    </div>
  );
};

export default Dashboard;
