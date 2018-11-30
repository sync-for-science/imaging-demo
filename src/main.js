import React, { Component } from 'react';
import {
  Form,
  FormGroup,
  Label,
  Col,
  Input,
  Button,
  Progress,
  Container,
  Modal,
  ModalBody,
  ModalFooter
} from 'reactstrap';
import {
  getAuthUris,
  registerClient,
  getAuthCode,
  getAuthToken
} from './oauth.js';
import './App.css';

class Main extends Component {
  constructor(props) {
    super(props);
    this.state = {
      authToken: null,
      patientId: null
    };
  }

  setAuth(authToken, patientId) {
    this.setState({authToken, patientId});
  }

  render() {
    const { authToken, patientId } = this.state;
    let component;
    if (!authToken)
      component = <Authenticator setAuth={(token, patientId) => this.setAuth(token, patientId)} />;
    else
      component = <Dashboard token={authToken} patientId={patientId} />;
    return (
      <Container style={{marginTop: '100px'}}>
        {component}
      </Container>
    );
  }
}

class Dashboard extends Component {
  render() {
    return (
      <div>
        Your patient ID is <b>{this.props.patientId}</b>
        <br />
        Your token is <b>{this.props.token}</b>
      </div>
    );
  }
}

class Authenticator extends Component {
  constructor(props) {
    super(props);
    this.state = {
      clinicalUri: 'https://portal-stu3.demo.syncfor.science/api/fhir',
      imagingUri: 'https://imaging-broker.demo.syncfor.science/baseDstu3',
      client: null,
      progressState: 'initial',
      showProgress: false,
      authUris: null
    };
  }

  progressValue() {
    const { progressState } = this.state;
    const states = ['initial', 'authUris', 'client', 'redirected', 'authCode', 'authToken'];
    return 100 / (states.length-1) * states.indexOf(progressState);
  }

  progressText() {
    const { progressState } = this.state;
    const messages = {
      initial: 'Fetching conformance statement...',
      authUris: 'Registering client...',
      client: 'Redirecting to patient portal...',
      redirected: 'Waiting for authentication...',
      authCode: 'Obtaining authorization token...',
      authToken: 'Done!'
    };
    return messages[progressState];
  }

  async startAuth() {
    const { clinicalUri, imagingUri } = this.state;
    let { client } = this.state;
    this.setState({showProgress: true, progressState: 'initial'});

    const authUris = await getAuthUris(clinicalUri);
    this.setState({progressState: client ? 'client' : 'authUris', authUris});

    if (!client) {
      client = await registerClient(authUris.register);
      this.setState({client: client, progressState: 'client'});
    }
  }

  async continueAuth() {
    const { authUris, client } = this.state;

    this.setState({progressState: 'redirected'});
    const authCode = await getAuthCode(authUris.authorize, authUris.clinicalUri, client);
    this.setState({progressState: 'authCode'});

    const { access_token: token, patient: patientId } = await getAuthToken(authUris.token, client, authCode);
    this.setState({progressState: 'authToken'});

    setTimeout(() => this.props.setAuth(token, patientId), 1500);
  }

  render() {
    const { showProgress, progressState } = this.state;

    if (showProgress)
      return (
        <div>
          <Modal isOpen={progressState === 'client'}>
            <ModalBody>
              You will now be redirected to your patient portal to authenticate.
            </ModalBody>
            <ModalFooter>
              <Button color="primary" onClick={() => this.continueAuth()}>Continue</Button>
            </ModalFooter>
          </Modal>
          <div className="text-center">{this.progressText()}</div>
          <Progress
            animated
            value={this.progressValue()} />
        </div>
      );
    else
      return (
        <Form>
          <FormGroup row>
            <Label for="clinicalUri" sm={4} size="lg">Clinical FHIR Server</Label>
            <Col sm={8}>
              <Input
                type="text"
                name="clinicalUri"
                id="clinicalUri"
                bsSize="lg"
                value={this.state.clinicalUri}
                disabled />
            </Col>
          </FormGroup>
          <FormGroup row>
            <Label for="imagingUri" sm={4} size="lg">Imaging FHIR Server</Label>
            <Col sm={8}>
              <Input
                type="text"
                name="imagingUri"
                id="imagingUri"
                bsSize="lg"
                value={this.state.imagingUri}
                disabled />
            </Col>
          </FormGroup>
          <Button size="lg" color="primary" onClick={() => this.startAuth()}>Go</Button>
        </Form>
      );
  }
}


export default Main;
