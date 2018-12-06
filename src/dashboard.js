import React, { Component } from 'react';
import {
  Col,
  Collapse,
  Navbar,
  Row
} from 'reactstrap';
import Studies from './studies.js';

const parseStudies = ({entry}) => entry.map(({resource}) => ({
      date: new Date(resource.started),
      modalities: resource.modalityList.map(m => m.code),
      accession: resource.accession.value,
      uri: resource.contained.find(c => c.id === resource.endpoint[0].reference.slice(1)).address
}));

class Dashboard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      demographicData: null,
      studyData: []
    };
  }

  fetchWithAuth = (uri, options) => {
    const { auth } = this.props;
    options.headers = options.headers || {};
    options.headers.Authorization = 'Bearer ' + auth.token;
    return fetch(uri, options);
  }

  fetchDemographics() {
    const { clinicalUri, auth } = this.props;
    this.fetchWithAuth(clinicalUri + '/Patient/' + auth.patientId, {
      method: 'GET'
    })
      .then(response => response.json())
      .then(demographicData => this.setState({demographicData}))
      .catch(console.log);
  }

  fetchStudies() {
    const { imagingUri, auth } = this.props;
    this.fetchWithAuth(imagingUri + '/ImagingStudy?patient=' + auth.patientId, {
      method: 'GET'
    })
      .then(response => response.json())
      .then(parseStudies)
      .then(studies => studies.concat(studies)) // !! doubles the data
      .then(studyData => this.setState({studyData}));
  }

  componentDidMount() {
    this.fetchDemographics();
    this.fetchStudies();
  }

  render() {
    const { demographicData, studyData } = this.state;
    return (
      <div>
        <Demographics data={demographicData} />
        <Studies data={studyData} fetchWithAuth={this.fetchWithAuth} />
      </div>
    );
  }
}

class Demographics extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showDemographics: true
    };
  }

  toggle = () => {
    this.setState({showDemographics: !this.state.showDemographics});
  }

  render() {
    const { data } = this.props;
    if (!data)
      return 'Loading?';
  
    const displayData = {};
    const firstName = data.name[0];
    displayData['Name'] = firstName.given.join(' ') + ' ' + firstName.family;
    displayData['Gender'] = data.gender;
    displayData['Birthday'] = new Date(data.birthDate).toDateString();
    displayData['Email'] = data.telecom[0].value;
    const address = data.address[0];
    const addressData = address.line.slice();
    addressData.push(address.city + ', ' + address.state + ' ' + address.postalCode);
    displayData['Address'] = <div>{addressData.map((el, i) => <div key={i}>{el}</div>)}</div>;
  
    const elements = ['Name', 'Gender', 'Birthday', 'Email', 'Address'].map(el =>
      <Row key={el}>
        <Col sm={4}>
          <b>{el}</b>
        </Col>
        <Col sm={8}>
          {displayData[el]}
        </Col>
      </Row>
    );
  
    return (
      <div>
        <Navbar color="light" onClick={this.toggle}>Patient Demographics</Navbar>
        <Collapse isOpen={this.state.showDemographics}>
          {elements}
        </Collapse>
      </div>
    );
  }
}

export default Dashboard;
