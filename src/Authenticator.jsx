import React, { Component } from "react";
import {
  Alert,
  Button,
  Col,
  Collapse,
  Container,
  Fade,
  Form,
  FormGroup,
  FormText,
  Input,
  Jumbotron,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  Progress,
  Row
} from "reactstrap";

import {
  getAuthCode,
  getAuthToken,
  getAuthUris,
  redirectUri,
  registerClient
} from "./oauthUtils.js";
import { PopoverTip1 } from "./PopoverTips.jsx";
import ValidatedFHIRInput from "./ValidatedFHIRInput.jsx";

const defaults = {
  clinicalUri: "https://portal-stu3.demo.syncfor.science/api/fhir",
  imagingUri: "https://imaging-broker.demo.syncfor.science/baseDstu3"
};

class Authenticator extends Component {
  constructor(props) {
    super(props);
    let savedClientData = {};
    try {
      savedClientData =
        JSON.parse(localStorage.getItem("savedClientData")) || {};
    } catch {}
    this.state = {
      client: { id: "", secret: "" },
      progressState: "initial",
      showProgress: false,
      authUris: null,
      showClientRegistration: false,
      clinicalUri: "",
      imagingUri: "",
      hasClientData: false,
      error: null,
      popoverOpen: [false, false, false, false],
      savedClientData
    };
  }

  componentWillUnmount = () => {
    const { savedClientData } = this.state;
    localStorage.setItem("savedClientData", JSON.stringify(savedClientData));
  };

  progressValue() {
    const { progressState } = this.state;
    const states = [
      "initial",
      "authUris",
      "client",
      "redirected",
      "authCode",
      "authToken"
    ];
    return (100 / (states.length - 1)) * states.indexOf(progressState);
  }

  progressText() {
    const { progressState } = this.state;
    const messages = {
      initial: "Fetching conformance statement...",
      authUris: "Registering client...",
      client: "Redirecting to patient portal...",
      redirected: "Waiting for authentication...",
      authCode: "Obtaining authorization token...",
      authToken: "Done!"
    };
    return messages[progressState];
  }

  startAuth = async () => {
    const {
      clinicalUri,
      imagingUri,
      showClientRegistration,
      savedClientData
    } = this.state;
    let { client } = this.state;
    if (!clinicalUri) {
      this.setState({ error: "Please enter a clinical FHIR server base URI" });
      return;
    }
    if (!imagingUri) {
      this.setState({ error: "Please enter a imaging FHIR server base URI" });
      return;
    }
    this.setState({ showProgress: true, progressState: "initial" });

    let authUris;
    try {
      authUris = await getAuthUris(clinicalUri);
    } catch {
      this.setState({
        error:
          "Could not read the metadata statement from the clinical FHIR server",
        showProgress: false
      });
      return;
    }
    this.setState({ progressState: "authUris", authUris });

    if (showClientRegistration) {
      if (!client.id) {
        this.setState({
          error: "Please enter a client ID",
          showProgress: false
        });
        return;
      }
      this.setState({ progressState: "client" });
      // empty client secret is okay?
    } else {
      try {
        client = await registerClient(authUris.register);
      } catch {
        this.setState({
          error: "Could not register client",
          showProgress: false
        });
        return;
      }
      this.setState({ client: client, progressState: "client" });
    }
    savedClientData[clinicalUri] = client;
  };

  continueAuth = async () => {
    const { authUris, client, clinicalUri, imagingUri } = this.state;

    this.setState({ progressState: "redirected" });
    let authCode;
    try {
      authCode = await getAuthCode(
        authUris.authorize,
        authUris.clinicalUri,
        client
      );
    } catch {
      this.setState({
        error: "Could not obtain authorization code from patient portal",
        showProgress: false
      });
      return;
    }
    this.setState({ progressState: "authCode" });

    let auth;
    try {
      auth = await getAuthToken(authUris.token, client, authCode);
    } catch {
      this.setState({
        error: "Could not obtain authorization token from patient portal",
        showProgress: false
      });
    }
    this.setState({ progressState: "authToken" });

    setTimeout(() => this.props.setAuth(clinicalUri, imagingUri, auth), 1500);
  };

  prefill = () => {
    this.setState({
      imagingUri: defaults.imagingUri,
      showClientRegistration: false
    });
    this.updateClinicalUri(defaults.clinicalUri); // trigger saved client data button
  };

  updateClinicalUri = uri => {
    const { savedClientData } = this.state;
    const hasClientData = uri in savedClientData;
    this.setState({ clinicalUri: uri, hasClientData });
  };

