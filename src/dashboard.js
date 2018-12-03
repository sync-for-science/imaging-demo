import React, { Component } from 'react';
import {
  Col,
  Row
} from 'reactstrap';
import ReactJson from 'react-json-view';

class Dashboard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      demographicData: null,
      studyData: null
    };
  }

  fetchDemographics() {
    const { clinicalUri, auth } = this.props;
    fetch(clinicalUri + '/Patient/' + auth.patientId, {
      method: 'GET',
      headers: {'Authorization': 'Bearer ' + auth.token}
    })
      .then(response => response.json())
      .then(response => this.setState({demographicData: response}))
      .catch(console.log);
  }

  fetchStudies() {
  }

  componentDidMount() {
    this.fetchDemographics();
    this.fetchStudies();
  }

  render() {
    return (
      <Row>
        <Col sm={6}>
          <Demographics data={this.state.demographicData} />
        </Col>
        <Col sm={6}>
          Panel 2
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
  displayData['Address'] = <div>{addressData.map(el => <div>{el}</div>)}</div>;

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
