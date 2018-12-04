import React, { Component } from 'react';
import {
  Col,
  Nav,
  NavItem,
  NavLink,
  Row,
  TabContent,
  TabPane
} from 'reactstrap';
import DicomImage from './dicom.js';
//import ReactJson from 'react-json-view';

const parseStudies = ({entry}) => entry.map(({resource}) => ({
      time: new Date(resource.started),
      modalities: resource.modalityList.map(m => m.code),
      accession: resource.accession.value,
      uri: resource.contained.find(c => c.id === resource.endpoint[0].reference.slice(1)).address
}));

class Dashboard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      demographicData: null,
      studyData: [],
      activeTab: 0
    };
  }

  fetchWithAuth(uri, options) {
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
      .then(studies => studies.concat(studies)) // !!
      .then(studyData => this.setState({studyData}));
  }

  componentDidMount() {
    this.fetchDemographics();
    this.fetchStudies();
  }

  render() {
    const { demographicData, studyData, activeTab } = this.state;
    return (
      <Row>
        <Col sm={6}>
          <Demographics data={demographicData} />
        </Col>
        <Col sm={6}>
          <Nav tabs>
            {studyData.map((datum, i) =>
              <NavItem key={i}>
                <NavLink
                  className={activeTab === i && 'active'}
                  onClick={() => this.setState({activeTab: i})}
                >
                  Study {i+1} [{datum.modalities.join(', ')}]
                </NavLink>
              </NavItem>
            )}
          </Nav>
          <TabContent activeTab={activeTab}>
            {studyData.map((datum, i) =>
              <TabPane tabId={i} key={i}>
                <DicomImage
                  uri={datum.uri}
                  fetchWithAuth={(...args) => this.fetchWithAuth(...args)}
                  active={activeTab === i} />
              </TabPane>
            )}
          </TabContent>
        </Col>
      </Row>
    );
  }
}

const Demographics = props => {
  if (!props.data)
    return '...';

  const displayData = {};
  const firstName = props.data.name[0];
  displayData['Name'] = firstName.given.join(' ') + ' ' + firstName.family;
  displayData['Gender'] = props.data.gender;
  displayData['Birthday'] = new Date(props.data.birthDate).toDateString();
  displayData['Email'] = props.data.telecom[0].value;
  const address = props.data.address[0];
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

  return elements;
}

export default Dashboard;
