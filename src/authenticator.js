import React, { Component } from 'react';
import {
  Button,
  Form,
  FormGroup,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  Progress
} from 'reactstrap';

import {
  getAuthCode,
  getAuthToken,
  getAuthUris,
  registerClient
} from './oauth.js';

class Authenticator extends Component {
  constructor(props) {
    super(props);
    this.state = {
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
    const { clinicalUri, imagingUri } = this.props;
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

    const auth = await getAuthToken(authUris.token, client, authCode);
    this.setState({progressState: 'authToken'});

    setTimeout(() => this.props.setAuth(auth), 1500);
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
            <Input
              type="text"
              name="clinicalUri"
              id="clinicalUri"
              bsSize="lg"
              value={this.props.clinicalUri}
              disabled
              sm={8} />
          </FormGroup>
          <FormGroup row>
            <Label for="imagingUri" sm={4} size="lg">Imaging FHIR Server</Label>
            <Input
              type="text"
              name="imagingUri"
              id="imagingUri"
              bsSize="lg"
              value={this.props.imagingUri}
              disabled
              sm={8} />
          </FormGroup>
          <Button size="lg" color="primary" onClick={() => this.startAuth()}>Go</Button>
        </Form>
      );
  }
}

export default Authenticator;