  togglePopover = (i, e) => {
    if (e) e.preventDefault();
    const { popoverOpen } = this.state;
    popoverOpen[i] = !popoverOpen[i];
    this.setState({ popoverOpen });
  };

  fillSavedClientData = () => {
    const { savedClientData, clinicalUri } = this.state;
    const { id, secret } = savedClientData[clinicalUri]; // new `client` object so react picks up on changes
    this.setState({ client: { id, secret }, showClientRegistration: true });
  };

  render() {
    const {
      showProgress,
      progressState,
      showClientRegistration,
      clinicalUri,
      imagingUri,
      client,
      error,
      hasClientData
    } = this.state;

    return (
      <Container style={{ marginTop: "50px" }}>
        <Modal isOpen={progressState === "client"}>
          <ModalBody>
            You will now be redirected to your patient portal to authenticate.
          </ModalBody>
          <ModalFooter>
            <Button color="primary" onClick={this.continueAuth}>
              Continue
            </Button>
          </ModalFooter>
        </Modal>
        <Modal isOpen={showProgress} centered>
          <ModalBody>
            <div className="text-center">{this.progressText()}</div>
            <Progress animated value={this.progressValue()} />
          </ModalBody>
        </Modal>
        <Jumbotron>
          <h1>Welcome!</h1>
          <p>This is the Sync for Science Imaging Demo Application.</p>
          <hr />
          <p>
            To get started, click the button below to use the Sync for Science
            reference implementations of the clinical and imaging FHIR servers,
            or input your own FHIR server URIs and associated client ID and
            secret.
          </p>
          <Button size="lg" onClick={this.prefill}>
            Use S4S servers
          </Button>
        </Jumbotron>
        <Alert
          color="danger"
          isOpen={error !== null}
          toggle={() => this.setState({ error: null })}
        >
          {error}
        </Alert>
        <Form>
          <FormGroup>
            <Label for="clinicalUri" size="lg">
              Clinical FHIR Server <PopoverTip1 />
            </Label>
            <ValidatedFHIRInput
              name="clinicalUri"
              id="clinicalUri"
              value={clinicalUri}
              onChange={this.updateClinicalUri}
              bsSize="lg"
            />
            <FormText>Enter the base URI for the clinical FHIR server</FormText>
          </FormGroup>
          <FormGroup>
            <Label for="imagingUri" size="lg">
              Imaging FHIR Server
            </Label>
            <ValidatedFHIRInput
              name="imagingUri"
              id="imagingUri"
              value={imagingUri}
              onChange={uri => this.setState({ imagingUri: uri })}
              bsSize="lg"
            />
            <FormText>Enter the base URI for the imaging FHIR server</FormText>
          </FormGroup>
          <Row>
            <Col>
              <FormGroup check>
                <Input
                  type="checkbox"
                  name="registerClient"
                  id="registerClient"
                  checked={!showClientRegistration}
                  onChange={() =>
                    this.setState({
                      showClientRegistration: !showClientRegistration
                    })
                  }
                />
                <Label for="registerClient" check>
                  Dynamically register new client
                </Label>
              </FormGroup>
            </Col>
            <Col>
              <Fade in={hasClientData}>
                <Button size="sm" onClick={this.fillSavedClientData}>
                  Use saved client data
                </Button>
              </Fade>
            </Col>
          </Row>
          <Collapse isOpen={showClientRegistration}>
            <Row form style={{ marginTop: "20px" }}>
              <Col sm={6}>
                <FormGroup>
                  <Label for="clientId">Client ID</Label>
                  <Input
                    type="text"
                    name="clientId"
                    id="clientId"
                    value={client.id}
                    onChange={e => {
                      const { client } = this.state;
                      client.id = e.target.value;
                      this.setState({ client });
                    }}
                  />
                </FormGroup>
                <FormText>
                  Enter a pre-existing client ID registered at the clinical FHIR
                  server for this app
                  <br />
                  The redirect URI for this app is <b>{redirectUri}</b>
                </FormText>
              </Col>
              <Col sm={6}>
                <FormGroup>
                  <Label for="clientSecret">Client secret</Label>
                  <Input
                    type="text"
                    name="clientSecret"
                    secret="clientSecret"
                    value={client.secret}
                    onChange={e => {
                      const { client } = this.state;
                      client.secret = e.target.value;
                      this.setState({ client });
                    }}
                  />
                </FormGroup>
                <FormText>Enter the corresponding client secret</FormText>
              </Col>
            </Row>
          </Collapse>
          <hr />
          <div style={{ textAlign: "center" }}>
            <Button size="lg" color="primary" onClick={this.startAuth}>
              Start Demo
            </Button>
          </div>
        </Form>
      </Container>
    );
  }
}

export default Authenticator;
