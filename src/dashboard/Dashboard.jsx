import React, { Component } from "react";
import { Button, Col, Container, Row } from "reactstrap";

import Header from "./Header.jsx";
import DicomPanel from "../DicomPanel.jsx";
import { DicomStudy } from "../dicomUtils.js";
import Studies from "../studies/Studies.jsx";

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
    options.headers.Authorization = `Bearer ${auth.token}`;
    return fetch(uri, options);
  };

  fetchDemographics() {
    const { clinicalUri, auth } = this.props;
    this.fetchWithAuth(`${clinicalUri}/Patient/${auth.patientId}`, {
      method: "GET"
    })
      .then(response => response.json())
      .then(demographicData => this.setState({ demographicData }))
      .catch(console.log);
  }

  fetchStudies() {
    const { imagingUri, auth } = this.props;
    this.fetchWithAuth(`${imagingUri}/ImagingStudy?patient=${auth.patientId}`, {
      method: "GET"
    })
      .then(response => response.json())
      .then(parseStudies)
      .then(studies => this.setState({ studies }));
  }

  componentDidMount() {
    window.scrollTo(0, 0);
    this.fetchDemographics();
    this.fetchStudies();
  }

  render() {
    const { demographicData, studies, activeSeries } = this.state;
    const { revokeAuth } = this.props;
    return (
      <Container fluid>
        <div className="d-flex flex-wrap">
          <Header demographics={demographicData} />
          <div className="ml-auto align-self-center">
            <Button size="sm" outline color="primary" onClick={revokeAuth}>
              Revoke authorization
            </Button>
          </div>
        </div>
        <Row>
          <Col xl={3} lg={4}>
            <Studies
              studies={studies}
              fetchWithAuth={this.fetchWithAuth}
              setActiveSeries={activeSeries => this.setState({ activeSeries })}
            />
          </Col>
          <Col xl={9} lg={8}>
            <DicomPanel series={activeSeries} />
          </Col>
        </Row>
      </Container>
    );
  }
}

export default Dashboard;
