import React, { Component } from 'react';
import {
  Container,
} from 'reactstrap';
import Authenticator from './authenticator.js';
import Dashboard from './dashboard.js';
import './App.css';

class Main extends Component {
  constructor(props) {
    super(props);
    this.state = {
      clinicalUri: 'https://portal-stu3.demo.syncfor.science/api/fhir',
      imagingUri: 'https://imaging-broker.demo.syncfor.science/baseDstu3',
      auth: null
    };
  }

  render() {
    const { clinicalUri, imagingUri, auth } = this.state;
    let component;
    if (!auth)
      component = <Authenticator
                    clinicalUri={clinicalUri}
                    imagingUri={imagingUri}
                    setAuth={auth => this.setState({auth})} />;
    else
      component = <Dashboard
                    clinicalUri={clinicalUri}
                    imagingUri={imagingUri}
                    auth={auth} />;
    return (
      <Container style={{marginTop: '100px'}}>
        {component}
      </Container>
    );
  }
}


export default Main;
